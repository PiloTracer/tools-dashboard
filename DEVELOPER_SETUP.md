# Developer Setup Guide

This document captures initialization steps for each component so you can prepare services before running the stack or working with AI assistants.

## Global Prerequisites
- Docker Desktop 4.26+
- Node.js 20.x and npm 10.x (for local dev outside containers)
- Python 3.11 (if executing services locally without Docker)
- Make sure ports 8082, 8443, 4100-4102, 55432, 6380, 9142 are free.

## Frontend Apps
### front-admin
1. `cd front-admin`
2. `npm install`
3. Optional: `npm run dev` (uses Remix dev server on port 4100 in Docker)
4. Update `.env` as needed (see sample in `docker-compose.dev.yml`).

### front-public
1. `cd front-public`
2. `npm install`
3. Optional: `npm run dev`

> Both apps expect `BACKEND_API_URL` at runtime—set in compose files.

## Backend Services
### back-api & back-auth
- Managed through Docker; to run locally:
  1. Create virtual env: `python -m venv .venv && source .venv/bin/activate`
  2. `pip install -r requirements.txt`
  3. `uvicorn main:app --reload`
- Environment variables provided in docker-compose templates (see compose files).

### back-postgres / back-cassandra / back-redis
- No local init required outside Docker; compose handles images and volumes.
- For SQL migrations, place files in `back-postgres/schema/`.

### back-workers
- Requires Redis URL; set via `CELERY_BROKER_URL` (already configured in compose).

### back-websockets
- Depends on Redis; configured via compose.

## Feature Registry
- FastAPI service; same virtual env steps as other Python services if run manually.

## Shared Contracts
- Pure Python modules. When updated, bump versions and communicate via AI prompt templates.

## AI Workflow Helpers
- `.ai/generate-context.sh <feature> <backend|frontend>` copies context into clipboard (macOS). Adjust for Windows as needed.
- `.ai/token-guard.py` placeholder—extend to enforce token budgets.

## Environment Variables (Defaults)
See `docker-compose.dev.yml` or `.env.dev` (if created) for canonical values. Compose files mount env vars directly so no additional files are required.

