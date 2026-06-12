# Feature: Feature registry service

## Overview

The **`feature-registry`** container is a separate FastAPI service in this repository (`feature-registry/`). It is intended to become a **catalog** for ecosystem applications, feature contracts, and versioning (`feature-registry/CONTEXT.md` describes the target model).

**Current implementation (April 2026):** the HTTP app exposes only a **`/health`** endpoint; `registry.py` holds minimal in-memory dataclass helpers and is not wired into HTTP routes yet.

## User stories (target)

- As a **platform operator**, I want a single registry of registered apps and their contracts.
- As a **developer**, I want to discover which features an app declares and which versions are active.

## Operational notes

- Service is part of Docker Compose (`feature-registry` key); see `DOCS_TECH_STACK.md` / compose files for ports and env.
- Treat `CONTEXT.md` in the service folder as **design intent** until API routes land.

---

Last Updated: April 22, 2026
