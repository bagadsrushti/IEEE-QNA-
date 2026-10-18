# Multilingual AI Question Clustering Platform

A production-ready full-stack web application that collects questions from participants via QR code, groups semantically similar inquiries across **English, Hindi (हिंदी), Marathi (मराठी), Hinglish, and mixed languages**, and ranks the most frequently requested topics for organizers, educators, and curriculum planners.

---

## 🌟 Key Features

1. **True Multilingual Semantic Grouping**:
   - Uses the pretrained `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` model.
   - Detects and groups equivalent questions regardless of script or phrasing:
     - *"Give me a roadmap for DSA."* (English)
     - *"DSA ka roadmap kaise banau?"* (Hinglish)
     - *"मुझे DSA कैसे सीखना चाहिए?"* (Hindi)
     - *"मला DSA शिकायला सुरुवात कशी करावी?"* (Marathi)
     - *"DSA saathi best roadmap kay ahe?"* (Marathi-English)
     - **All clustered together into a single topic: "DSA Learning Roadmap"** (Cosine similarity: 0.85–0.96).

2. **Mobile-First Public Submission Portal**:
   - No registration or login required for participants.
   - Fast mobile form with interactive language selector (`Auto Detect`, `English`, `हिंदी`, `मराठी`).
   - One-click multilingual example test chips.
   - Instant semantic confirmation displaying assigned topic.
   - Accidental duplicate-click debouncing (15-second window).
   - Anonymous, privacy-conscious data collection.

3. **Participant QR Code System**:
   - Generates high-resolution QR code directly in the admin dashboard.
   - One-click PNG download for event posters, slides, and flyers.
   - Configurable `PUBLIC_URL` from `.env` (with built-in LAN IP helper so organizers can scan from mobile phones without localhost issues).

4. **Analytics & Administration Dashboard**:
   - Real server-side JWT authentication with hashed passwords (`bcryptjs`).
   - Overview metrics: Total submissions, clusters formed, top requested topic, questions today.
   - Interactive charts (Recharts):
     - **Language Distribution** (Donut chart).
     - **Topic Demand Ranking** (Horizontal bar chart).
     - **Submissions Timeline** (Area/line chart).
   - Ranked topic clusters table sorted by participant demand.
   - **Cluster Deep-Dive Modal**: View all original questions, detected languages, similarity scores, and timestamps.
   - **Admin Operations**:
     - Edit topic titles and summaries.
     - Merge redundant clusters.
     - Reassign misclassified questions.
     - Trigger AI batch reclustering with configurable similarity threshold slider (0.50–0.85).
     - Full CSV data export.

---

## 🏗️ Architecture & Technology Stack

```
┌────────────────────────────────┐
│   React + Vite Frontend        │ (Port 5173)
│   • Tailwind CSS               │ Mobile-First Submission Form
│   • Recharts Analytics         │ Admin Dashboard & QR Code
│   • Lucide React Icons         │
└───────────────┬────────────────┘
                │ REST API
┌───────────────▼────────────────┐
│   Node.js + Express Backend    │ (Port 5000)
│   • Mongoose / MongoDB Atlas   │ Incremental Cosine Matching
│   • In-Memory MongoDB Fallback │ Admin Auth (JWT & Bcrypt)
│   • Rate Limiting & Debouncing │ CSV Export & QR Generation
└───────────────┬────────────────┘
                │ HTTP REST (FastAPI)
┌───────────────▼────────────────┐
│   Python AI Clustering Service │ (Port 8000)
│   • sentence-transformers      │ Pretrained MiniLM-L12-v2
│   • PyTorch (CPU Optimized)    │ Agglomerative Clustering
│   • Scikit-Learn               │ 384-dimensional Embeddings
└────────────────────────────────┘
```

---

## 🚀 Quick Start Guide (Run Locally)

### Prerequisites
- Node.js (v18 or higher) & npm
- Python 3.10 or 3.11 with `pip`

---

### Step 1: Install Dependencies

#### 1.1 Python AI Service
```bash
pip install fastapi uvicorn sentence-transformers torch scikit-learn numpy pydantic requests
```

#### 1.2 Backend & Frontend
```bash
# In the root folder:
npm --prefix backend install
npm --prefix frontend install
```

---

### Step 2: Run the Multilingual AI Evaluation
Validate cross-lingual similarity across English, Hindi, Marathi, and Hinglish:
```bash
python ai_service/evaluate.py
```
*Expected output: All criteria PASSED (Separation margin > 0.50, Multilingual similarity > 0.70).*

---

### Step 3: Start the Application

You can start the three services in separate terminals:

#### Terminal 1: Python AI Model Service
```bash
python -m uvicorn ai_service.app:app --host 127.0.0.1 --port 8000
```
*(Model loads into memory on port 8000 in ~8 seconds).*

#### Terminal 2: Node.js Backend API
```bash
npm --prefix backend start
```
*(Backend connects to MongoDB and seeds the default admin on port 5000).*

