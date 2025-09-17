# service catalog REST server

A modern REST API server built with Next.js that provides a central hub for managing services, repositories, and build information. This server interfaces with SVN repositories and Jenkins to provide a unified service catalog management solution.

## Goals

- Provide a centralized REST API for service catalog management
- Interface with SVN repositories for version control
- Integrate with Jenkins for build management
- Offer a modern web interface for service monitoring
- Enable automated service deployment and management

## Features

- SVN Repository Management
- Jenkins Build Integration
- Health Monitoring
- Service Version Control
- Automated Deployment Support

## API Routes

### Health Endpoints
- `GET /api/health` - Server health check
- `GET /api/svn/health` - SVN connection health check

### SVN Endpoints
- `GET /api/svn/repositories` - List available repositories
- `GET /api/svn/exists` - Check if a repository exists
- `POST /api/svn/copy` - Create repository copy
- `GET /api/svn/bulk-exists` - Batch check repository existence
- `GET /api/svn/existing_component_versions` - List component versions
- `GET /api/svn/existing_solution_implementations` - List solution implementations
- `GET /api/svn/latest-revision` - Get latest revision info
- `POST /api/svn/propset` - Set repository properties
- `POST /api/svn/reset` - Reset repository state

### Jenkins Endpoints
- `GET /api/jenkins/builds` - List builds
- `POST /api/jenkins/build` - Trigger new build
- `GET /api/jenkins/ping` - Check Jenkins connectivity

## Installation

### Prerequisites
- Node.js 20 or higher
- Docker and Docker Compose (for containerized deployment)
- SVN client (pre-installed in Docker image)
- Access to SVN and Jenkins servers

### Local Development Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd catalog-rest-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

4. Configure the following in your `.env` file:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # SVN Configuration
   SVN_URL=https://your-svn-server
   SVN_USERNAME=your-username
   SVN_PASSWORD=your-password

   # Jenkins Configuration
   JENKINS_URL=https://your-jenkins-server
   JENKINS_USERNAME=your-username
   JENKINS_API_TOKEN=your-api-token
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

### Docker Deployment

1. Production deployment:
   ```bash
   docker-compose up -d
   ```

2. Development deployment with hot reloading:
   ```bash
   docker-compose up dev
   ```

## API Keys and Authentication

### Required API Keys
- Jenkins API Token (for Jenkins integration)
- SVN credentials (for repository access)

### Setting Up Authentication
1. Generate a Jenkins API token:
   - Log into Jenkins
   - Click your username → Configure
   - Add new API Token
   - Copy the token to your `.env` file

2. Configure SVN credentials:
   - Use your SVN username and password
   - Or set up SSH keys for authentication
   - Update credentials in `.env` file

## Deployment

This project supports both local Docker server deployment and AWS cloud deployment with automated CI/CD pipeline.

### Deployment Environments

#### Production URLs
- **Public**: `https://catalog-rest.hollanderconsulting.nl` (AWS)
- **Local**: `http://192.168.1.152:3000` (Local Docker)
- **Registry**: `registry.hollanderconsulting.nl` (Docker Registry)

#### Environment Configuration
- **Local**: Uses local Docker images with `PULL_POLICY=never`
- **AWS**: Uses registry images pulled from `registry.hollanderconsulting.nl`
- **Both**: Builds locally and pushes to registry for AWS deployment

### Deployment Commands

#### Local Docker Server Deployment
```bash
./scripts/deploy-all.ps1 -Environment local
```
- Builds Docker image locally on `192.168.1.152`
- Uses local images (no registry pull)
- Clears Docker build cache for fresh builds
- Accessible at `http://192.168.1.152:3000`

#### AWS Cloud Deployment
```bash
./scripts/deploy-all.ps1 -Environment aws
```
- Builds and pushes to `registry.hollanderconsulting.nl`
- Deploys to AWS EC2: `ec2-13-222-238-100.compute-1.amazonaws.com`
- Uses Cloudflare proxy for SSL and DNS
- Accessible at `https://catalog-rest.hollanderconsulting.nl`

#### Both Environments
```bash
./scripts/deploy-all.ps1 -Environment both
```
- Deploys to both local and AWS simultaneously
- Builds once, deploys everywhere

