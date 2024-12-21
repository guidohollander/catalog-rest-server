#!/bin/bash

# Configuration
REGISTRY_URL="registry.hollanderconsulting.nl"
IMAGE_NAME="catalog-rest-server"
APP_CONTAINER_NAME="catalog-rest-server-catalog-rest-server-1"
NGINX_CONTAINER_NAME="catalog-rest-server-nginx-1"

# Build and push the Docker image
echo "Building and pushing Docker image..."
VERSION=${VERSION:-latest}
docker build --no-cache --build-arg VERSION=$VERSION -t $REGISTRY_URL/$IMAGE_NAME:v$VERSION .
docker push $REGISTRY_URL/$IMAGE_NAME:v$VERSION

# Show current status
echo "Current container status:"
sudo docker ps -a

# Stop and remove existing containers
echo "Stopping existing containers..."
sudo docker-compose down

# Copy nginx configuration
echo "Setting up nginx configuration..."
sudo mkdir -p /srv/nginx
sudo cp nginx/nginx.aws.conf /srv/nginx/nginx.conf
sudo chown -R ec2-user:ec2-user /srv/nginx

# Start containers with docker-compose
echo "Starting containers..."
sudo VERSION=$VERSION docker-compose up -d

# Wait for containers to start
echo "Waiting for containers to start..."
sleep 5

# Verify deployment
echo "Verifying deployment..."
echo "Application containers:"
sudo docker ps | grep -E "$APP_CONTAINER_NAME|$NGINX_CONTAINER_NAME"

echo "Nginx logs:"
sudo docker logs $NGINX_CONTAINER_NAME

echo "Application logs:"
sudo docker logs $APP_CONTAINER_NAME

echo "Deployment complete!"
echo "Your application should now be accessible at: https://catalog-rest.hollanderconsulting.nl"
