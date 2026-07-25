# Production nginx (`default.prd.conf`)

**Deprecated for production deployment.** Prd no longer runs `nginx-proxy` in Docker. Routing lives on **host nginx**:

- `infra/nginx/host-setup/prd/tools.datawork.top.routing.conf`
- `infra/nginx/host-setup/05-install-prd-datawork-host-nginx.sh`

This file remains as a reference mirror of routing rules. **Dev** continues to use `infra/nginx/default.conf` inside the compose `nginx-proxy` service.

## Hostname

`tools.datawork.top` — TLS on host; see [`host-setup/prd/`](host-setup/prd/).

Seaweed S3: **`s3.datawork.top`** → `127.0.0.1:8333` (host nginx).

## TLS

Terminate TLS on the **host** with Certbot (`scripts/vps-deploy-datawork.sh`).

- Forward `Host`, `X-Forwarded-For`, and **`X-Forwarded-Proto: https`** from host nginx.

## WebSockets

Clients use `wss://tools.datawork.top/ws/` when the browser origin is HTTPS.

Host `tools.datawork.top.conf` sets long timeouts for `/ws/`. Set **HSTS** on the TLS server block.
