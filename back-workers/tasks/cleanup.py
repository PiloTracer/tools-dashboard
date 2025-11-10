"""Cleanup task definition."""

QUEUE_NAME = "low"
RETRY_POLICY = {"max_retries": 3, "interval": 900}
RESOURCE_LIMITS = {"cpu": 0.5, "memory": 512}


def run() -> None:
    return None
