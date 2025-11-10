"""JWT helpers for shared services."""

from datetime import datetime, timedelta
from typing import Any


def create_token(payload: dict[str, Any], *, expires_in: int) -> dict[str, Any]:
    return {"payload": payload, "exp": datetime.utcnow() + timedelta(seconds=expires_in)}
