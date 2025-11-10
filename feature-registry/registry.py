"""Registry models and helpers."""

from dataclasses import dataclass


@dataclass(slots=True)
class Application:
    name: str
    version: str
    permissions: list[str]


class Registry:
    def __init__(self) -> None:
        self._apps: dict[str, Application] = {}

    def register(self, app: Application) -> None:
        self._apps[app.name] = app

    def list(self) -> list[Application]:
        return list(self._apps.values())
