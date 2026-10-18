"""
Evaluation script for Multilingual Question Clustering
Tests sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
Across English, Hindi, Marathi, Hinglish, Marathi-English, and mixed languages.
"""

import sys
import time
import numpy as np

# Ensure Windows terminal prints Hindi / Marathi / Unicode characters cleanly
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import AgglomerativeClustering

def run_evaluation():
    print("=" * 80)
    print("  MULTILINGUAL AI QUESTION CLUSTERING EVALUATION")
    print("  Model: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
    print("=" * 80)

    t0 = time.time()
    print("\n[1/4] Loading pretrained model...")
    model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
    print(f"Model loaded in {time.time() - t0:.2f} seconds.")

    # 1. Test Dataset with ground truth topics
    dataset = [
        # Topic 1: DSA Learning Roadmap
        {"text": "Give me a roadmap for DSA.", "lang": "English", "topic": "DSA Roadmap"},
        {"text": "How should I start learning DSA?", "lang": "English", "topic": "DSA Roadmap"},
        {"text": "DSA ka roadmap kaise banau?", "lang": "Hinglish", "topic": "DSA Roadmap"},
        {"text": "मुझे DSA कैसे सीखना चाहिए?", "lang": "Hindi", "topic": "DSA Roadmap"},
        {"text": "मला DSA शिकायला सुरुवात कशी करावी?", "lang": "Marathi", "topic": "DSA Roadmap"},
        {"text": "DSA saathi best roadmap kay ahe?", "lang": "Marathi-English", "topic": "DSA Roadmap"},

        # Topic 2: Web Development Projects
        {"text": "What are good project ideas for web development?", "lang": "English", "topic": "Web Dev Projects"},
        {"text": "Best web development projects for beginners.", "lang": "English", "topic": "Web Dev Projects"},
        {"text": "Web development ke liye best projects konse hain?", "lang": "Hinglish", "topic": "Web Dev Projects"},
        {"text": "वेब डेवलपमेंट के लिए कौन से प्रोजेक्ट्स अच्छे हैं?", "lang": "Hindi", "topic": "Web Dev Projects"},
        {"text": "वेब डेव्हलपमेंटसाठी चांगले प्रोजेक्ट्स कोणते आहेत?", "lang": "Marathi", "topic": "Web Dev Projects"},

        # Topic 3: Resume & Placement Interview Preparation
        {"text": "How to prepare my resume for tech placements?", "lang": "English", "topic": "Placement Resume"},
        {"text": "Placement ke liye resume kaise prepare karein?", "lang": "Hinglish", "topic": "Placement Resume"},
        {"text": "प्लेसमेंटसाठी रेझ्युमे कसा तयार करावा?", "lang": "Marathi", "topic": "Placement Resume"},
        {"text": "नौकरी के इंटरव्यू के लिए रिज्यूमे कैसे बनाएं?", "lang": "Hindi", "topic": "Placement Resume"},

        # Unrelated / Outliers
        {"text": "What is the procedure to apply for college hostel?", "lang": "English", "topic": "Hostel Procedure"},
        {"text": "कॉलेज कॅन्टीनचे जेवण कसे आहे?", "lang": "Marathi", "topic": "Canteen Food"},
        {"text": "Kal college me holiday hai kya?", "lang": "Hinglish", "topic": "Holiday Query"}
    ]

    texts = [d["text"] for d in dataset]
    print(f"\n[2/4] Generating semantic embeddings for {len(texts)} test questions...")
    embeddings = model.encode(texts, normalize_embeddings=True)
    sim_matrix = cosine_similarity(embeddings)

    # 2. Semantic Similarity Evaluation Across Languages for Topic 1 (DSA Roadmap)
    print("\n[3/4] Cross-Lingual Semantic Similarity Matrix (DSA Roadmap Ground Truth):")
    print("-" * 80)
    print(f"{'Pair Comparison':<62} | {'Similarity':<10} | {'Status'}")
    print("-" * 80)

    dsa_indices = [i for i, d in enumerate(dataset) if d["topic"] == "DSA Roadmap"]
    intra_dsa_sims = []
    
    for i in dsa_indices:
        for j in dsa_indices:
            if i < j:
                sim = float(sim_matrix[i][j])
                intra_dsa_sims.append(sim)
                desc = f"{dataset[i]['lang']} vs {dataset[j]['lang']}"
                # Truncate strings nicely
                q1 = dataset[i]['text'][:26]
                q2 = dataset[j]['text'][:26]
                label = f"{desc}: '{q1}' ~ '{q2}'"
                status = "PASS (>=0.65)" if sim >= 0.65 else ("ACCEPTABLE (>=0.55)" if sim >= 0.55 else "LOW")
                print(f"{label:<62} | {sim:.4f}     | {status}")

    avg_intra = np.mean(intra_dsa_sims)
    min_intra = np.min(intra_dsa_sims)
    max_intra = np.max(intra_dsa_sims)
    print("-" * 80)
    print(f"Intra-Topic (DSA) Similarity -> Mean: {avg_intra:.4f}, Min: {min_intra:.4f}, Max: {max_intra:.4f}")

    # 3. Inter-Topic Cross-Validation (Discrimination test)
    inter_sims = []
    other_indices = [i for i, d in enumerate(dataset) if d["topic"] != "DSA Roadmap"]
    for i in dsa_indices:
        for j in other_indices:
            inter_sims.append(float(sim_matrix[i][j]))

    avg_inter = np.mean(inter_sims)
    max_inter = np.max(inter_sims)
    separation_gap = avg_intra - avg_inter

    print(f"Inter-Topic (Unrelated) Similarity -> Mean: {avg_inter:.4f}, Max: {max_inter:.4f}")
    print(f"Separation Margin: {separation_gap:.4f} (Expected > 0.30)")

    # 4. Agglomerative Clustering Evaluation
    print("\n[4/4] Semantic Clustering Test (Threshold = 0.68):")
    threshold = 0.68
    clustering = AgglomerativeClustering(
        metric="cosine",
        linkage="average",
        distance_threshold=1.0 - threshold,
        n_clusters=None
    )
    labels = clustering.fit_predict(embeddings)

    clusters = {}
    for idx, lbl in enumerate(labels):
        clusters.setdefault(lbl, []).append(dataset[idx])

    print(f"Total Clusters Formed: {len(clusters)} from {len(dataset)} questions")
    print("=" * 80)
    for c_id, members in clusters.items():
        print(f"\nCluster #{c_id + 1} ({len(members)} questions):")
        langs = set(m['lang'] for m in members)
        topics = set(m['topic'] for m in members)
        print(f"  Languages: {', '.join(langs)}")
        print(f"  Underlying Topics: {', '.join(topics)}")
        for m in members:
            print(f"    - [{m['lang']}] {m['text']}")

    # Validation criteria
    print("\n" + "=" * 80)
    print("EVALUATION SUMMARY & THRESHOLD VALIDATION:")
    print("=" * 80)
    pass_separation = separation_gap > 0.30
    pass_multilingual = avg_intra > 0.65
    pass_discrimination = avg_inter < 0.45

    print(f"1. Multilingual Semantic Cohesion (Avg Intra > 0.65):   {'PASSED' if pass_multilingual else 'FAILED'} ({avg_intra:.4f})")
    print(f"2. Cross-Topic Discrimination (Avg Inter < 0.45):       {'PASSED' if pass_discrimination else 'FAILED'} ({avg_inter:.4f})")
    print(f"3. Topic Separation Margin (> 0.30):                    {'PASSED' if pass_separation else 'FAILED'} ({separation_gap:.4f})")
    
    if pass_separation and pass_multilingual and pass_discrimination:
        print("\nALL MULTILINGUAL AI CLUSTERING CRITERIA PASSED SUCCESSFULLY!")
        print("Model paraphrase-multilingual-MiniLM-L12-v2 is confirmed reliable for EN, HI, MR, and mixed languages.")
        return 0
    else:
        print("\nNote: Some boundary cases observed. Threshold fine-tuning recommended.")
        return 1

if __name__ == "__main__":
    sys.exit(run_evaluation())
