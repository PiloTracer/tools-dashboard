Pruning dangling anonymous volumes...
Waiting for back-auth to become healthy (up to 120s)...
Auth service is healthy.

✅ Stack is up (TD_ENV=dev) — open in your browser (replace localhost with your host if remote)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  BROWSER URLS (local)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

— Primary entry: nginx (use these for normal work) —
  http://localhost/                    same as :80
  http://localhost:8082/               alternate HTTP → nginx :80
  https://localhost:8443/              HTTPS port → nginx :443 (needs TLS in nginx to be useful)

— Apps & API (via nginx on port 80 or 8082; paths are identical) —
  Public app:     http://localhost/app/          http://localhost:8082/app/
  Admin app:      http://localhost/admin/       http://localhost:8082/admin/
  Main API:       http://localhost/api/         http://localhost:8082/api/
  Auth API:       http://localhost/auth/        http://localhost:8082/auth/
  OAuth (Remix):  http://localhost/oauth/       http://localhost:8082/oauth/
  Well-known:     http://localhost/.well-known/ http://localhost:8082/.well-known/
  Public storage: http://localhost/storage/    http://localhost:8082/storage/
  WebSocket:      ws://localhost/ws/           ws://localhost:8082/ws/

— Remix dev servers (direct, bypass nginx) —
  Admin (Remix):  http://localhost:4100/admin/
  Public (Remix): http://localhost:4101/app/

— Backend HTTP (direct host ports; health / docs) —
  Main API:       http://localhost:8100/health   http://localhost:8100/docs
  Auth:           http://localhost:8101/health
  WebSockets:     http://localhost:8102/        (WebSocket upgrade; often used via /ws/ on nginx)
  Feature reg.:   http://localhost:8105/health

— Dev tools (browser) —
  MailHog UI:     http://localhost:8026/
  SeaweedFS S3:   http://localhost:8333/       (S3 API)
  Seaweed master: http://localhost:9333/
  Seaweed filer:  http://localhost:8888/

— Databases (clients / CLI, not a normal web page) —
  PostgreSQL:     localhost:55432  user=user  db=main_db
  Redis:          localhost:6380
  Cassandra CQL:  localhost:39142

— Stack commands —
  ./bin/start.sh dev logs   |  ./bin/start.sh dev down   |  ./bin/start.sh dev rebuild   |  ./bin/start.sh dev reset

— CLI into DB containers —
  docker compose -f docker-compose.dev.yml exec -it postgresql psql -U user -d main_db
  docker compose -f docker-compose.dev.yml exec -it redis redis-cli
  docker compose -f docker-compose.dev.yml exec -it cassandra cqlsh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━