#!/bin/bash
# authenticate
AUTH_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"Admin1!"}')

echo "Auth Response: $AUTH_RESPONSE"

TOKEN=$(echo $AUTH_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "Error: Failed to get token"
    exit 1
fi

echo "Token: $TOKEN"

# Try to create a branch with CAR_WASH and boxCount 100 (likely failing)
echo "Creating branch..."
curl -v -X POST http://localhost:8080/api/v1/admin/branches \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Wash",
    "orgId": "69975b9ce38eda266bdb13f3", 
    "partnerType": "CAR_WASH",
    "boxCount": 100,
    "status": "OPEN"
  }'
