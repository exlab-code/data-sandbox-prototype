#!/bin/bash

APP_NAME="$1-$2"
APP_TYPE="$2"
TEMPLATE_DIR="/app/templates"
TARGET_DIR="/opt/instances/$APP_NAME"
SUBDOMAIN="$1"

echo "🚀 Erstelle Instanz: $APP_NAME"

# Check input
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Verwendung: ./deploy.sh <projectName> <appType>"
  exit 1
fi

# Check if appType is valid
if [ "$APP_TYPE" != "metabase" ] && [ "$APP_TYPE" != "grafana" ] && [ "$APP_TYPE" != "lightdash" ]; then
  echo "Fehler: Ungültiger App-Typ. Muss 'metabase', 'grafana' oder 'lightdash' sein."
  exit 1
fi

# Check if subdomain is already in use
if [ -d "/opt/instances/$1-metabase" ] || [ -d "/opt/instances/$1-grafana" ] || [ -d "/opt/instances/$1-lightdash" ]; then
  echo "Fehler: Subdomain '$1' ist bereits in Verwendung."
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
echo "📦 Starte $APP_TYPE Container als $APP_NAME..."
cd "$TARGET_DIR"

# Check if docker-compose exists at the specified path
if [ ! -f "docker-compose.yml" ]; then
  echo "Fehler: docker-compose.yml nicht gefunden in $TARGET_DIR"
  exit 1
fi

# Pull images first to avoid timeout issues
docker-compose pull

# Start the container with docker-compose
docker-compose up -d

# Check if the container was created
if [ $? -ne 0 ]; then
  echo "Fehler: Container konnte nicht gestartet werden."
  exit 1
fi

echo "✅ Bereitstellung erfolgreich gestartet!"
echo "🔗 Anwendung wird verfügbar sein unter: https://$SUBDOMAIN.ex-lab.de"
echo "⏳ Bitte warte einige Minuten, bis die Anwendung vollständig initialisiert ist."

exit 0