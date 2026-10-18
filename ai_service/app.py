import os
import re
import time
import gc
import psutil
import numpy as np
from typing import List, Optional, Dict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import json
import base64
import onnxruntime as ort
import sentencepiece as spm
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics.pairwise import cosine_similarity

# Initialize FastAPI App
app = FastAPI(
    title="Multilingual AI Question Clustering Service",
    description="Embeddings and Semantic Clustering for English, Hindi, Marathi & Mixed Questions",
    version="1.2.0-onnx"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Folder created by export_model.py (contains the quantized .onnx + tokenizer files)
_HERE = os.path.dirname(os.path.abspath(__file__))
_CANDIDATES = [os.path.join(_HERE, "onnx_int8"), os.path.join(os.path.dirname(_HERE), "onnx_int8")]
DEFAULT_MODEL_DIR = next((d for d in _CANDIDATES if os.path.isdir(d)), _CANDIDATES[0])
MODEL_DIR = os.getenv("MODEL_DIR", DEFAULT_MODEL_DIR)
MODEL_NAME = os.getenv("MODEL_NAME", "paraphrase-multilingual-MiniLM-L12-v2 (ONNX int8)")
MAX_LENGTH = int(os.getenv("MAX_LENGTH", "64"))


BOS_ID, PAD_ID, EOS_ID = 0, 1, 2
SP_FILE = "sentencepiece.model"


def load_sentencepiece(model_dir: str) -> "spm.SentencePieceProcessor":
    """Load the lightweight SentencePiece tokenizer (~60MB RAM vs ~300MB for HF tokenizers).
    If sentencepiece.model is missing it is rebuilt once from tokenizer.json."""
    sp_path = os.path.join(model_dir, SP_FILE)
    if not os.path.isfile(sp_path):
        from sentencepiece import sentencepiece_model_pb2 as spb
        with open(os.path.join(model_dir, "tokenizer.json"), encoding="utf-8") as f:
            j = json.load(f)
        m = spb.ModelProto()
        for i, (piece, score) in enumerate(j["model"]["vocab"]):
            sp = m.pieces.add()
            sp.piece, sp.score = piece, float(score)
            if i in (0, 1, 2) or piece == "<mask>":
                sp.type = spb.ModelProto.SentencePiece.CONTROL
            elif i == 3:
                sp.type = spb.ModelProto.SentencePiece.UNKNOWN
            else:
                sp.type = spb.ModelProto.SentencePiece.NORMAL
        t = m.trainer_spec
        t.model_type = spb.TrainerSpec.UNIGRAM
        t.vocab_size = len(m.pieces)
        t.unk_id, t.bos_id, t.eos_id, t.pad_id = 3, 0, 2, 1
        t.unk_piece, t.bos_piece, t.eos_piece, t.pad_piece = "<unk>", "<s>", "</s>", "<pad>"
        n = m.normalizer_spec
        n.name = "nmt_nfkc"
        n.precompiled_charsmap = base64.b64decode(j["normalizer"]["precompiled_charsmap"])
        n.add_dummy_prefix = n.remove_extra_whitespaces = n.escape_whitespaces = True
        with open(sp_path, "wb") as f:
            f.write(m.SerializeToString())
        del j, m
        gc.collect()
    return spm.SentencePieceProcessor(model_file=sp_path)


class OnnxEmbedder:
    """Drop-in replacement for SentenceTransformer: tokenizer + onnxruntime + mean pooling."""

    device = "cpu"

    def __init__(self, model_dir: str):
        onnx_files = [f for f in os.listdir(model_dir) if f.endswith(".onnx")]
        if not onnx_files:
            raise FileNotFoundError(f"No .onnx file found in {model_dir}")
        # Prefer the quantized file if several exist
        onnx_files.sort(key=lambda f: ("quantized" not in f, f))
        model_path = os.path.join(model_dir, onnx_files[0])

        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 1
        opts.inter_op_num_threads = 1
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        self.session = ort.InferenceSession(model_path, opts, providers=["CPUExecutionProvider"])
        self.input_names = {i.name for i in self.session.get_inputs()}
        self.sp = load_sentencepiece(model_dir)

    def encode(self, texts: List[str], batch_size: int = 8) -> np.ndarray:
        all_embs = []
        for start in range(0, len(texts), batch_size):
            batch = texts[start:start + batch_size]
            seqs = [[BOS_ID] + self.sp.encode(t)[:MAX_LENGTH - 2] + [EOS_ID] for t in batch]
            L = max(len(x) for x in seqs)
            input_ids = np.full((len(seqs), L), PAD_ID, dtype=np.int64)
            attn = np.zeros((len(seqs), L), dtype=np.int64)
            for r, x in enumerate(seqs):
                input_ids[r, :len(x)] = x
                attn[r, :len(x)] = 1
            feed = {"input_ids": input_ids, "attention_mask": attn,
                    "token_type_ids": np.zeros_like(input_ids)}
            inputs = {k: v for k, v in feed.items() if k in self.input_names}
            token_embs = self.session.run(None, inputs)[0]          # (batch, seq, dim)
            mask = attn[..., None].astype(np.float32)
            summed = (token_embs * mask).sum(axis=1)
            counts = np.clip(mask.sum(axis=1), 1e-9, None)
            pooled = summed / counts                                 # mean pooling
            norms = np.linalg.norm(pooled, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            all_embs.append(pooled / norms)                          # unit length
        if not all_embs:
            return np.zeros((0, model_dimension), dtype=np.float32)
        return np.vstack(all_embs).astype(np.float32)


model: Optional[OnnxEmbedder] = None
model_load_time: float = 0.0
model_status: str = "unloaded"  # "ready" | "loading" | "error" | "unloaded"
model_error: Optional[str] = None
model_dimension: int = 384


def get_model() -> OnnxEmbedder:
    global model, model_load_time, model_status, model_error, model_dimension
    if model is not None:
        return model
    if model_error and model is None:
        raise HTTPException(
            status_code=503,
            detail=f"AI Model failed to load: {model_error}. Check that the onnx_int8 folder exists and memory limits."
        )

    model_status = "loading"
    t0 = time.time()
    try:
        print(f"Loading ONNX model from: {MODEL_DIR} ...")
        loaded = OnnxEmbedder(MODEL_DIR)
        # Warm-up run also tells us the real embedding dimension
        probe = loaded.encode(["warm up"])
        model_dimension = int(probe.shape[1])
        model_load_time = time.time() - t0
        model = loaded
        model_status = "ready"
        model_error = None
        gc.collect()
        print(f"Model loaded successfully in {model_load_time:.2f} seconds (dim={model_dimension}).")
        return model
    except Exception as e:
        model_status = "error"
        model_error = str(e)
        print(f"Error loading model from {MODEL_DIR}: {e}")
        gc.collect()
        raise HTTPException(
            status_code=503,
            detail=f"Model initialization failed: {e}."
        )


# Pydantic Schemas
class EmbedRequest(BaseModel):
    texts: List[str]

class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    dimensions: int
    count: int

class SimilarityRequest(BaseModel):
    text1: Optional[str] = None
    text2: Optional[str] = None
    embedding1: Optional[List[float]] = None
    embedding2: Optional[List[float]] = None

class SimilarityResponse(BaseModel):
    similarity: float
    threshold_met: bool
    threshold_used: float

class QuestionItem(BaseModel):
    id: str
    text: str
    language: Optional[str] = "auto"
    embedding: Optional[List[float]] = None

class ClusterRequest(BaseModel):
    questions: List[QuestionItem]
    similarity_threshold: float = 0.68

class ClusterOutput(BaseModel):
    cluster_id: str
    title: str
    summary: str
    representative_question: str
    question_ids: List[str]
    question_count: int
    language_distribution: Dict[str, int]
    centroid: List[float]

class ClusterResponse(BaseModel):
    clusters: List[ClusterOutput]
    total_questions: int
    total_clusters: int
    threshold_used: float


@app.on_event("startup")
def startup_event():
    # Warm up model safely on startup without crashing the API container
    try:
        get_model()
    except Exception as e:
        print(f"Warning during model startup load: {e}")

@app.get("/")
def root():
    return {
        "service": "Multilingual AI Question Clustering Service",
        "model": MODEL_NAME,
        "status": model_status,
        "is_ready": model is not None,
        "embedding_dimension": model_dimension
    }

@app.get("/health")
def health():
    rss_mb = 0.0
    try:
        proc = psutil.Process(os.getpid())
        rss_mb = round(proc.memory_info().rss / (1024 * 1024), 2)
    except Exception:
        pass

    return {
        "status": model_status,
        "is_ready": model is not None,
        "model": MODEL_NAME,
        "embedding_dimension": model_dimension,
        "memory_rss_mb": rss_mb,
        "load_time_sec": round(model_load_time, 2),
        "device": "cpu" if model else "unloaded",
        "error": model_error
    }

@app.post("/embed", response_model=EmbedResponse)
def generate_embeddings(payload: EmbedRequest):
    if not payload.texts:
        return EmbedResponse(embeddings=[], dimensions=model_dimension, count=0)

    m = get_model()
    embeddings = m.encode(payload.texts, batch_size=8)
    embeddings_list = embeddings.tolist()
    dim = len(embeddings_list[0]) if embeddings_list else model_dimension

    return EmbedResponse(
        embeddings=embeddings_list,
        dimensions=dim,
        count=len(embeddings_list)
    )

@app.post("/similarity", response_model=SimilarityResponse)
def compute_similarity(payload: SimilarityRequest, threshold: float = 0.68):
    if payload.embedding1 is not None and payload.embedding2 is not None:
        emb1 = np.array(payload.embedding1).reshape(1, -1)
        emb2 = np.array(payload.embedding2).reshape(1, -1)
    elif payload.text1 and payload.text2:
        m = get_model()
        embs = m.encode([payload.text1, payload.text2])
        emb1 = embs[0:1]
        emb2 = embs[1:2]
    else:
        raise HTTPException(status_code=400, detail="Must provide either text1 & text2 or embedding1 & embedding2")

    sim = float(cosine_similarity(emb1, emb2)[0][0])
    return SimilarityResponse(
        similarity=round(sim, 4),
        threshold_met=sim >= threshold,
        threshold_used=threshold
    )

def generate_topic_title(representative_text: str, all_texts: List[str]) -> str:
    """Generate a readable, concise topic title from representative question and text members."""
    clean = representative_text.strip()
    clean = re.sub(r'[\?।!.,]+$', '', clean).strip()

    prefixes = [
        r'^(give me a|tell me a|provide a|how to|how can i|how should i|what is|what are|explain|best way to)\s+',
        r'^(roadmap for|guide for|start learning|how do i start|basics of)\s+',
        r'^(mujhe|humko|kaise|kya|batao|kripya)\s+',
        r'^(mala|kase|kay|sangaa)\s+',
    ]

    simplified = clean
    for pat in prefixes:
        simplified = re.sub(pat, '', simplified, flags=re.IGNORECASE).strip()

    if simplified and len(simplified) > 2:
        title = simplified[0].upper() + simplified[1:]
    else:
        title = clean

    words = title.split()
    if len(words) > 8:
        title = " ".join(words[:8]) + "..."

    return title

@app.post("/cluster", response_model=ClusterResponse)
def cluster_questions(payload: ClusterRequest):
    questions = payload.questions
    if not questions:
        return ClusterResponse(clusters=[], total_questions=0, total_clusters=0, threshold_used=payload.similarity_threshold)

    texts = [q.text for q in questions]

    # Ensure all questions have embeddings matching model dimension
    raw_embeddings = []
    missing_indices = []
    for idx, q in enumerate(questions):
        if q.embedding and len(q.embedding) == model_dimension:
            raw_embeddings.append(q.embedding)
        else:
            raw_embeddings.append(None)
            missing_indices.append(idx)

    if missing_indices:
        m = get_model()
        missing_texts = [texts[i] for i in missing_indices]
        computed = m.encode(missing_texts, batch_size=4)
        for sub_idx, orig_idx in enumerate(missing_indices):
            raw_embeddings[orig_idx] = computed[sub_idx].tolist()

    embeddings = np.array(raw_embeddings, dtype=np.float32)
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    embeddings = embeddings / norms

    n_samples = len(questions)
    sim_threshold = max(0.40, min(0.95, payload.similarity_threshold))
    dist_threshold = 1.0 - sim_threshold

    if n_samples == 1:
        cluster_labels = [0]
    else:
        clustering = AgglomerativeClustering(
            metric='cosine',
            linkage='average',
            distance_threshold=dist_threshold,
            n_clusters=None
        )
        cluster_labels = clustering.fit_predict(embeddings)

    clusters_dict: Dict[int, List[int]] = {}
    for idx, label in enumerate(cluster_labels):
        clusters_dict.setdefault(int(label), []).append(idx)

    output_clusters: List[ClusterOutput] = []

    for cluster_idx, member_indices in clusters_dict.items():
        member_questions = [questions[i] for i in member_indices]
        member_embeddings = embeddings[member_indices]

        centroid = np.mean(member_embeddings, axis=0)
        c_norm = np.linalg.norm(centroid)
        if c_norm > 0:
            centroid = centroid / c_norm

        sims_to_centroid = cosine_similarity(member_embeddings, centroid.reshape(1, -1)).flatten()
        best_member_idx = int(np.argmax(sims_to_centroid))
        rep_question = member_questions[best_member_idx].text

        lang_dist: Dict[str, int] = {}
        for q in member_questions:
            lang = q.language or "auto"
            lang_dist[lang] = lang_dist.get(lang, 0) + 1

        title = generate_topic_title(rep_question, [q.text for q in member_questions])
        summary = f"Topic covering {len(member_questions)} inquiries primarily focusing on '{rep_question}'"

        output_clusters.append(ClusterOutput(
            cluster_id=f"cluster_{cluster_idx + 1}",
            title=title,
            summary=summary,
            representative_question=rep_question,
            question_ids=[q.id for q in member_questions],
            question_count=len(member_questions),
            language_distribution=lang_dist,
            centroid=centroid.tolist()
        ))

    output_clusters.sort(key=lambda c: c.question_count, reverse=True)

    return ClusterResponse(
        clusters=output_clusters,
        total_questions=n_samples,
        total_clusters=len(output_clusters),
        threshold_used=sim_threshold
    )

@app.get("/evaluate-benchmark")
def evaluate_benchmark():
    """Evaluate multilingual semantic similarity across English, Hindi, Marathi, and mixed languages."""
    m = get_model()

    dsa_group = [
        ("Give me a roadmap for DSA.", "en"),
        ("How should I start learning DSA?", "en"),
        ("DSA ka roadmap kaise banau?", "hinglish"),
        ("मुझे DSA कैसे सीखना चाहिए?", "hi"),
        ("मला DSA शिकायला सुरुवात कशी करावी?", "mr"),
    ]

    web_dev_group = [
        ("What are good project ideas for web development?", "en"),
        ("Web development ke liye best projects konse hain?", "hinglish"),
        ("वेब डेवलपमेंट के लिए कौन से प्रोजेक्ट्स अच्छे हैं?", "hi"),
        ("वेब डेव्हलपमेंटसाठी चांगले प्रोजेक्ट्स कोणते आहेत?", "mr")
    ]

    unrelated_group = [
        ("How to apply for campus hostel accommodation?", "en"),
        ("कॉलेज कैंटीन का खाना कैसा है?", "hi"),
        ("What is the weather in Mumbai tomorrow?", "en")
    ]

    all_items = [(text, lang, "DSA") for text, lang in dsa_group] + \
                [(text, lang, "WebDev") for text, lang in web_dev_group] + \
                [(text, lang, "Unrelated") for text, lang in unrelated_group]

    texts = [item[0] for item in all_items]
    embeddings = m.encode(texts)
    sim_matrix = cosine_similarity(embeddings)

    dsa_indices = list(range(len(dsa_group)))
    dsa_intra_sims = []
    for i in dsa_indices:
        for j in dsa_indices:
            if i < j:
                dsa_intra_sims.append({
                    "q1": dsa_group[i][0],
                    "lang1": dsa_group[i][1],
                    "q2": dsa_group[j][0],
                    "lang2": dsa_group[j][1],
                    "similarity": round(float(sim_matrix[i][j]), 4)
                })

    inter_sims = []
    web_indices = [len(dsa_group) + i for i in range(len(web_dev_group))]
    for i in dsa_indices:
        for j in web_indices:
            inter_sims.append(round(float(sim_matrix[i][j]), 4))

    unrelated_indices = [len(dsa_group) + len(web_dev_group) + i for i in range(len(unrelated_group))]
    unrelated_sims = []
    for i in dsa_indices:
        for j in unrelated_indices:
            unrelated_sims.append(round(float(sim_matrix[i][j]), 4))

    avg_dsa_intra = float(np.mean([item["similarity"] for item in dsa_intra_sims]))
    avg_inter_web = float(np.mean(inter_sims))
    avg_unrelated = float(np.mean(unrelated_sims))

    return {
        "status": "success",
        "model": MODEL_NAME,
        "embedding_dimension": model_dimension,
        "dsa_multilingual_pairs": dsa_intra_sims,
        "metrics": {
            "avg_dsa_multilingual_similarity": round(avg_dsa_intra, 4),
            "avg_dsa_vs_webdev_similarity": round(avg_inter_web, 4),
            "avg_dsa_vs_unrelated_similarity": round(avg_unrelated, 4),
            "separation_margin": round(avg_dsa_intra - avg_inter_web, 4),
            "recommended_threshold": 0.68
        }
    }
