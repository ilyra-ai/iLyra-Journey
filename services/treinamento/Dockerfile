FROM python:3.13.18-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HUB_DISABLE_TELEMETRY=1 \
    DO_NOT_TRACK=1 \
    HF_HOME=/opt/lyra-modelos \
    LYRA_TREINO_DADOS=/dados

WORKDIR /app
COPY requirements.lock ./
RUN pip install --no-cache-dir --require-hashes -r requirements.lock
# Pesos do modelo base baixados no build, na revisão fixada; o serviço roda
# offline e nunca envia conversas ou avaliações para fora.
RUN python -c "from huggingface_hub import snapshot_download; snapshot_download('Qwen/Qwen2.5-0.5B-Instruct', revision='7ae557604adf67be50417f59c2c2f167def9a775')" \
    && groupadd --gid 10002 treino \
    && useradd --uid 10002 --gid 10002 --shell /usr/sbin/nologin --create-home treino \
    && mkdir -p /dados && chown treino:treino /dados \
    && chmod -R a+rX /opt/lyra-modelos
COPY app.py ./

ENV HF_HUB_OFFLINE=1
USER treino
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-access-log"]
