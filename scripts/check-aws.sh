#!/bin/bash

echo "=== Docker Container Status ==="
docker ps -a | grep catalog-rest-server

echo -e "\n=== Container Logs ==="
docker logs catalog-rest-server

echo -e "\n=== Container Port Status ==="
netstat -tulpn | grep :3000

echo -e "\n=== Environment Variables ==="
docker exec catalog-rest-server env
