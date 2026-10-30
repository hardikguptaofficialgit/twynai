# Proxy API. Build:  docker build -t proxy-api ./api   Run: docker run -p 8100:8100 --env-file .env -v proxy-data:/data proxy-api
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    DATABASE_URL=sqlite:////data/proxy.db UPLOAD_DIR=/data/uploads HF_HOME=/models FASTEMBED_CACHE_PATH=/models PORT=8100
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
# Bake the embedding model into the image so cold starts don't download it
RUN python -c "from fastembed import TextEmbedding; TextEmbedding('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')"
COPY app ./app
RUN useradd -u 10001 proxy && mkdir -p /data && chown -R proxy /data /models
USER proxy
VOLUME /data
EXPOSE 8100
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request,os;urllib.request.urlopen(f'http://localhost:{os.environ[\"PORT\"]}/api/health')"
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
