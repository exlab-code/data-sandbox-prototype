FROM python:3.11

WORKDIR /app
COPY . .

RUN apt update && apt install -y docker.io docker-compose \
    && pip install --no-cache-dir -r requirements.txt

CMD ["python3", "backend.py"]
