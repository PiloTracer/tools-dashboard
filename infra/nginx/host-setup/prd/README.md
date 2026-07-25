# Production host nginx — datawork.top

Templates in this directory are installed on the **Ubuntu VPS host** (not inside Docker).

| File | Purpose |
|------|---------|
| `tools.datawork.top.conf` | Full routing + TLS (Let's Encrypt paths) |
| `tools.datawork.top.http-only.conf` | HTTP-only until certbot |
| `tools.datawork.top.routing.conf` | Shared `location` blocks → `/etc/nginx/snippets/` |
| `s3.datawork.top.conf` | TLS edge → `127.0.0.1:8333` (Seaweed S3) |
| `www.datawork.top.conf` | Redirect → `tools.datawork.top` |
| `NAMECHEAP_DNS.md` | A-record checklist |

**Production does not run `nginx-proxy` in Docker.** Host nginx proxies to `127.0.0.1` ports published by `docker-compose.prd.yml` (`TD_HOST_*` in `.env.prd.example`).

| Upstream | Host port | Service |
|----------|-----------|---------|
| front-admin | 13001 | Remix admin |
| front-public | 13002 | Remix public + OAuth |
| back-api | 18000 | Main API (not 8000 — teleprompt) |
| back-auth | 18001 | Auth |
| back-websockets | 18010 | WebSockets |
| seaweed filer | 18888 | `/storage/` |
| seaweed S3 | 8333 | `s3.datawork.top` |

## Install (on VPS)

```bash
cd /opt/tools-dashboard
git pull
./bin/start.sh prd up-build
sudo bash infra/nginx/host-setup/05-install-prd-datawork-host-nginx.sh
# After DNS (first time):
sudo certbot --nginx -d tools.datawork.top -d s3.datawork.top -d www.datawork.top --redirect
```

Or one-shot: `sudo bash scripts/vps-deploy-datawork.sh`
