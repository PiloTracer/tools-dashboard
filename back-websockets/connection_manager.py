"""In-memory connection manager stub."""

from collections.abc import Iterable


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: set[str] = set()

    def connect(self, connection_id: str) -> None:
        self._connections.add(connection_id)

    def disconnect(self, connection_id: str) -> None:
        self._connections.discard(connection_id)

    def active(self) -> Iterable[str]:
        return tuple(self._connections)
