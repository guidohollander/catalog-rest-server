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

### Docker Server Deployment
```bash
./scripts/deploy-all.ps1 -Environment local
```

### AWS Deployment
```bash
./scripts/deploy-aws.ps1
```

### Docker Configuration
- Uses Node.js 20-slim base image
- Includes pre-installed SVN client
- Nginx reverse proxy for production
- Automatic SSL termination

## License

This project is proprietary software. All rights reserved.
