import os
import re
import time
import numpy as np
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics.pairwise import cosine_similarity

# Initialize FastAPI App
app = FastAPI(
    title="Multilingual AI Question Clustering Service",
    description="Embeddings and Semantic Clustering for English, Hindi, Marathi & Mixed Questions",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
model: Optional[SentenceTransformer] = None
model_load_time: float = 0.0

def get_model() -> SentenceTransformer:
    global model, model_load_time
    if model is None:
        t0 = time.time()
        print(f"Loading SentenceTransformer model: {MODEL_NAME}...")
        model = SentenceTransformer(MODEL_NAME,device="cpu")
        model_load_time = time.time() - t0
        print(f"Model loaded successfully in {model_load_time:.2f} seconds.")
    return model

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
    # Warm up model on startup
    try:
        get_model()
    except Exception as e:
        print(f"Warning during model startup load: {e}")

@app.get("/")
def root():
    return {
        "service": "Multilingual AI Question Clustering Service",
        "model": MODEL_NAME,
        "status": "active"
    }

@app.get("/health")
def health():
    is_ready = model is not None
    return {
        "status": "ready" if is_ready else "loading",
        "model": MODEL_NAME,
        "load_time_sec": round(model_load_time, 2),
        "device": str(model.device) if model else "unloaded"
    }

@app.post("/embed", response_model=EmbedResponse)
def generate_embeddings(payload: EmbedRequest):
    if not payload.texts:
        return EmbedResponse(embeddings=[], dimensions=384, count=0)
    
    m = get_model()
    # Normalize embeddings to unit length so dot product = cosine similarity
    embeddings = m.encode(
        payload.texts,
        normalize_embeddings=True,
        show_progress_bar=False,
        batch_size=8
    )   
    embeddings_list = embeddings.tolist()
    
    return EmbedResponse(
        embeddings=embeddings_list,
        dimensions=len(embeddings_list[0]) if embeddings_list else 384,
        count=len(embeddings_list)
    )

@app.post("/similarity", response_model=SimilarityResponse)
def compute_similarity(payload: SimilarityRequest, threshold: float = 0.68):
    m = get_model()
    
    if payload.embedding1 is not None and payload.embedding2 is not None:
        emb1 = np.array(payload.embedding1).reshape(1, -1)
        emb2 = np.array(payload.embedding2).reshape(1, -1)
    elif payload.text1 and payload.text2:
        embs = m.encode([payload.text1, payload.text2], normalize_embeddings=True)
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
    # Clean text
    clean = representative_text.strip()
    clean = re.sub(r'[\?।!.,]+$', '', clean).strip()
    
    # Common question prefixes to strip in English / Hindi / Marathi / Hinglish
    prefixes = [
        r'^(give me a|tell me a|provide a|how to|how can i|how should i|what is|what are|explain|best way to)\s+',
        r'^(roadmap for|guide for|start learning|how do i start|basics of)\s+',
        r'^(mujhe|humko|kaise|kya|batao|kripya)\s+',
        r'^(mala|kase|kay|sangaa)\s+',
    ]
    
    simplified = clean
    for pat in prefixes:
        simplified = re.sub(pat, '', simplified, flags=re.IGNORECASE).strip()
    
    # Capitalize first letter
    if simplified and len(simplified) > 2:
        title = simplified[0].upper() + simplified[1:]
    else:
        title = clean
        
    # Cap length to reasonable title length
    words = title.split()
    if len(words) > 8:
        title = " ".join(words[:8]) + "..."
        
    return title

@app.post("/cluster", response_model=ClusterResponse)
def cluster_questions(payload: ClusterRequest):
    questions = payload.questions
    if not questions:
        return ClusterResponse(clusters=[], total_questions=0, total_clusters=0, threshold_used=payload.similarity_threshold)
    
    m = get_model()
    texts = [q.text for q in questions]
    
    # Ensure all questions have embeddings
    raw_embeddings = []
    missing_indices = []
    for idx, q in enumerate(questions):
        if q.embedding and len(q.embedding) == 384:
            raw_embeddings.append(q.embedding)
        else:
            raw_embeddings.append(None)
            missing_indices.append(idx)
            
    if missing_indices:
        missing_texts = [texts[i] for i in missing_indices]
        computed = m.encode(
            missing_texts,
            normalize_embeddings=True,
            batch_size=4
        )
        for sub_idx, orig_idx in enumerate(missing_indices):
            raw_embeddings[orig_idx] = computed[sub_idx].tolist()
            
    embeddings = np.array(raw_embeddings, dtype=np.float32)
    # Re-normalize just in case
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    embeddings = embeddings / norms
    
    n_samples = len(questions)
    sim_threshold = max(0.40, min(0.95, payload.similarity_threshold))
    dist_threshold = 1.0 - sim_threshold

    if n_samples == 1:
        cluster_labels = [0]
    else:
        # Agglomerative clustering with cosine distance
        clustering = AgglomerativeClustering(
            metric='cosine',
            linkage='average',
            distance_threshold=dist_threshold,
            n_clusters=None
        )
        cluster_labels = clustering.fit_predict(embeddings)

    # Group by cluster label
    clusters_dict: Dict[int, List[int]] = {}
    for idx, label in enumerate(cluster_labels):
        clusters_dict.setdefault(label, []).append(idx)

    output_clusters: List[ClusterOutput] = []

    for cluster_idx, member_indices in clusters_dict.items():
        member_questions = [questions[i] for i in member_indices]
        member_embeddings = embeddings[member_indices]
        
        # Calculate centroid embedding
        centroid = np.mean(member_embeddings, axis=0)
        c_norm = np.linalg.norm(centroid)
        if c_norm > 0:
            centroid = centroid / c_norm
            
        # Find representative question (closest to centroid)
        sims_to_centroid = cosine_similarity(member_embeddings, centroid.reshape(1, -1)).flatten()
        best_member_idx = int(np.argmax(sims_to_centroid))
        rep_question = member_questions[best_member_idx].text
        
        # Language distribution
        lang_dist: Dict[str, int] = {}
        for q in member_questions:
            lang = q.language or "auto"
            lang_dist[lang] = lang_dist.get(lang, 0) + 1
            
        # Title and summary
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

    # Sort clusters descending by question count (topic demand)
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
    
    # Test cases: DSA Roadmap in 5 language variations
    dsa_group = [
        ("Give me a roadmap for DSA.", "en"),
        ("How should I start learning DSA?", "en"),
        ("DSA ka roadmap kaise banau?", "hinglish"),
        ("मुझे DSA कैसे सीखना चाहिए?", "hi"),
        ("मला DSA शिकायला सुरुवात कशी करावी?", "mr"),
    ]
    
    # Web Dev project group
    web_dev_group = [
        ("What are good project ideas for web development?", "en"),
        ("Web development ke liye best projects konse hain?", "hinglish"),
        ("वेब डेवलपमेंट के लिए कौन से प्रोजेक्ट्स अच्छे हैं?", "hi"),
        ("वेब डेव्हलपमेंटसाठी चांगले प्रोजेक्ट्स कोणते आहेत?", "mr")
    ]
    
    # Completely unrelated questions
    unrelated_group = [
        ("How to apply for campus hostel accommodation?", "en"),
        ("कॉलेज कैंटीन का खाना कैसा है?", "hi"),
        ("What is the weather in Mumbai tomorrow?", "en")
    ]

    all_items = [(text, lang, "DSA") for text, lang in dsa_group] + \
                [(text, lang, "WebDev") for text, lang in web_dev_group] + \
                [(text, lang, "Unrelated") for text, lang in unrelated_group]
                
    texts = [item[0] for item in all_items]
    embeddings = m.encode(texts, normalize_embeddings=True)
    sim_matrix = cosine_similarity(embeddings)
    
    # Measure intra-cluster similarities for DSA
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

    # Measure cross-cluster similarities (DSA vs WebDev, DSA vs Unrelated)
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
        "dsa_multilingual_pairs": dsa_intra_sims,
        "metrics": {
            "avg_dsa_multilingual_similarity": round(avg_dsa_intra, 4),
            "avg_dsa_vs_webdev_similarity": round(avg_inter_web, 4),
            "avg_dsa_vs_unrelated_similarity": round(avg_unrelated, 4),
            "separation_margin": round(avg_dsa_intra - avg_inter_web, 4),
            "recommended_threshold": 0.68
        }
    }
