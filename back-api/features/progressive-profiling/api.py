"""FastAPI router definitions for the progressive profiling feature."""

from fastapi import APIRouter, Depends

router = APIRouter(prefix="/progressive-profiling", tags=["progressive-profiling"])


def get_service():
    """Placeholder dependency for the profiling service."""
    return object()


@router.get("/profile", summary="Retrieve profile state")
async def get_profile(_: object = Depends(get_service)) -> dict[str, str]:
    """Return a mock profile payload for development scaffolding."""
    return {"stage": "incomplete"}
