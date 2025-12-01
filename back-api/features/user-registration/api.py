"""FastAPI router definitions for the user registration feature."""

from fastapi import APIRouter, Depends

router = APIRouter(prefix="/user-registration", tags=["user-registration"])


def get_service():
    """Placeholder dependency that returns a service stub."""
    # In production this would resolve a domain service via DI.
    return object()


@router.get("/health", summary="Health check")
async def health_check(_: object = Depends(get_service)) -> dict[str, str]:
    """Report that the feature-specific router is reachable."""
    return {"status": "ok"}
