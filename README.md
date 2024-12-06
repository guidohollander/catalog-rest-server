## Catalog REST server - Getting Started

First, cd into the catalog-rest-server folder with a terminal client and install the necessary dependencies. This downloads any dependencies which are put into the node_module folder. This folder is ignored by svn, so these files will not and don't have to be committed. 

```
cd <drive>:<workspace>\Service catalog\src\nodejs\catalog-rest-server <enter>
npm install <enter>
```

To start development, install the latest visual studio code, do the above and type

```
code . <enter>
open server.ts (for example)
press ctrl - ~ to open a terminal and type
npm run dev <enter>
```


To just run the server:

```
npm run server <enter>
```


## Docker Deployment

### Prerequisites
- Docker
- Docker Compose
- Subversion (optional, pre-installed in Docker image)

### Production Deployment
1. Copy `.env.example` to `.env` and fill in your configuration
2. Build and run the production container:
   ```bash
   docker-compose up -d
   ```

### Development Deployment
1. Copy `.env.example` to `.env` and fill in your configuration
2. Run the development container with hot reloading:
   ```bash
   docker-compose up dev
   ```

### Subversion Configuration
- The Docker image includes Subversion pre-installed
- Ensure SVN credentials are correctly set in the `.env` file
- SVN commands are executed within the container environment

### Useful Commands
- Stop containers: `docker-compose down`
- Rebuild containers: `docker-compose up --build`
- View logs: `docker-compose logs catalog-rest-server`
