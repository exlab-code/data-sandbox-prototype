FROM python:3.11-slim

# Install needed tools
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    docker.io \
    docker-compose \
    && rm -rf /var/lib/apt/lists/*

# Set workdir
WORKDIR /app

# Copy app code
COPY . .

# Install dependencies
RUN pip install -r requirements.txt

# Entrypoint
CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]
