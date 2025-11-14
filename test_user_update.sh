#!/bin/bash

echo "Testing user update..."
echo ""

echo "1. GET user 2 before update:"
docker-compose -f docker-compose.dev.yml exec -T nginx-proxy wget -qO- http://back-api:8000/admin/users/2
echo ""
echo ""

echo "2. PUT update to user 2:"
docker-compose -f docker-compose.dev.yml exec -T nginx-proxy wget -qO- \
  --method=PUT \
  --header='Content-Type: application/json' \
  --body-data='{"email":"invoketheoracle@gmail.com","first_name":"John","last_name":"Doe"}' \
  http://back-api:8000/admin/users/2
echo ""
echo ""

echo "3. GET user 2 after update:"
docker-compose -f docker-compose.dev.yml exec -T nginx-proxy wget -qO- http://back-api:8000/admin/users/2
echo ""
