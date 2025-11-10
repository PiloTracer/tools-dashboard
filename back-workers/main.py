"""Celery worker entry point."""

from celery import Celery

app = Celery("workers")
app.conf.broker_url = "redis://redis:6379/0"


@app.task
def heartbeat() -> str:
    return "ok"
