# AWS EC2 Deployment

This directory contains AWS deployment configuration for the Catalog REST Server using EC2.

## Components

1. **EC2 Instance**
   - Runs both the application and Nginx
   - Uses Docker for containerization
   - Cost-effective single instance setup

2. **Docker Compose**
   - Manages application containers
   - Handles container networking
   - Automatic container restart

3. **SSL/TLS (Optional)**
   - Can use Let's Encrypt for free SSL certificates
   - Automatic certificate renewal
   - Managed through Certbot

## Deployment Steps

1. Configure EC2 instance:
   ```bash
   # Install Docker and Docker Compose
   sudo yum update -y
   sudo yum install -y docker
   sudo service docker start
   sudo usermod -a -G docker ec2-user
   ```

2. Deploy application:
   ```bash
   ./scripts/deploy-aws-ec2.sh
   ```

3. (Optional) Set up SSL:
   ```bash
   sudo certbot certonly --standalone -d your-domain.com
   ```

## Configuration Files

- `docker-compose.aws.yml`: Docker Compose configuration for AWS
- `nginx.aws.conf`: Nginx configuration for production
- `scripts/deploy-aws-ec2.sh`: Deployment script

## Monitoring

- Check application logs:
  ```bash
  docker logs catalog-rest-server
  ```
- Check Nginx logs:
  ```bash
  docker logs nginx
  ```
