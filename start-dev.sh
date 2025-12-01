#!/bin/bash
# Start development environment - databases auto-initialize via docker compose

set -e  # Exit on any error

echo "🚀 Starting Tools Dashboard development environment..."
echo ""
echo "This will:"
echo "  1. Start PostgreSQL, Cassandra, and Redis"
echo "  2. Wait for databases to be healthy"
echo "  3. Auto-initialize database schemas"
echo "  4. Start all application services"
echo ""

# Start all services - docker compose handles initialization order via depends_on
echo "Starting containers..."
docker compose -f docker-compose.dev.yml up -d

echo ""
echo "⏳ Services are starting in background..."
echo "   You can monitor progress with: docker compose -f docker-compose.dev.yml logs -f"
echo ""
echo "⏳ Waiting for all services to be ready (this may take 1-2 minutes)..."
echo ""

# Wait for back-auth to be healthy (indicates all dependencies are ready)
max_attempts=60
attempt=0
while ! curl -s http://localhost:8101/health > /dev/null 2>&1; do
  if [ $attempt -ge $max_attempts ]; then
    echo ""
    echo "⚠️  Timeout waiting for authentication service to be ready"
    echo ""
    echo "Check service status:"
    docker compose -f docker-compose.dev.yml ps
    echo ""
    echo "Check logs for errors:"
    echo "  docker compose -f docker-compose.dev.yml logs back-auth"
    exit 1
  fi

  # Show progress every 5 seconds
  if [ $((attempt % 5)) -eq 0 ]; then
    echo -n "  [${attempt}s] Waiting for authentication service"
  fi
  echo -n "."

  sleep 1
  attempt=$((attempt + 1))
done

echo ""
echo ""
echo "✅ Development environment ready!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📱 Application Services:"
echo "   Public App:       http://localhost:8082/app/"
echo "   Admin Dashboard:  http://localhost:8082/admin/"
echo "   API Gateway:      http://localhost:8082"
echo ""
echo "🔧 Backend Services:"
echo "   Auth API:         http://localhost:8101"
echo "   Main API:         http://localhost:8100"
echo "   WebSockets:       http://localhost:8102"
echo "   Feature Registry: http://localhost:8105"
echo ""
echo "🗄️  Database Services:"
echo "   PostgreSQL:  localhost:55432 (user: user, db: main_db)"
echo "   Cassandra:   localhost:39142 (keyspace: tools_dashboard)"
echo "   Redis:       localhost:6380"
echo ""
echo "📧 Development Tools:"
echo "   MailHog:     http://localhost:8026"
echo "   SeaweedFS:   http://localhost:8333 (S3), http://localhost:9333 (Master)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Useful commands:"
echo "   View all logs:        docker compose -f docker-compose.dev.yml logs -f"
echo "   View specific logs:   docker compose -f docker-compose.dev.yml logs -f <service-name>"
echo "   Service status:       docker compose -f docker-compose.dev.yml ps"
echo ""
echo "   Stop services:        ./stop-dev.sh"
echo "   Restart services:     ./restart-dev.sh"
echo "   Reset databases:      ./reset-dev.sh  ⚠️  (deletes all data)"
echo ""
echo "🔧 Database access:"
echo "   PostgreSQL CLI:  psql -h localhost -p 55432 -U user -d main_db"
echo "   Cassandra CLI:   docker exec -it tools-dashboard-cassandra-1 cqlsh"
echo "   Redis CLI:       docker exec -it tools-dashboard-redis-1 redis-cli"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
