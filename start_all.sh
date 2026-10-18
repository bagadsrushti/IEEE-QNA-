#!/bin/bash
echo "========================================================"
echo "Starting Multilingual AI Question Clustering Platform"
echo "========================================================"

echo "[1/3] Starting Python Multilingual AI Model Service..."
python -m uvicorn ai_service.app:app --host 127.0.0.1 --port 8000 &
PID_AI=$!

sleep 5

echo "[2/3] Starting Express Backend API..."
(cd backend && npm start) &
PID_BACKEND=$!

sleep 3

echo "[3/3] Starting React Vite Frontend..."
(cd frontend && npm run dev) &
PID_FRONTEND=$!

echo "========================================================"
echo "All services running:"
echo "- Public Question Submission: http://localhost:5173"
echo "- Admin Dashboard:           http://localhost:5173"
echo "- AI Model Service API:      http://localhost:8000"
echo "========================================================"

trap "kill $PID_AI $PID_BACKEND $PID_FRONTEND" EXIT
wait
