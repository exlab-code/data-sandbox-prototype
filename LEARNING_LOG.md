# Learning Log

A collection of insights and learnings from working on the Data Sandbox project, organized by topic.

## Docker & Containerization

- **Container Isolation**: Each container runs in its own isolated environment, which helps avoid conflicts between applications and their dependencies.
- **Resource Limits**: You can limit CPU and memory usage for containers to prevent one container from consuming all resources (e.g., `cpus: '2'` in docker-compose.yml).
- **Container Networking**: Containers on the same Docker network can communicate with each other using their service names as hostnames.
- **Volume Mounting**: You can share files between the host and containers using volumes, which is useful for configuration files and persistent data.
- **Container Restart**: Restarting a container (`docker restart`) doesn't apply changes to environment variables or labels - you need to recreate the container (`docker-compose down && docker-compose up -d`).

## Traefik as a Reverse Proxy

- **Automatic Routing**: Traefik can automatically discover services and route traffic to them based on labels in docker-compose.yml.
- **Path-Based Routing**: You can route traffic based on URL paths (e.g., `/deploy`, `/status/`) using the `PathPrefix` rule.
- **Host-Based Routing**: You can route traffic based on the hostname (e.g., `dashboard.ex-lab.de`, `*.ex-lab.de`) using the `Host` rule.
- **Combining Rules**: You can combine routing rules with logical operators (e.g., `Host(...) && PathPrefix(...)`).
- **Labels for Configuration**: Traefik uses Docker labels for configuration, which keeps the configuration close to the service definition.

## SSL Certificates & Let's Encrypt

- **Rate Limits**: Let's Encrypt has a rate limit of 50 certificates per registered domain per week (168 hours).
- **Wildcard Certificates**: You can use a wildcard certificate (`*.example.com`) to cover all subdomains, which helps avoid rate limits.
- **HTTP Challenge**: The HTTP-01 challenge verifies domain ownership by placing a file at a specific URL, which is simpler but doesn't work for wildcard certificates.
- **DNS Challenge**: The DNS-01 challenge verifies domain ownership by creating a TXT record in DNS, which is required for wildcard certificates.
- **Staging Environment**: Let's Encrypt provides a staging environment with higher rate limits for testing, but certificates aren't trusted by browsers.
- **Certificate Storage**: Traefik stores certificates in an acme.json file, which you might need to delete to force certificate renewal.

## DNS Configuration

- **API Tokens**: DNS providers like Hetzner require API tokens for programmatic access to DNS records.
- **Different Services**: Hetzner Cloud and Hetzner DNS Console are different services with separate authentication systems.
- **DNS Propagation**: DNS changes can take time to propagate, which can affect the DNS challenge for Let's Encrypt.
- **Wildcard DNS**: A wildcard DNS record (`*.example.com`) can route all subdomain traffic to the same server, which works well with wildcard certificates.

## API Authentication

- **API Tokens**: API tokens provide a way to authenticate with APIs without using username/password credentials.
- **Token Permissions**: API tokens can have different permission levels (read-only, read-write, etc.).
- **Token Security**: API tokens should be kept secure and not committed to version control.
- **Environment Variables**: Storing API tokens in environment variables is a common practice for security.

## Web Development

### Svelte

- **Reactive Declarations**: Svelte automatically updates the DOM when component state changes.
- **Component Lifecycle**: Svelte provides lifecycle hooks like `onMount` and `onDestroy` for running code at specific times.
- **Event Handling**: Svelte uses a simple syntax for event handling (`on:click={handleClick}`).
- **Conditional Rendering**: You can conditionally render elements using `{#if}...{/if}` blocks.
- **Loops**: You can render lists using `{#each}...{/each}` blocks.

### Flask

- **Route Parameters**: Flask can extract parameters from URLs using `<parameter_name>` syntax.
- **JSON Responses**: Flask can return JSON responses using `jsonify()`.
- **Cross-Origin Resource Sharing**: Flask-CORS can handle CORS headers for cross-origin requests.
- **Background Threads**: Flask can run background tasks using Python's threading module.
- **Static File Serving**: Flask can serve static files from a specified directory.

## Deployment Strategies

- **Docker Compose**: Docker Compose is a simple way to define and run multi-container applications.
- **Health Checks**: Health checks ensure that a container is running correctly before marking it as ready.
- **Rolling Updates**: You can update services without downtime by updating one container at a time.
- **Environment-Specific Configuration**: You can use different configuration files for different environments (development, staging, production).
- **Automated Deployment**: Scripts can automate the deployment process, making it more reliable and repeatable.

## Troubleshooting

- **Container Logs**: Docker logs (`docker logs container_name`) are invaluable for troubleshooting container issues.
- **Network Inspection**: You can inspect Docker networks (`docker network inspect network_name`) to see which containers are connected.
- **Direct Container Access**: You can execute commands inside a container (`docker exec -it container_name command`) to troubleshoot from within.
- **API Testing**: You can test APIs directly (`curl http://localhost:5000/endpoint`) to isolate issues.
- **Incremental Changes**: Making small, incremental changes makes it easier to identify and fix issues.

## Security

- **HTTPS Everywhere**: Using HTTPS for all traffic helps protect data in transit.
- **API Token Security**: API tokens should be kept secure and rotated regularly.
- **Container Isolation**: Containers provide a level of isolation, but they're not a complete security solution.
- **Resource Limits**: Setting resource limits prevents denial-of-service attacks from resource exhaustion.
- **Least Privilege**: Containers and services should run with the least privileges necessary.
