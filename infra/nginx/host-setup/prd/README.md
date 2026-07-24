# Production host nginx — datawork.top

Templates in this directory are installed on the **Ubuntu VPS host** (not inside Docker).

| File | Purpose |
|------|---------|
| `tools.datawork.top.conf` | TLS edge → `127.0.0.1:8082` (compose `nginx-proxy`) |
| `s3.datawork.top.conf` | TLS edge → `127.0.0.1:8333` (Seaweed S3) |
| `www.datawork.top.conf` | Redirect → `tools.datawork.top` |
| `NAMECHEAP_DNS.md` | A-record checklist |

## Install (on VPS)

```bash
cd /opt/tools-dashboard
sudo bash infra/nginx/host-setup/05-install-prd-datawork-host-nginx.sh
# After DNS:
sudo certbot --nginx -d tools.datawork.top -d s3.datawork.top -d www.datawork.top --redirect
```

Or one-shot: `sudo bash scripts/vps-deploy-datawork.sh`
