# Data Sandbox Prototype

A platform for deploying data analysis tools with a single click, designed for GDPR-compliant deployments on German servers.

## Project Overview

The Data Sandbox Prototype is a platform that allows users to deploy various data analysis tools (Metabase, Grafana, and Lightdash) with a single click. It's designed to be GDPR-compliant with all data stored on German servers, specifically targeting German non-profit organizations.

The platform provides a simple web interface where users can:
1. Generate a unique project name
2. Select a data analysis tool to deploy
3. Deploy the selected tool with one click
4. Access the deployed tool via a unique subdomain (projectname.ex-lab.de)

## Architecture

The project consists of several key components:

### 1. Frontend
- Built with Svelte
- Provides a user-friendly interface for deploying data analysis tools
- Hosted using Nginx
- Accessible at dashboard.ex-lab.de

### 2. Deployer
- Backend API built with Flask
- Handles deployment requests from the frontend
- Manages container creation and monitoring
- Provides status updates during deployment

### 3. Traefik
- Reverse proxy that handles routing and SSL certificates
- Automatically generates Let's Encrypt SSL certificates
- Routes traffic to the appropriate containers based on subdomain

### 4. Templates
- Docker Compose templates for each supported application (Metabase, Grafana, Lightdash)
- Used by the deployer to create containers with the correct configuration

### 5. Instances
- Directory where deployed instances are stored
- Each instance has its own Docker Compose configuration

## Deployment Flow

1. User visits the frontend at dashboard.ex-lab.de
2. User is assigned a random project name (e.g., "cool-panda-123")
3. User selects an application to deploy (Metabase, Grafana, or Lightdash)
4. Frontend sends a deployment request to the backend
5. Backend:
   - Creates a directory for the instance
   - Copies the appropriate template
   - Replaces placeholders in the template
   - Starts the container using Docker Compose
6. Backend monitors the container health and provides status updates
7. Once the container is healthy, the user can access the deployed application at their unique subdomain (e.g., cool-panda-123.ex-lab.de)

## Supported Applications

### Metabase
- Simple analysis and visualization tool
- Accessible via the generated subdomain
- Uses the official Metabase Docker image

### Grafana
- Monitoring and observability platform
- Accessible via the generated subdomain
- Default credentials: admin/admin (user is prompted to change on first login)

### Lightdash
- Business intelligence tool for dbt users
- Accessible via the generated subdomain

## Technical Details

### Container Management
- Each deployed application runs in its own Docker container
- Containers are resource-limited (e.g., Metabase is limited to 2 CPU cores)
- Health checks ensure the application is running correctly

### Networking
- All containers are connected to an external "web" network
- Traefik handles routing based on subdomains
- All connections are secured with SSL certificates from Let's Encrypt

### Security
- GDPR-compliant with all data stored on German servers (Hetzner)
- Automatic SSL certificate generation and renewal
- Isolated containers for each deployment

## Project Structure

```
data-sandbox-prototype/
├── containerd/            # Container management component
│   ├── bin/
│   └── lib/
├── deployer/              # Backend deployment service
│   ├── backend.py         # Flask application for handling deployments
│   ├── deploy.sh          # Shell script for creating and starting containers
│   ├── docker-compose.yml # Docker Compose configuration for the deployer
│   ├── Dockerfile         # Docker image definition for the deployer
│   ├── requirements.txt   # Python dependencies
│   ├── public/            # Static files for the deployer frontend
│   └── templates/         # Docker Compose templates for applications
│       ├── grafana.yml
│       ├── lightdash.yml
│       ├── metabase.yml
│       └── —superset.yml
├── frontend/              # Svelte frontend application
│   ├── docker-compose.yml # Docker Compose configuration for the frontend
│   ├── nginx.conf         # Nginx configuration
│   ├── package.json       # NPM dependencies
│   ├── public/            # Static files
│   └── src/               # Source code
│       ├── App.svelte     # Main application component
│       ├── main.js        # Entry point
│       └── components/    # Reusable components
├── instances/             # Directory for deployed instances
└── traefik/               # Reverse proxy configuration
    ├── docker-compose.yml # Docker Compose configuration for Traefik
    ├── traefik.yml        # Traefik configuration
    └── letsencrypt/       # SSL certificates
```

## Development Setup

### Prerequisites
- Docker and Docker Compose
- Node.js and NPM (for frontend development)
- Python 3.11 (for backend development)

### Starting the Services

1. Start Traefik:
   ```bash
   cd traefik
   docker-compose up -d
   ```

2. Start the Frontend:
   ```bash
   cd frontend
   docker-compose up -d
   ```

3. Start the Deployer:
   ```bash
   cd deployer
   docker-compose up -d
   ```

### Local Development

For frontend development:
```bash
cd frontend
npm install
npm run dev
```

For backend development:
```bash
cd deployer
pip install -r requirements.txt
python backend.py
```

## Production Deployment

The project is designed to be deployed on a server with Docker and Docker Compose installed. The deployment process is similar to the development setup, but with production-specific configurations.

## License

This project is proprietary and not open for redistribution or modification without explicit permission.
