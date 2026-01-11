FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create logs + reports directory
RUN mkdir -p /app/backend/logs /app/reports

# Copy and setup entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8765

# Set entrypoint and default command
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["sh", "-c", "gunicorn app.main:app -c gunicorn_config.py"]

