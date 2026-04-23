# Configure access to SeaweedFS

This folder holds **static config** mounted into the `seaweedfs` container (`docker-compose.dev.yml` / `docker-compose.prd.yml`). There are two different mechanisms: **S3 identities** (API keys) and **security / JWT** (signing keys + UI gate).

---

## 1. S3 API keys — `s3-config.json`

**What it is:** Credentials for the **S3 API (Seaweed S3 gateway)** — the process inside the `seaweedfs` container that speaks **Amazon S3–compatible HTTP** on port **8333** (mapped to **18333** on the host in dev). It is **not** the Filer web UI (8888) or Master UI (9333). Keys are **access key + secret key** pairs plus what each identity may do (`Admin`, `Read`, `Write`, and optional bucket-scoped rules per [SeaweedFS S3 credentials](https://github.com/seaweedfs/seaweedfs/wiki/S3-Credentials)).

**Who uses it:** AWS CLI, boto3, `curl` with `-u`, and this repo’s services that talk to Seaweed over the **S3 gateway** (they read **`SEAWEED_S3_ACCESS_KEY`** / **`SEAWEED_S3_SECRET_KEY`** from `.env` — those must match **one** key pair you want the app to use).

### Mini-tutorial

1. **Edit** `s3-config.json` (valid JSON).
2. **Add another key** on the same identity: add a second object inside `"credentials"` with new `accessKey` / `secretKey` (same `actions` as that identity).
3. **Or add another identity:** append a new object to the top-level `"identities"` array with its own `name`, `credentials`, and `actions`.
4. **Restart** the `seaweedfs` service so the mount is picked up (e.g. recreate the container after a file change).
5. **If the dashboard app should use the new key**, set `SEAWEED_S3_ACCESS_KEY` and `SEAWEED_S3_SECRET_KEY` in repo-root `.env` (or `.env.prd`) to that pair. Extra pairs in JSON do not need to be in `.env` unless something connects with them.

**Dev host endpoints** (ports avoid clashes on `8333` / `9333` / `8888`):

| Interface | URL from your machine | Typical use |
|-----------|------------------------|-------------|
| **S3 API (Seaweed S3 gateway)** | `http://localhost:18333` | AWS CLI, boto3, app uploads (`server -s3` in compose) |
| Master UI | `http://localhost:19333` | Cluster / volumes |
| Filer UI | `http://localhost:18888` | File browser |

Inside Docker, the **S3 gateway** is **`http://seaweedfs:8333`** (same service; host **18333** is `8333` published only in dev compose).

---

## 2. JWT signing + UI access — `security.toml`

**What it is for:** **Not** the S3 access/secret keys. This file configures:

- **`[jwt.signing]`**, **`[jwt.filer_signing]`**, **`[jwt.master_signing]`** — shared secrets used to **sign JWTs** for Seaweed’s own auth flows (e.g. when the Master/Filer UIs or internal features issue or validate tokens). Treat these like passwords: **change them in production** and keep them out of public repos if you fork with real values.
- **`[access] ui = true`** — require authentication for **UI** access (Master/Filer web), consistent with locking down the stack. Calls to the **S3 API (Seaweed S3 gateway)** still authenticate with keys from **`s3-config.json`** (and AWS SigV4-style signatures), not with these JWT keys directly.

**When to touch it:** Rotate JWT keys after clone or compromise; adjust `ui` only if you understand the exposure (disabling UI auth is rarely desirable on a shared network).

---

## 3. Checklist

- [ ] `s3-config.json`: identities and key pairs are what you intend; app `.env` matches the pair used by **back-api** / scripts.
- [ ] `security.toml`: JWT keys rotated for non-dev; `ui` left `true` unless you explicitly need open UIs.
- [ ] Restart **`seaweedfs`** after editing either file.

More detail and examples: `seaweedfs/AUTHENTICATION.md` in the repo root.
