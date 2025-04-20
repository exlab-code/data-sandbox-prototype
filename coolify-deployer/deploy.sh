#!/bin/bash
#
# Automated Deployment Script for Analytics Applications
# This script handles the deployment of applications via Docker Compose
#
# Usage: ./deploy.sh <username> <app>
#
# Example: ./deploy.sh user1 metabase

# Enable debugging
set -x

# Exit on any error
set -e

# Configuration
DOMAIN="ex-lab.de"
FRONTEND_DOMAIN="datasandbox.ex-lab.de"
TEMPLATES_DIR="/opt/coolify-deployer/templates"  # Directory containing Docker Compose templates
DEPLOYMENTS_DIR="/opt/coolify-deployer/deployments"  # Directory to store deployment configurations

# Log file
LOG_FILE="/var/log/coolify-deployer.log"
DETAILED_LOG_DIR="/var/log/coolify-deployer"

# Ensure required directories exist
mkdir -p "$DEPLOYMENTS_DIR"
mkdir -p "$DETAILED_LOG_DIR"
mkdir -p "$(dirname $LOG_FILE)"

# Function to log messages
log() {
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] $1" | tee -a "$LOG_FILE"
}

# Function to check if a username is valid
validate_username() {
    local username="$1"
    
    log "Validating username: $username"
    
    # Check if username is alphanumeric + underscore, 3-30 chars
    if [[ ! "$username" =~ ^[a-zA-Z0-9_]{3,30}$ ]]; then
        log "ERROR: Invalid username format. Must be 3-30 alphanumeric characters or underscores."
        exit 1
    fi
    
    log "Username validation successful"
}

# Function to check if an app is supported
validate_app() {
    local app="$1"
    
    log "Validating app: $app"
    
    # Convert to lowercase
    app=$(echo "$app" | tr '[:upper:]' '[:lower:]')
    
    # Check if app is supported
    case "$app" in
        metabase|superset)
            # App is supported
            log "App validation successful: $app is supported"
            ;;
        *)
            log "ERROR: Unsupported application: $app"
            exit 1
            ;;
    esac
}

# Function to check if a subdomain already exists
check_subdomain() {
    local username="$1"
    local subdomain="${username}.${DOMAIN}"
    
    log "Checking if subdomain $subdomain already exists"
    
    # Check if the subdomain already exists
    if [ -d "$DEPLOYMENTS_DIR/$username" ]; then
        log "WARNING: Deployment directory for $subdomain already exists"
        # Don't exit, just warn - we'll overwrite
    else
        log "Subdomain check passed: $subdomain is available"
    fi
}

# Function to deploy Metabase
deploy_metabase() {
    local username="$1"
    local subdomain="${username}.${DOMAIN}"
    local deploy_dir="$DEPLOYMENTS_DIR/$username"
    local deploy_log="$DETAILED_LOG_DIR/metabase-${username}.log"
    
    log "Deploying Metabase for $username at $subdomain"
    
    # Create deployment directory
    mkdir -p "$deploy_dir"
    log "Created deployment directory: $deploy_dir"
    
    # Copy Metabase template
    cp "$TEMPLATES_DIR/metabase.yml" "$deploy_dir/docker-compose.yml"
    log "Copied Metabase template to $deploy_dir/docker-compose.yml"
    
    # Replace placeholders in the template
    sed -i "s/{{USERNAME}}/$username/g" "$deploy_dir/docker-compose.yml"
    sed -i "s/{{SUBDOMAIN}}/$subdomain/g" "$deploy_dir/docker-compose.yml"
    log "Replaced placeholders in template with username=$username, subdomain=$subdomain"
    
    # Log the final docker-compose.yml content
    log "Final docker-compose.yml content:"
    cat "$deploy_dir/docker-compose.yml" | tee -a "$deploy_log"
    
    # Deploy with Docker Compose
    log "Starting Metabase containers for $username"
    (
        cd "$deploy_dir" 
        # Use docker command directly instead of docker-compose
        docker compose up -d 2>&1 | tee -a "$deploy_log"
        if [ ${PIPESTATUS[0]} -ne 0 ]; then
            log "ERROR: Docker compose failed. Check $deploy_log for details."
            exit 1
        fi
    )
    
    # Check if containers are running
    log "Checking if Metabase containers are running"
    docker ps | grep "metabase-$username" | tee -a "$deploy_log"
    
    log "Metabase deployed successfully for $username at https://$subdomain"
}

