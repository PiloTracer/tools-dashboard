# Feature: WebSockets service (`back-websockets`)

## Overview

**`back-websockets`** is a dedicated FastAPI service for **real-time messaging** (`back-websockets/`). `CONTEXT.md` documents intended behavior: connection management, Redis-backed pub/sub, heartbeats, rate limits, and **no business logic** in this layer.

**Current implementation (April 2026):** the service exposes only **`GET /health`** in `main.py`. `connection_manager.py` exists as a foundation module; end-to-end WebSocket routes and auth are not fully wired in the checked-in tree.

## User stories (target)

- As a **client**, I want a stable WebSocket entrypoint for dashboard push updates.
- As a **platform**, I want horizontal scale with Redis and bounded connections per instance.

## Security (target)

See `back-websockets/CONTEXT.md`: origin validation, throttling, authenticated connections.

---

Last Updated: April 22, 2026
