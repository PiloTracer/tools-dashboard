"""Entry point for Cassandra data service."""

from __future__ import annotations

import asyncio
import logging

logger = logging.getLogger(__name__)


async def init_service() -> None:
    """Initialize Cassandra client resources."""
    logger.info("Starting Cassandra service placeholder")
    # TODO: wire in actual session creation / migrations.
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
