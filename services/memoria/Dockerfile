FROM python:3.14.4-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    GRAPHITI_TELEMETRY_ENABLED=false \
    HF_HUB_DISABLE_TELEMETRY=1 \
    DO_NOT_TRACK=1 \
    ORT_DISABLE_TELEMETRY=1 \
    EMBEDDING_DIM=256 \
    LYRA_MEMORIA_MODELO_PASTA=/opt/lyra-modelos/potion

WORKDIR /app
COPY requirements.lock ./
RUN pip install --no-cache-dir --require-hashes -r requirements.lock
COPY embeddings.py provedor.py app.py ./
RUN python -c "from embeddings import preparar_modelo; preparar_modelo()" \
    && groupadd --gid 10001 memoria \
    && useradd --uid 10001 --gid 10001 --shell /usr/sbin/nologin --create-home memoria \
    && chmod -R a+rX /opt/lyra-modelos

ENV HF_HUB_OFFLINE=1
USER memoria
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-access-log"]
