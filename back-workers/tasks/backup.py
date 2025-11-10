"""Backup task definition."""

QUEUE_NAME = "medium"
RETRY_POLICY = {"max_retries": 3, "interval": 300}
RESOURCE_LIMITS = {"cpu": 0.5, "memory": 512}


def run() -> None:
    return None
