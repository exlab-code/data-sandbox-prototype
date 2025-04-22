#!/bin/bash

# This script copies the dbt_demo directory to the server

# Ensure the target directory exists
mkdir -p /opt/deployer/dbt_demo

# Copy the dbt_demo files
cp -r /app/dbt_demo/* /opt/deployer/dbt_demo/

# Set appropriate permissions
chmod -R 755 /opt/deployer/dbt_demo

echo "dbt_demo directory copied to /opt/deployer/dbt_demo"
