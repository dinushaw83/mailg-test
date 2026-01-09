FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend

RUN apt-get update && \
    BUILD_ESSENTIAL_VERSION=$(apt-cache madison build-essential | head -1 | awk '{print $3}') && \
    CURL_VERSION=$(apt-cache madison curl | head -1 | awk '{print $3}') && \
    apt-get install -y --no-install-recommends \
        build-essential=${BUILD_ESSENTIAL_VERSION} \
        curl=${CURL_VERSION} && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create logs + reports directory
RUN mkdir -p /app/backend/logs /app/reports

EXPOSE 8765

CMD ["sh", "-c", "gunicorn app.main:app -c gunicorn_config.py"]

