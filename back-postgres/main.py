"""Entry point for PostgreSQL data service."""

from __future__ import annotations

import asyncio
import logging

logger = logging.getLogger(__name__)


async def init_service() -> None:
    """Initialize database pools and run migrations."""
    logger.info("Starting PostgreSQL service placeholder")
    # TODO: add real connection pool + migration runner.
    await asyncio.sleep(0)


async def lifespan() -> None:
    """Keep container alive for docker-compose dev workflows."""
    await init_service()
    while True:
        await asyncio.sleep(60)


def main() -> None:
    asyncio.run(lifespan())


if __name__ == "__main__":
    main()
