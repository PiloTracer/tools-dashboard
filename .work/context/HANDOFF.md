# Tools Dashboard — session handoff

**Purpose:** Fast resume for the next chat or engineer.

**Updated:** 2026-07-25 · **Mode:** thin-client

## Session status

**Open:** 2026-07-25 — goal: VPS go-live (`tools.datawork.top`) / tactical backlog per NEXT.md

**Updated:** 2026-07-25

Treat prior closed sessions as historical only; see "What this cycle produced" below.

---

## What this cycle produced (2026-07-25)

| Area | Artifact |
|------|----------|
| Thin-client bootstrap | `.cursorrules` + `.work/` + `.work.ui/` + `opencode.json`; no local `.ai/` or `.ai.ui/` |
| Context slimming | HANDOFF 123 lines; `AGENTS.md` 38-line index; archive at `.work/context/archives/` |
| Rule fixes | Host smoke test exception; UI typecheck gate; conditional read routing; MCP disabled |
| Commits | `6e26a63` (bootstrap), `616c2f0` (context optimization) — both on `main` |

**Local cleanup (optional):** delete `.ai.back/` and `.ai.ui.back/` (~86 MB) when ready.

---

| Area | State |
|------|-------|
| Agent OS | Thin-client — skills/standards resolve from `$AGENT_OS_SOURCE` (no local `.ai/`) |
| UI Design OS | Thin-client — skills resolve from `$AI_UI_SOURCE` (no local `.ai.ui/`) |
| Project memory | `.work/` (backend/product) · `.work.ui/` (UI) |
| Planning | No approved master plan; tactical backlog in `NEXT.md` |
| Tests | Host smoke: `bash bin/test.sh` (stack must be up) |

---

## Open owner actions

| # | Action |
|---|--------|
| 1 | Namecheap A records: `tools` / `s3` / `www` → VPS public IPv4 |
| 2 | Sync repo to `/opt/tools-dashboard`; run `sudo bash scripts/vps-deploy-datawork.sh` |
| 3 | Google OAuth redirect URI + production SMTP for `tools.datawork.top` |

---

## Production target

| Item | Value |
|------|--------|
| Public app | `https://tools.datawork.top` |
| Public S3 | `https://s3.datawork.top` |
| Compose | `docker-compose.prd.yml` (nginx `127.0.0.1:8082`, Seaweed S3 `127.0.0.1:8333`) |
| Env template | `.env.prd.example` (secrets in gitignored `.env.prd`) |
| Host nginx | `infra/nginx/host-setup/prd/` |
| VPS script | `scripts/vps-deploy-datawork.sh` |
| DNS checklist | `infra/nginx/host-setup/prd/NAMECHEAP_DNS.md` |

WebSockets: `wss://tools.datawork.top/ws/` when site is HTTPS.

---

## How to run (dev)

```bash
./bin/start.sh dev up-build    # start stack
./bin/start.sh dev             # interactive menu
bash bin/test.sh               # smoke tests (host; stack running)
./bin/start.sh dev preflight   # compose + env checks
```

Production validate: `./bin/start.sh prd preflight` then `prd up-build`.

**Naming:** production file suffix is `prd` (not `prod`). `bin/start.sh` accepts `prod` as a CLI alias only.

---

## Active improvement track

| Item | Location |
|------|----------|
| Three-priority roadmap (P1–P3) | `.work/plans/20260422_PLAN_application-improvement-priorities.md` |
| Feature SPECs | `.work/features/<slug>/` |
| Production deploy proposal | `.work/plans/proposals/20250714-production-backup-restore-readiness.md` |

**Priority 1 remaining (summary):** 1B public session cookie audit; 1D nginx API routing documentation table. Admin session hardening (1A), OAuth `client_secret` verification, and test suite architecture are landed — see archive for detail.

---

## UI layer

| Item | Location |
|------|----------|
| UI handoff | `.work.ui/context/HANDOFF_UI.md` |
| UI backlog | `.work.ui/plans/NEXT_UI.md` |
| Next step | `@ui-design-foundation greenfield` (foundation 01–04 not yet authored for this product) |

---

## Where to look next

| Task | Start here |
|------|------------|
| Stack / ports / architecture | `DOCS_TECH_STACK.md` |
| UI stack / commands | `DOCS_UI_STACK.md` |
| Feature work | `.work/features/<slug>/feature.yaml` + README |
| Session / iteration process | `$AGENT_OS_SOURCE/START_HERE.md` |
| Nginx / TLS | `infra/nginx/README.prd.md`, `infra/nginx/default.prd.conf` |
| Start script | `bin/start.sh` |
| App library OAuth bootstrap | `back-postgres/schema/008_*.sql`, `009_*.sql`, `011_*.sql` |
| Public OAuth redirect selection | `front-public/app/features/app-library/utils/oauth.ts` |

---

## Postgres migrations (read before editing seeded clients)

- `back-postgres/main.py` runs all `back-postgres/schema/*.sql` in sorted order on **every** service start.
- E‑Cards / Rizervox bootstrap rows (`008`, `009`) use `ON CONFLICT DO NOTHING` — restarts do not overwrite admin edits.
- `011_oauth_redirect_strip_bad_hosts.sql` repairs bad callback hosts when a good URI remains.

---

## History

Detailed landed-work tables, deployment checklists, and Priority 1 step lists from earlier sessions: `.work/context/archives/HANDOFF-history-pre-thin-client.md` (secrets redacted).

---

## Updating this file

After a significant session, refresh **Session status**, **Open owner actions**, **Repository state**, and **Where to look next**. Move long historical tables to `archives/`.
