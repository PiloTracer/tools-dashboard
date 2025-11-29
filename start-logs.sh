#!/bin/bash
# Stream logs from all running Tools Dashboard containers

echo "📋 Streaming logs from all running containers..."
echo "   Press Ctrl+C to stop log streaming"
echo ""

# Use docker compose to follow logs for all services
docker compose -f docker-compose.dev.yml logs -f --tail=100