#### Terminal 3: React Frontend
```bash
npm --prefix frontend run dev
```
*(Frontend starts on `http://localhost:5173`).*

---

### Step 4: Seed Realistic Multilingual Sample Data (Optional)
To populate the dashboard with realistic multilingual test questions across DSA, Web Dev, Placement Resumes, ML, and Campus Facilities:
```bash
node scripts/seed_data.js
```

---

### Step 5: Run Automated Integration Tests
Verify the complete end-to-end pipeline:
```bash
node scripts/test_system.js
```

---

## 🔑 Default Admin Credentials

- **URL**: `http://localhost:5173` -> Click **Admin Dashboard** in top-right
- **Email**: `admin@clusterai.org`
- **Password**: `Admin@12345`

*(Configurable via `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env`).*

---

## 📱 QR Code & Mobile Testing Instructions

1. Open the Admin Dashboard and click **Public QR Code**.
2. **If testing locally on a mobile phone over Wi-Fi**:
   - Find your computer's local LAN IP (e.g., `192.168.1.15`).
   - In the QR Code modal, click **Customize Target URL** and enter:
     `http://192.168.1.15:5173`
   - The QR code will immediately update and can be scanned with any phone camera!
3. **Download QR Code**:
   - Click **Download PNG** to save `question_hub_qr_code.png`.

---

## ☁️ Free-Tier Deployment Guide

| Component | Recommended Free Host | Configuration Notes |
| :--- | :--- | :--- |
| **Frontend** | **Vercel** / **Netlify** / **Cloudflare Pages** | Set build command: `npm run build`, output directory: `dist`. Add `VITE_API_URL` pointing to backend. |
| **Backend** | **Render** / **Railway** / **Koyeb** | Free Node.js web service. Set environment variables from `.env.example`. |
| **AI Model Service**| **Hugging Face Spaces** (Free Docker) | Free 16GB RAM CPU space running `uvicorn ai_service.app:app --host 0.0.0.0 --port 7860`. |
| **Database** | **MongoDB Atlas Free Tier** | Free M0 sandbox (512MB storage), sufficient for ~100,000 questions. |

### Limitations & Practical Considerations for Free Tier:
1. **Cold Starts**: Render/Koyeb free instances spin down after 15 minutes of inactivity. First request may take ~30 seconds to wake up.
2. **Model RAM**: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` consumes ~470MB RAM on CPU. It fits comfortably within Hugging Face Spaces (16GB) or standard 512MB free limits.
3. **Graceful Degradation**: If the Python model service is temporarily sleeping or offline, the backend securely records participant questions with `processingStatus: 'pending'` and notifies the user gracefully rather than failing silently or faking keyword matching.

---

## 📂 Project Structure

```
multilingual-ai-question-clustering/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection with in-memory fallback
│   ├── controllers/
│   │   ├── authController.js     # Admin JWT auth and seeding
│   │   ├── questionController.js # Public submission & duplicate debouncing
│   │   ├── clusterController.js  # Ranked clusters, edit, merge, move, export CSV
│   │   └── statsController.js    # KPIs, charts data, and QR generator
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT protection
│   │   └── rateLimiter.js        # IP rate limiting
│   ├── models/
│   │   ├── Admin.js              # Admin schema with bcrypt
│   │   ├── Cluster.js            # Semantic cluster schema with centroids
│   │   └── Question.js           # Question schema with 384-d vectors
│   ├── routes/                   # REST route declarations
│   ├── services/
│   │   ├── aiService.js          # Client to Python FastAPI model service
│   │   └── clusterEngine.js      # Incremental & batch cosine clustering
│   ├── server.js                 # Express application entrypoint
│   └── package.json
├── ai_service/
│   ├── app.py                    # FastAPI model server (MiniLM-L12-v2)
│   ├── evaluate.py               # Multilingual cross-lingual benchmark script
│   └── requirements.txt          # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── QRCodeModal.jsx
│   │   │   ├── ClusterDetailsModal.jsx
│   │   │   ├── EditClusterModal.jsx
│   │   │   ├── MergeClusterModal.jsx
│   │   │   ├── MoveQuestionModal.jsx
│   │   │   └── ReclusterModal.jsx
│   │   ├── pages/
│   │   │   ├── SubmitPage.jsx     # Mobile-first question form
│   │   │   ├── AdminLoginPage.jsx # Admin login
│   │   │   └── AdminDashboard.jsx # Analytics and management
│   │   ├── services/api.js        # Axios API client
│   │   ├── context/AuthContext.jsx
│   │   ├── App.jsx
│   │   └── index.css
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── scripts/
│   ├── seed_data.js               # Realistic multilingual question seeder
│   └── test_system.js             # Automated end-to-end test suite
├── .env.example                   # Environment configuration template
├── README.md                      # Documentation
└── package.json
```