# Function to deploy Apache Superset
deploy_superset() {
    local username="$1"
    local subdomain="${username}.${DOMAIN}"
    local deploy_dir="$DEPLOYMENTS_DIR/$username"
    local deploy_log="$DETAILED_LOG_DIR/superset-${username}.log"
    
    log "Deploying Apache Superset for $username at $subdomain"
    
    # Create deployment directory
    mkdir -p "$deploy_dir"
    log "Created deployment directory: $deploy_dir"
    
    # Copy Superset template
    cp "$TEMPLATES_DIR/superset.yml" "$deploy_dir/docker-compose.yml"
    log "Copied Superset template to $deploy_dir/docker-compose.yml"
    
    # Create initial admin credentials
    # Generate a random password for the admin user
    local admin_password=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9')
    
    # Store the password (in a production environment, use a secure storage solution)
    echo "$admin_password" > "$deploy_dir/admin_password.txt"
    chmod 600 "$deploy_dir/admin_password.txt"
    log "Generated admin password and stored in $deploy_dir/admin_password.txt"
    
    # Copy and prepare the init script
    cp "$TEMPLATES_DIR/superset-init.sh" "$deploy_dir/superset-init-$username.sh"
    chmod +x "$deploy_dir/superset-init-$username.sh"
    log "Copied and prepared init script at $deploy_dir/superset-init-$username.sh"
    
    # Replace placeholders in the template and init script
    sed -i "s/{{USERNAME}}/$username/g" "$deploy_dir/docker-compose.yml"
    sed -i "s/{{SUBDOMAIN}}/$subdomain/g" "$deploy_dir/docker-compose.yml"
    sed -i "s/{{ADMIN_PASSWORD}}/$admin_password/g" "$deploy_dir/superset-init-$username.sh"
    log "Replaced placeholders in templates with username=$username, subdomain=$subdomain"
    
    # Log the final docker-compose.yml content
    log "Final docker-compose.yml content:"
    cat "$deploy_dir/docker-compose.yml" | tee -a "$deploy_log"
    
    # Log the init script content
    log "Init script content:"
    cat "$deploy_dir/superset-init-$username.sh" | tee -a "$deploy_log"
    
    # Deploy with Docker Compose
    log "Starting Apache Superset containers for $username"
    (
        cd "$deploy_dir" 
        # Use docker command directly instead of docker-compose
        docker compose up -d 2>&1 | tee -a "$deploy_log"
        if [ ${PIPESTATUS[0]} -ne 0 ]; then
            log "ERROR: Docker compose failed. Check $deploy_log for details."
            exit 1
        fi
    )
    
    # Check if containers are running
    log "Checking if Superset containers are running"
    docker ps | grep -E "superset-.*-$username" | tee -a "$deploy_log"
    
    log "Apache Superset deployed successfully for $username at https://$subdomain"
    log "Initial admin credentials: username=admin, password=$admin_password"
}

# Main function
main() {
    # Check if correct number of arguments provided
    if [ $# -ne 2 ]; then
        log "ERROR: Incorrect number of arguments"
        echo "Usage: $0 <username> <app>"
        exit 1
    fi
    
    local username="$1"
    local app=$(echo "$2" | tr '[:upper:]' '[:lower:]')  # Convert to lowercase
    
    log "===================================================="
    log "Starting deployment process for $username, app: $app"
    log "===================================================="
    
    # Validate inputs
    validate_username "$username"
    validate_app "$app"
    
    # Check if subdomain is available
    check_subdomain "$username"
    
    # Deploy the requested application
    case "$app" in
        metabase)
            deploy_metabase "$username"
            ;;
        superset)
            deploy_superset "$username"
            ;;
    esac
    
    log "Deployment completed successfully for $username ($app)"
    log "===================================================="
    exit 0
}

# Run the main function
main "$@"
