# AI service only (for Hugging Face Spaces: SDK = Docker, app_port = 7860)
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 OMP_NUM_THREADS=1 MALLOC_ARENA_MAX=2
WORKDIR /app
COPY ai_service/requirements.txt ai_service/requirements.txt
RUN pip install --no-cache-dir -r ai_service/requirements.txt
COPY ai_service/app.py ai_service/app.py
COPY onnx_int8 onnx_int8
RUN useradd -m -u 1000 user && chown -R user /app
USER user
EXPOSE 7860
CMD ["uvicorn", "ai_service.app:app", "--host", "0.0.0.0", "--port", "7860"]
