"""Data export task definition."""

QUEUE_NAME = "high"
RETRY_POLICY = {"max_retries": 3, "interval": 60}
RESOURCE_LIMITS = {"cpu": 0.5, "memory": 512}


def run(payload: dict) -> None:
    _ = payload
