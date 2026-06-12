# Proposal: Production Backup / Restore Readiness

**Date:** 2025-07-14
**Author:** AI session
**Status:** Draft

---

## 1. Problem

The stack's backup/restore mechanism archives Docker volumes as `.tar.gz` (Postgres, Redis, Cassandra, SeaweedFS) and restores them into fresh volumes on a target machine. This works mechanically, but **settings in `.env.prd`** can silently break restored production data in two categories:

1. **Credentials mismatch** — passwords/secrets differ between backup source and restore target.
2. **URL rot** — environment-bound URLs stored inside volume data (OAuth redirect URIs, app URLs) point to the wrong domain after restore.

---

## 2. Volume-by-volume audit

### 2a. PostgreSQL (`postgres_data`)

| Data stored | URL-sensitive? | Credential-sensitive? | Risk |
|---|---|---|---|
| `oauth_clients.redirect_uris` | **Yes** — hardcoded `http://localhost:7300/oauth/complete`, `https://ecards.epicstudio.com/oauth/complete` etc. | No | OAuth flows break if prod URIs don't match restored values |
| `oauth_clients.prod_url` / `dev_url` | **Yes** — stored as plain text | No | App library links go to wrong domain |
| `oauth_clients.client_secret_hash` | No | **Yes** — bcrypt hashes; if secret changed on source, restored clients have stale hashes | Integrated apps can't authenticate |
| `users` table (password hashes) | No | No (argon/bcrypt hashes portable) | OK |
| JWT refresh / verification tokens | No | **Yes** — signed with `JWT_SECRET_KEY` at backup time | If `JWT_SECRET_KEY` changes, all tokens invalidate (users re-login, pending verifications fail) |
| `pg_auth` (DB user passwords) | No | **Yes** — `POSTGRES_PASSWORD` in `.env.prd` must match what was used when volume was created | **CRITICAL** — services can't connect to restored DB if password differs |

**Key insight:** Postgres Docker image sets `POSTGRES_PASSWORD` **only on first init** (empty data dir). After a volume restore, the password embedded in the restored data is what was set at backup-time, NOT what `POSTGRES_PASSWORD` says in `.env.prd` on the target machine.

### 2b. Redis (`redis_data`)

| Data stored | URL-sensitive? | Credential-sensitive? | Risk |
|---|---|---|---|
| Session data, Celery broker state, caches | **No** | No | Redis `--requirepass` is passed as a CLI arg every container start — password is **not** stored in the volume. Session cookies may reference wrong domain, but sessions expire quickly. Low risk. |

### 2c. Cassandra (`cassandra_data`)

| Data stored | URL-sensitive? | Credential-sensitive? | Risk |
|---|---|---|---|
| Time-series / event data | **No** | No | Low risk. No known URL- or credential-bound data stored. |

### 2d. SeaweedFS (`seaweed-data`)

| Data stored | URL-sensitive? | Credential-sensitive? | Risk |
|---|---|---|---|
| File blobs, filer metadata | **No** (blobs are opaque; URLs served at runtime) | No | The `_public_storage_base_url()` function reads `TD_PUBLIC_BASE_URL` from env at runtime — **not** from stored data. Low risk. |

---

## 3. Risks by severity

| # | Risk | Severity | Affects |
|---|---|---|---|
| R1 | **Postgres password mismatch** — restored volume's `pg_auth` has a different password than `POSTGRES_PASSWORD` in `.env.prd` | 🔴 **Critical** | All services that connect to Postgres |
| R2 | **JWT_SECRET_KEY mismatch** — existing refresh/verification tokens signed with a different key | 🟡 **High** | All user sessions; email verification |
| R3 | **OAuth redirect URIs stale** — restored volume has dev or wrong-domain redirect URIs | 🟡 **High** | E-Cards, Rizervox, any custom OAuth clients |
| R4 | **OAuth client URLs (prod_url, dev_url) stale** | 🟡 **Medium** | App library listings link to wrong domain |
| R5 | **OAuth client secrets stale** — client_secret_hash from backup may not match what integrated apps were issued | 🟠 **Medium** | Third-party apps using stored integration keys |
| R6 | **Redis session domain stale** — session cookies reference old domain | 🟢 **Low** | Temporary — sessions expire quickly |

