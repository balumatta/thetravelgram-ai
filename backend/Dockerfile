FROM python:3.12.3-slim

RUN apt-get update && apt-get install -y \
    python3-dev \
    git \
    build-essential \
    libssl-dev \
    libffi-dev \
    libjpeg-dev \
    libfreetype6-dev \
    zlib1g-dev \
    libcairo2-dev \
    pkg-config \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install the CPU-only version of torch first to avoid massive time building docker image using requirements.txt
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu

# Now install sentence-transformers
# It will see 'torch' is already there and won't download the GPU version
RUN pip install sentence-transformers

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt

COPY . .

EXPOSE 9000

CMD ["python", "run_fastapi.py"]
