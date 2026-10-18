@echo off
echo ========================================================
echo Starting Multilingual AI Question Clustering Platform
echo ========================================================

echo [1/3] Starting Python Multilingual AI Model Service...
if exist .venv\Scripts\activate.bat (
    start "AI Model Service (FastAPI)" cmd /k "call .venv\Scripts\activate.bat && python -m uvicorn ai_service.app:app --host 127.0.0.1 --port 8000"
) else (
    start "AI Model Service (FastAPI)" cmd /k "python -m uvicorn ai_service.app:app --host 127.0.0.1 --port 8000"
)

timeout /t 5 /nobreak >nul

echo [2/3] Starting Express Backend API...
start "Backend API (Port 5000)" cmd /k "cd backend && npm start"

timeout /t 3 /nobreak >nul

echo [3/3] Starting React Vite Frontend...
start "Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo ========================================================
echo All services launched!
echo - Public Question Submission: http://localhost:5173
echo - Admin Dashboard:           http://localhost:5173 (Click Admin Login)
echo - AI Model Service:          http://localhost:8000/docs
echo ========================================================
pause