---

## 4. Required fixes

### 4a. Post-restore credential alignment script (R1, R2)

After volume restore and before starting the stack for traffic, run a one-shot container that:

- **Postgres:** `ALTER USER $POSTGRES_USER WITH PASSWORD '$POSTGRES_PASSWORD';` — aligns the DB user password with `.env.prd`
- **Token invalidation:** `DELETE FROM refresh_tokens; UPDATE users SET is_email_verified = false ...` (optional — JWT_SECRET_KEY rotation invalidates tokens naturally)

**Option A:** Embed in `td_run_restore()` in `bin/start.sh` — after `td_restore_volume_from_archive`, run a SQL fixup.

**Option B:** Document as a manual step in a restore runbook.

### 4b. OAuth URL refresh migration (R3, R4)

Add **`014_oauth_client_urls_production_fixup.sql`** that runs after every boot (idempotent) and updates known OAuth clients' `redirect_uris` and `prod_url` to match the current environment's `TD_PUBLIC_BASE_URL`.

This fixes the `ON CONFLICT DO NOTHING` problem — the bootstrap SQL won't overwrite existing rows, but a dedicated fixup SQL will.

```sql
-- back-postgres/schema/014_oauth_client_urls_production_fixup.sql
-- Refreshes OAuth client URLs to match the current deployment's public URL.
-- Idempotent: uses ON CONFLICT DO UPDATE (or direct UPDATE with WHERE).
-- Safe to re-run every boot.
```

### 4c. Bootstrap `ON CONFLICT` semantics review (R3, R4)

Change the existing bootstrap scripts (008, 009) from `DO NOTHING` to `DO UPDATE` for URL columns only — so a fresh deploy always gets correct production URLs. For admin-edited rows, the fixup script (4b) would need admin awareness.

**Alternative:** Keep `DO NOTHING` and rely entirely on the fixup script (4b). This is safer — bootstrap never clobbers admin edits; fixup applies known-good prod URLs.

---

## 5. Implementation plan

| Step | What | File(s) | Priority |
|---|---|---|---|
| 1 | Add `014_oauth_client_urls_production_fixup.sql` — reads `TD_PUBLIC_BASE_URL` env (via Postgres `current_setting` or a default) and refreshes known clients' `prod_url`, `redirect_uris` | `back-postgres/schema/014_oauth_client_urls_production_fixup.sql` | 🔴 Before any prod restore |
| 2 | Add post-restore password alignment to `td_run_restore()` in `bin/start.sh` — runs `ALTER USER` on the restored DB | `bin/start.sh` (function + call in restore flow) | 🔴 Before any prod restore |
| 3 | Document JWT/secret lifecycle — add restore runbook section explaining that JWT_SECRET_KEY change invalidates all tokens (expected/acceptable) | `.work/plans/proposals/` or `.work/context/` | 🟡 Before first prod use |
| 4 | Optionally: add a `RESTORE_RUNBOOK.md` with the full restore procedure including verification steps | `.work/context/RESTORE_RUNBOOK.md` | 🟢 Nice-to-have |

---

## 6. Open questions

| Question | Notes |
|---|---|
| Should the JWT_SECRET_KEY be rotated on restore (invalidating all sessions) or kept stable? | Keeping it stable means no forced re-login. Rotating means security reset. **Decision needed.** |
| Are there third-party OAuth providers (Google) that have hardcoded redirect URIs in their console? | Those are configured externally and won't be affected by volume restore. Only `oauth_clients.redirect_uris` in Postgres matters. |
| Should SeaweedFS S3 credentials (`SEAWEED_S3_ACCESS_KEY` / `SEAWEED_S3_SECRET_KEY`) also be aligned after restore? | SeaweedFS uses these at container start to configure S3 auth. If the restored volume has different keys, the container won't match. **Check needed.** |

---

## 7. Files touched

| Path | Change |
|---|---|
| `back-postgres/schema/014_oauth_client_urls_production_fixup.sql` | **Create** — idempotent URL refresh for known OAuth clients |
| `bin/start.sh` | **Edit** — add `td_run_restore_fixup()` step after volume extraction in `td_run_restore()` |