### AWS Configuration

#### Prerequisites
- AWS EC2 instance running Docker
- PEM key file: `.\aws\keys\service-catalog-rest-api.pem`
- Cloudflare DNS pointing to AWS IP: `13.222.238.100`

#### Key Files
- **Docker Compose**: `docker-compose.aws.yml` (with nginx proxy)
- **PEM Key**: `.\aws\keys\service-catalog-rest-api.pem` (SSH access)
- **Infrastructure**: `.\aws\infrastructure.yaml` (CloudFormation)

### Docker Registry

#### Registry Details
- **URL**: `registry.hollanderconsulting.nl`
- **Images**: Versioned as `v0.1.x` and `latest`
- **Access**: Local Docker server can push/pull images
- **AWS Integration**: EC2 pulls images during deployment

#### Registry Commands
```bash
# Manual push to registry
docker push registry.hollanderconsulting.nl/catalog-rest-server:v0.1.x

# Manual pull from registry  
docker pull registry.hollanderconsulting.nl/catalog-rest-server:v0.1.x
```

### Version Management

#### Automatic Versioning
- Version auto-increments patch number (0.1.x)
- Updates `package.json` during deployment
- Version visible in HTML comment: `<!--0.1.x-->`
- Git commits include version in commit message

#### Version Tracking
- **Local**: Check `http://192.168.1.152:3000` source
- **AWS**: Check `https://catalog-rest.hollanderconsulting.nl` source
- **Registry**: `docker images | grep catalog-rest-server`

### Troubleshooting

#### Common Issues Fixed
1. **Docker Build Cache**: Cleared with `docker builder prune -af`
2. **Manifest Errors**: Fixed with `PULL_POLICY=never` for local
3. **PEM Permissions**: Fixed with `icacls` command
4. **Registry Access**: Verified push/pull functionality

#### Health Checks
```bash
# Check local deployment
curl http://192.168.1.152:3000/api/health

# Check AWS deployment  
curl https://catalog-rest.hollanderconsulting.nl/api/health

# Check registry connectivity
docker pull registry.hollanderconsulting.nl/catalog-rest-server:latest
```

### Database Diagram Feature

#### Access Points
- **Local**: `http://192.168.1.152:3000/database-diagram`
- **AWS**: `https://catalog-rest.hollanderconsulting.nl/database-diagram`

#### Features
- Table schema visualization
- Sample data display (TOP 5 rows)
- Navigation anchors for large schemas
- Filtered views (excludes mvw_svn_% and mvw_jenkins_%)
- No authentication required (excluded from auth middleware)
- **dbdiagram.io Integration**: One-click open in online DBML editor

#### Database Caching System

**Hybrid Database Access:**
- **Local Network**: Connects to live database + caches results
- **AWS Deployment**: Tries live database first, falls back to cached data
- **Automatic Fallback**: Uses cached data when database is unreachable

**Cache Management:**
```bash
# Check cache status
curl http://192.168.1.152:3000/api/database-cache

# Force refresh cache from live database
curl -X POST http://192.168.1.152:3000/api/database-cache \
  -H "Content-Type: application/json" \
  -d '{"action": "refresh"}'

# Get schema with force refresh
curl http://192.168.1.152:3000/api/database-schema?refresh=true
```

**Cache Features:**
- **24-hour cache expiry** (configurable)
- **Automatic cache creation** on successful database queries
- **Cache status indicators** in UI (🟢 Live, 🟡 Cached, 🔴 Error)
- **Force refresh button** to update from live database
- **Cache age display** shows how old cached data is
- **Persistent storage** in `./cache/database-schema.json`

**UI Controls:**
- **Refresh**: Uses cached data or live database (smart)
- **Force Refresh**: Always attempts live database connection
- **Cache Status**: Shows data source and cache age
- **Auto-refresh**: Periodic updates (respects cache logic)

### Docker Configuration
- **Base Image**: Node.js 20-slim with SVN client
- **Build Args**: VERSION passed for version display
- **Nginx**: Reverse proxy for AWS deployment
- **SSL**: Handled by Cloudflare for public access
- **Logs**: Persistent logging with file transports

## License

This project is proprietary software. All rights reserved.
