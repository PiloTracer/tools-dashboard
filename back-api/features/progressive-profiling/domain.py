"""Domain logic for progressive profiling."""

from dataclasses import dataclass


@dataclass(slots=True)
class ProfileStep:
    name: str
    required: bool


class ProfilingService:
    """Coordinates progressive profiling stages for a user."""

    async def next_steps(self, completed: list[str]) -> list[ProfileStep]:
        base_steps = [ProfileStep("basic", True), ProfileStep("preferences", False)]
        return [step for step in base_steps if step.name not in completed]
