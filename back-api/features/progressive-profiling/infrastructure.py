"""Infrastructure layer for progressive profiling."""

class ProfilingRepository:
    """Provides data access methods for profiling responses."""

    async def fetch_profile(self, user_id: str) -> dict[str, str]:
        _ = user_id
        return {"stage": "basic"}


class InfrastructureRegistry:
    def __init__(self, repository: ProfilingRepository | None = None) -> None:
        self.repository = repository or ProfilingRepository()

    async def record_step(self, user_id: str, step: str) -> None:
        _ = (user_id, step)
