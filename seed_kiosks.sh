#!/bin/bash
echo "Starting kiosk registration..."
for i in {1..20}
do
   # Generate random MAC address
   MAC=$(openssl rand -hex 6 | sed 's/\(..\)/\1:/g; s/:$//' | tr '[:lower:]' '[:upper:]')
   echo "[$i/20] Registering MAC: $MAC"
   curl -s -X POST http://localhost:8080/api/v1/hardware/register \
     -H "Content-Type: application/json" \
     -d "{\"macId\": \"$MAC\"}"
   echo ""
done
echo "Seeding completed."
