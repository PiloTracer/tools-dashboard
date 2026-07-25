# Tools Dashboard — session handoff

**Purpose:** Fast resume for the next chat or engineer.

**Updated:** 2026-07-25 · **Mode:** thin-client

## Cross-framework action (@x-director)
**Date:** 2026-07-25
**Request:** "Add bilingual informational mini-website at https://tools.datawork.top/ root; keep public/admin entry cards always visible; EN/ES like current i18n."
**Frameworks involved:** .ai (engineering), .ai.ui (degraded — design applied natively)
**Classified bucket(s):** cross-framework (ui + engineering)
**Routing confidence:** high
**Preflight:** .ai yes · .ai.ui yes · .ai.biz no · .ai.soc no
**Executed:**
1. Expanded `infra/nginx/landing/index.html` — informational sections + sticky entry rail (desktop) + fixed dock (mobile); inline EN/ES via `i18next` cookie alignment.
2. Updated `infra/nginx/host-setup/05-install-prd-datawork-host-nginx.sh` to copy optional landing assets.
**Blockers:** none — redeploy landing to VPS required.
**Next recommended:** On VPS: `sudo cp` landing or re-run host nginx install script after `git pull`.

---

## Session status

**Closed:** 2026-07-25 — last-12h multilingual changes verified; i18n defects fixed (server translations, Trans tags, TLS redirects, landing switcher, plain-cookie persistence); portal home copy rewritten to match the product. All committed (`a5b8332` by owner + copy fix commit this close).

**Updated:** 2026-07-25

Treat the next chat as a **new session**: do not assume unwritten goals from prior threads unless they appear in this file or linked artifacts.

---

## What this cycle produced (2026-07-25)

| Area | Artifact |
|------|----------|
| Thin-client bootstrap | `.cursorrules` + `.work/` + `.work.ui/` + `opencode.json`; no local `.ai/` or `.ai.ui/` |
| Context slimming | HANDOFF 123 lines; `AGENTS.md` 38-line index; archive at `.work/context/archives/` |
| Rule fixes | Host smoke test exception; UI typecheck gate; conditional read routing; MCP disabled |
| i18n verification + fixes | `a5b8332` — server `getFixedT` raw-key bug (both apps), 0-based Trans tags, X-Forwarded-Proto redirects, landing switcher guard, plain `i18next` cookie contract (landing↔apps persistence), dev nginx `/health` |
| Portal home copy | Template marketing copy replaced with product-accurate text (en/es); third feature tile repointed to app library |
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
| 4 | Approve tsconfig fix: `moduleResolution: "Bundler"` + `@types/react*` devDeps (both frontends) so `tsc` works as a gate |
| 5 | Decide Google sign-in button label: backend-configured `buttonText` (always English) vs translated `t()` on es pages |

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

## Cross-framework action (@x-director)

**Date:** 2026-07-25
**Request:** "verify all changes in the last 12 hours. Make sure the system is reliable, languages are properly handled. Implement any fixes that you deem necessary"
**Frameworks involved:** .ai, .ai.ui
**Classified framework bucket(s):** cross-framework (engineering + ui)
**Routing confidence:** high
**Preflight (frameworks installed):** .ai yes | .ai.ui yes | .ai.biz yes | .ai.soc yes
**Executed:**
1. Verified commits `f0e1024..HEAD` (multilingual landing + front-admin/front-public i18n) via 4 parallel probes: stack smoke, front-admin i18n, front-public i18n, landing/nginx → smoke 4/4, logs clean, locale parity exact (en/es), but 8 defects found
2. Fixed (all live-verified): front-admin + front-public `i18next.server.ts` dead `i18nextOptions` block → server `getFixedT` returned raw keys (HIGH); front-admin `<Trans>` tags renumbered 0-based; change-language redirects honor `X-Forwarded-Proto` (both apps); landing `localStorage.getItem` guarded; landing mobile dock title emphasis; `default.prd.conf` deprecation note; dev nginx `:8082/health` endpoint added; front-public dead `getRequestT` export removed
3. Gates: touch-scope pass; blast-radius high (4 areas) — owner-approved by the request itself; smoke 4/4; MOD-06 registry in NEXT.md → merge_ok
**User correction:** none
**Coordination notes:** .ai.ui portion handled natively (landing page CSS/JS) — no ui-* skill chain needed for defect fixes; MOD-06 run per AI-assisted default
**Blockers / follow-ups (owner decisions needed):**
- `front-admin/tsconfig.json` / `front-public/tsconfig.json` are protected — `moduleResolution: "Node"` causes TS2307 on `remix-i18next/*` subpath imports; recommend `"Bundler"` (needs explicit approval). Baseline tsc already broken (~2393 errors, `@types/react*` missing from devDeps)
- Google sign-in button label not localized: backend-configured `buttonText` overrides `t()` on es pages (`front-public/.../user-registration/routes/index.tsx:184,297`) — needs product decision (locale-aware config vs always-translate)
- Real-browser hydration/client-side language switch unverified (no headless browser); SSR verified via curl
- Landing FOUC (English paint before es swap) — accepted, cosmetic
**Next recommended:** @ai-director - "fix tsconfig moduleResolution + add @types/react to make tsc a usable gate" (with protected-file approval)

---

## Cross-framework action (@x-director)

**Date:** 2026-07-25 (second action)
**Request:** "when user lands in the root: https://tools.datawork.top/ and the user changes the language, the selection should persist even after navigating to the public portal (portal publico)"
**Frameworks involved:** .ai
**Classified framework bucket(s):** engineering
**Routing confidence:** high
**Root cause (evidence):** Remix 2.17.2 `createCookie` unconditionally base64-JSON-encodes values (`encodeData`, `server-runtime/dist/cookies.js:101`) — the landing page writes plain `i18next=es`, which both apps silently ignored → fell back to English. Reproduced live before fixing (plain cookie → `lang="en"`).
**Executed:**
1. Replaced `i18nCookie` in `front-public/app/i18next.server.ts` and `front-admin/app/i18next.server.ts`: spread of the Remix cookie with plain-value `parse`/`serialize` overrides (first attempt — `encode`/`decode` options — provably cannot disable Remix's base64 layer; reverted)
2. Verified live: plain `i18next=es` → Spanish SSR in both apps; `change-language` now writes plain cookie; invalid + legacy base64 values fall back to English without crashing
3. Gates: smoke 4/4, touch-scope pass, blast-radius warn (in-scope)
**User correction:** none
**Coordination notes:** cookie contract now plain across landing page + both Remix apps; same attributes (Path=/, Max-Age=1y, SameSite=Lax, JS-readable)
**Blockers:** none
**Next recommended:** deploy to VPS so the fix reaches tools.datawork.top (owner action #2)

---

## Updating this file

After a significant session, refresh **Session status**, **Open owner actions**, **Repository state**, and **Where to look next**. Move long historical tables to `archives/`.
