#!/bin/bash
# Stop development environment

echo "🛑 Stopping Tools Dashboard development environment..."
echo ""

docker compose -f docker-compose.dev.yml down

echo ""
echo "✅ All services stopped!"
echo ""
echo "To start again:      ./start-dev.sh"
echo "To restart services: ./restart-dev.sh"
echo "To reset databases:  ./reset-dev.sh  ⚠️  (deletes all data)"
echo ""
