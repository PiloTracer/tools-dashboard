# Feature: Background workers (`back-workers`)

## Overview

**`back-workers`** is the **Celery** worker image (`back-workers/`). `main.py` defines a Celery app pointing at **Redis** (`redis://redis:6379/0`) and registers a **`heartbeat`** task for connectivity checks.

The `tasks/` package contains **stubs** (`cleanup.py`, `backup.py`, `data_export.py`) with metadata constants but they are **not** wired as `@app.task` in `main.py` yet. `CONTEXT.md` describes the intended operational model (queues, retries, isolation).

## User stories (target)

- As **operations**, I want durable background jobs (cleanup, export) off the request path.
- As **developers**, I want clear queue names and retry policies per task module.

## Relation to admin “Task scheduler”

The **admin UI** feature `task-scheduler` under `front-admin` is a separate, minimal scaffold and does not yet enqueue Celery jobs in this repository.

---

Last Updated: April 22, 2026
