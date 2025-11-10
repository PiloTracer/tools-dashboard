# Stack Operations

## Start (Development)
```bash
docker compose -f docker-compose.dev.yml up --build
```

## Start (Production-like)
```bash
docker compose -f docker-compose.prod.yml up --build
```

## Graceful Shutdown
```bash
docker compose -f docker-compose.dev.yml down
```
(Use the prod compose file in place of dev when appropriate.)

## Clear Services + Volumes (This stack only)
```bash
docker compose -f docker-compose.dev.yml down --volumes --remove-orphans
```
To purge production volumes:
```bash
docker compose -f docker-compose.prod.yml down --volumes --remove-orphans
```

## Useful Commands
- Tail logs for a service: `docker compose -f docker-compose.dev.yml logs -f back-api`
- Rebuild single service: `docker compose -f docker-compose.dev.yml up --build back-api`
- Check running containers: `docker compose -f docker-compose.dev.yml ps`

