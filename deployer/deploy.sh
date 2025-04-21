#!/bin/bash

APP_NAME="$1-$2"
APP_TYPE="$2"
TEMPLATE_DIR="/app/templates"
TARGET_DIR="/opt/instances/$APP_NAME"
SUBDOMAIN="$1"

echo "🚀 Creating instance: $APP_NAME"

# Check input
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./deploy.sh <projectName> <appType>"
  exit 1
fi

# Create target folder
mkdir -p "$TARGET_DIR"

# Copy correct template
cp "$TEMPLATE_DIR/$APP_TYPE.yml" "$TARGET_DIR/docker-compose.yml"

# Replace placeholders
sed -i "s/{{APP_NAME}}/$APP_NAME/g" "$TARGET_DIR/docker-compose.yml"
sed -i "s/{{SUBDOMAIN}}/$SUBDOMAIN/g" "$TARGET_DIR/docker-compose.yml"

# Launch app
cd "$TARGET_DIR"
docker-compose up -d
