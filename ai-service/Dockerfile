# Dockerfile - Hugging Face Optimized
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies including ffmpeg for Whisper
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    build-essential \
    file \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Apply the setuptools fix to prevent the openai-whisper build crash
RUN pip install "setuptools<70.0.0" wheel
RUN pip install --no-cache-dir --no-build-isolation -r requirements.txt

# Hugging Face strictly requires running as a non-root user with UID 1000
RUN useradd -m -u 1000 appuser
USER appuser
ENV PATH="/home/appuser/.local/bin:$PATH"

# Copy application code and set ownership
COPY --chown=appuser:appuser . /app

# Create upload directory and grant permissions
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

# Hugging Face strictly routes all traffic to port 7860
EXPOSE 7860

# Updated Health check for the new port
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:7860/ai/health || exit 1

# Run Gunicorn bound to 7860 and increased timeout for Whisper processing
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--workers", "2", "--timeout", "300", "app:app"]