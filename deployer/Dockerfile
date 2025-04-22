FROM python:3.11

WORKDIR /app
COPY . .

RUN apt update && apt install -y docker.io docker-compose \
    && pip install --no-cache-dir -r requirements.txt \
    && chmod +x /app/copy_dbt_demo.sh

# Run the copy_dbt_demo.sh script and then start the backend
CMD ["/bin/bash", "-c", "/app/copy_dbt_demo.sh && python3 backend.py"]
