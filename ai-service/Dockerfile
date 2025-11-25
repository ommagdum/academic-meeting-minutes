# Dockerfile - UPDATED
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies including file utilities
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    build-essential \
    file \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create upload directory and non-root user
RUN mkdir -p /app/uploads && \
    useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app

USER app

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:5000/ai/health || exit 1

# Run application with Gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120", "app:app"]