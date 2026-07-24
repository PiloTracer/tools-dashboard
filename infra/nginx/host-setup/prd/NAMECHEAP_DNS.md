# Namecheap DNS — datawork.top → VPS

**Target IPv4 (verify on VPS first):** run `curl -4 -s ifconfig.me` on the VPS. Expected from inventory: `169.58.4.85`.

## Advanced DNS records

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | `tools` | VPS public IPv4 | 300 (raise later) |
| A | `s3` | same | 300 |
| A | `www` | same | 300 |
| A | `@` | same | 300 (only if apex should hit this VPS) |

Optional: URL Redirect record for `@` → `https://tools.datawork.top` instead of an A record.

## Propagate check

```bash
dig +short tools.datawork.top A
dig +short s3.datawork.top A
dig +short www.datawork.top A
```

All three must return the VPS IP before Certbot.
