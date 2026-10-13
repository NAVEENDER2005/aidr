FROM python:3.10-slim

# Install system dependencies for OpenCV and other packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libglib2.0-0 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install dependencies with CPU-only PyTorch (reduces image from 3.5GB to ~500MB)
COPY requirements.txt .
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

# Copy source code
COPY . .

# Expose port and start backend respecting cloud host PORT variable
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
