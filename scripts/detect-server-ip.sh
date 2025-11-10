#!/bin/bash
# Auto-detect server IP and update docker-compose.yml

set -e

echo "Detecting server IP address..."

# Try to detect the primary network interface IP
SERVER_IP=$(hostname -I | awk '{print $1}')

# Alternative methods if hostname -I doesn't work
if [ -z "$SERVER_IP" ]; then
    SERVER_IP=$(ip route get 8.8.8.8 | awk '{print $7; exit}')
fi

if [ -z "$SERVER_IP" ]; then
    SERVER_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
fi

if [ -z "$SERVER_IP" ]; then
    echo "ERROR: Could not detect server IP automatically"
    echo "Please set SERVER_IP environment variable or edit docker-compose.yml manually"
    exit 1
fi

echo "Detected server IP: $SERVER_IP"
echo ""

# Update docker-compose.yml with detected IP
if [ -f "docker-compose.yml" ]; then
    # Update CORS_ORIGINS to include detected IP
    sed -i "s|http://172.23.19.78:3000|http://${SERVER_IP}:3000|g" docker-compose.yml
    
    # Update dashboard API URL
    sed -i "s|http://172.23.19.78:8000|http://${SERVER_IP}:8000|g" docker-compose.yml
    
    echo "Updated docker-compose.yml with server IP: $SERVER_IP"
    echo ""
    echo "Next steps:"
    echo "1. Review docker-compose.yml to verify the IP is correct"
    echo "2. Run: docker compose up -d"
    echo ""
    echo "For agents, use this server URL:"
    echo "  http://${SERVER_IP}:8000/api/v1"
else
    echo "ERROR: docker-compose.yml not found"
    exit 1
fi

