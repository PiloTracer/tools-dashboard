# Production nginx (`default.prd.conf`)

This file is the HTTP edge **inside** the Docker production stack. It is mounted by `docker-compose.prd.yml` as the only `default.conf` in the nginx container. The container publishes **`127.0.0.1:8082` only** — public TLS is terminated by **host nginx**.

## Hostname

`server_name` is `tools.datawork.top`. Point DNS at the VPS; install host configs from [`host-setup/prd/`](host-setup/prd/).

Seaweed S3 public hostname is **`s3.datawork.top`** (host nginx → `127.0.0.1:8333`), not this file.

## TLS

Terminate TLS on the **host** with Certbot (see `scripts/vps-deploy-datawork.sh`):

- Forward `Host`, `X-Forwarded-For`, and **`X-Forwarded-Proto: https`** from host nginx.
- Inside Docker, `$scheme` stays `http`; apps that trust proxy headers read `X-Forwarded-Proto`.

## WebSockets

Clients use `wss://tools.datawork.top/ws/` when the browser origin is HTTPS.

`default.prd.conf` sets long `proxy_read_timeout` / `proxy_send_timeout` for `/ws/`. Host nginx must also forward `Upgrade` / `Connection` (included in `host-setup/prd/tools.datawork.top.conf`).

Set **Strict-Transport-Security (HSTS)** on the host TLS terminator after Certbot.
