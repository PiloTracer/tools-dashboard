"""Redis pub/sub helpers."""

class PubSub:
    def __init__(self, client) -> None:
        self.client = client

    async def publish(self, channel: str, payload: str) -> None:
        await self.client.publish(channel, payload)
