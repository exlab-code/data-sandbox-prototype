#!/bin/bash

# This script rebuilds and restarts the deployer service

echo "Stopping deployer service..."
cd /opt/deployer
docker compose down

echo "Rebuilding deployer service..."
docker compose build

echo "Starting deployer service..."
docker compose up -d

echo "Deployer service restarted."
