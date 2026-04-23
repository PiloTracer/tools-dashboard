# Production nginx (`default.prd.conf`)

This file is the HTTP edge for the Docker production stack. It is mounted by `docker-compose.prd.yml` as the only `default.conf` in the nginx container.

## Hostname

`server_name` is set to `tools.aiepic.app`. Point DNS at the host (or load balancer) that publishes `NGINX_HTTP_PORT` from `.env.prd`.

## TLS

Typical setup: terminate TLS at a CDN or load balancer, forward plain HTTP to this nginx on the published port. In that case:

- Forward `Host`, `X-Forwarded-For`, and **`X-Forwarded-Proto: https`** so application code that checks scheme behaves correctly.
- If the LB only speaks HTTP to nginx, `$scheme` in this config stays `http`; apps that trust proxy headers should read `X-Forwarded-Proto` (configure your framework / reverse-proxy trust as needed).

To terminate TLS in this container instead, add `listen 443 ssl`, certificate paths, and optionally redirect `listen 80` to HTTPS.

## WebSockets

Clients should use `wss://tools.aiepic.app/ws/` when the browser origin is HTTPS.
