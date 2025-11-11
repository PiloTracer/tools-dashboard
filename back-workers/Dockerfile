FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

RUN groupadd --system celery && useradd --system --create-home --gid celery celery
RUN chown -R celery:celery /app

USER celery

CMD ["celery", "-A", "main.app", "worker", "-l", "info"]

