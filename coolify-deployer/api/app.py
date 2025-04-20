import os
import re
import uuid
import json
import subprocess
import threading
from flask_cors import CORS
from datetime import datetime
from flask import Flask, request, jsonify


app = Flask(__name__)
CORS(app)

# In-memory storage for deployment statuses
# In a production environment, use a database
deployments = {}

# Configuration
DOMAIN = "ex-lab.de"
FRONTEND_DOMAIN = "datasandbox.ex-lab.de"
SUPPORTED_APPS = ["metabase", "superset"]
DEPLOYMENT_SCRIPT = "/opt/coolify-deployer/deploy.sh"

# Username validation
def validate_username(username):
    """Validate username format (3-30 alphanumeric characters or underscores)"""
    if not username:
        return False, "Username is required"
    
    pattern = re.compile(r'^[a-zA-Z0-9_]{3,30}$')
    if not pattern.match(username):
        return False, "Username must be 3-30 alphanumeric characters or underscores"
    
    # Check if username is already taken (in a production environment, check against a database)
    subdomain = f"{username}.{DOMAIN}"
    if is_subdomain_taken(username):
        return False, f"Username '{username}' is already taken"
    
    return True, None

def is_subdomain_taken(username):
    """Check if a subdomain is already taken"""
    # In production, check against actual subdomains or a database
    # For the MVP, simply check against our in-memory deployments
    for deployment_id, deployment in deployments.items():
        if deployment.get('username') == username:
            return True
            
    # Check if the subdomain is actually responding (existing deployment)
    # This is a simplified check - in production, use DNS queries
    try:
        result = subprocess.run(
            ["ping", "-c", "1", f"{username}.{DOMAIN}"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=2
        )
        return result.returncode == 0
    except:
        return False

def validate_app(app):
    """Validate the requested application"""
    if not app:
        return False, "Application is required"
    
    if app.lower() not in SUPPORTED_APPS:
        return False, f"Unsupported application. Supported applications: {', '.join(SUPPORTED_APPS)}"
    
    return True, None

def execute_deployment(deployment_id, username, app):
    """Execute the deployment script in a separate thread"""
    try:
        # Update deployment status
        deployments[deployment_id]['status'] = 'deploying'
        
        # Execute the deployment script
        result = subprocess.run(
            [DEPLOYMENT_SCRIPT, username, app.lower()],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        
        # Update deployment status
        deployments[deployment_id]['status'] = 'completed'
        deployments[deployment_id]['url'] = f"https://{username}.{DOMAIN}"
        deployments[deployment_id]['completed_at'] = datetime.now().isoformat()
        
    except subprocess.CalledProcessError as e:
        # Deployment failed
        deployments[deployment_id]['status'] = 'failed'
        deployments[deployment_id]['error'] = e.stderr or "Deployment script execution failed"
        
    except Exception as e:
        # Other errors
        deployments[deployment_id]['status'] = 'failed'
        deployments[deployment_id]['error'] = str(e)


@app.route('/api/deploy', methods=['POST'])
def deploy():
    """Handle deployment requests"""
    try:
        data = request.json
        
        if not data:
            return jsonify({"error": "Invalid request data"}), 400
        
        username = data.get('username', '').strip()
        app_name = data.get('app', '').strip()
        
        # Validate username
        is_valid, error = validate_username(username)
        if not is_valid:
            return jsonify({"error": error}), 400
        
        # Validate app
        is_valid, error = validate_app(app_name)
        if not is_valid:
            return jsonify({"error": error}), 400
        
        # Create deployment record
        deployment_id = str(uuid.uuid4())
        deployments[deployment_id] = {
            'id': deployment_id,
            'username': username,
            'app': app_name.lower(),
            'status': 'pending',
            'created_at': datetime.now().isoformat()
        }
        
        # Start deployment in a separate thread
        threading.Thread(
            target=execute_deployment,
            args=(deployment_id, username, app_name)
        ).start()
        
        # Return deployment ID for status polling
        return jsonify({
            "deploymentId": deployment_id,
            "message": "Deployment initiated"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/status/<deployment_id>', methods=['GET'])
def deployment_status(deployment_id):
    """Check the status of a deployment"""
    if deployment_id not in deployments:
        return jsonify({"error": "Deployment not found"}), 404
    
    deployment = deployments[deployment_id]
    
    return jsonify({
        "id": deployment_id,
        "status": deployment.get('status'),
        "app": deployment.get('app'),
        "username": deployment.get('username'),
        "url": deployment.get('url'),
        "error": deployment.get('error'),
        "created_at": deployment.get('created_at'),
        "completed_at": deployment.get('completed_at')
    })


@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({"status": "ok"})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
