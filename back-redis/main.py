"""Redis service entry point."""

import asyncio


async def init_service() -> None:
    await asyncio.sleep(0)


def main() -> None:
    asyncio.run(init_service())


if __name__ == "__main__":
    main()
