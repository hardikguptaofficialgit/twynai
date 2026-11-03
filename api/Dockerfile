# syntax=docker/dockerfile:1
FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PORT=8080 FASTEMBED_CACHE_PATH=/opt/fastembed HF_HOME=/opt/fastembed UPLOAD_DIR=/tmp/twyn-uploads
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN mkdir -p /opt/fastembed /tmp/twyn-uploads && FASTEMBED_CACHE_PATH=/opt/fastembed python -c "from fastembed import TextEmbedding; TextEmbedding(model_name='sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2', cache_dir='/opt/fastembed')"
COPY app ./app
COPY alembic.ini ./alembic.ini
COPY alembic ./alembic
RUN useradd --system --uid 10001 --create-home twyn && chown -R twyn:twyn /app /opt/fastembed /tmp/twyn-uploads
USER twyn
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.getenv('PORT','8080') + '/api/health', timeout=4)"
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --proxy-headers --forwarded-allow-ips='*' --timeout-keep-alive 75"]
