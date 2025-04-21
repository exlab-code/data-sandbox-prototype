from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import subprocess
import os
import json
import time
import threading

app = Flask(__name__, static_folder='public')
CORS(app)

# In-memory store for deployment status
deployment_status = {}

# App configuration - defines ports and health check endpoints for each app type
APP_CONFIG = {
    'metabase': {
        'port': 3000,
        'health_path': '/api/health',
        'startup_time': 30
    },
    'grafana': {
        'port': 3000,
        'health_path': '/api/health',
        'startup_time': 15
    },
    'lightdash': {
        'port': 8080,
        'health_path': '/api/v1/health',
        'startup_time': 20
    }
}

def check_container_health(app_name, subdomain, app_type):
    """
    Check and update the health status of a container until it's healthy or fails
    """
    status = deployment_status.get(app_name, {})
    status['status'] = 'deploying'
    status['step'] = 'Container wird erstellt'
    status['progress'] = 10
    deployment_status[app_name] = status

    # Wait for container to be created
    time.sleep(2)
    
    # Update status to starting
    status['step'] = 'Container wird gestartet'
    status['progress'] = 30
    deployment_status[app_name] = status
    
    # Get app configuration
    app_config = APP_CONFIG.get(app_type, {})
    port = app_config.get('port', 3000)
    health_path = app_config.get('health_path', '/api/health')
    startup_time = app_config.get('startup_time', 30)
    
    # Check if container exists and get its status
    try:
        max_tries = 15  # Try for about 45 seconds
        for attempt in range(max_tries):
            # Update progress based on attempt
            progress_increment = min(5, (90 - status['progress']) / (max_tries - attempt))
            status['progress'] = min(90, status['progress'] + progress_increment)
            
            if app_type == 'lightdash' and attempt < 3:
                # For Lightdash, wait for Postgres to be ready first
                status['step'] = 'Warte auf Datenbank-Initialisierung'
            else:
                status['step'] = 'Warte auf Anwendungsstart'
                
            deployment_status[app_name] = status
            
            # Check container health
            result = subprocess.run(
                ['docker', 'inspect', '--format', '{{.State.Health.Status}}', app_name],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            if result.returncode == 0:
                health_status = result.stdout.strip()
                
                if health_status == "healthy":
                    status['status'] = 'success'
                    status['step'] = 'Anwendung ist bereit'
                    status['progress'] = 100
                    status['url'] = f"https://{subdomain}.ex-lab.de"
                    deployment_status[app_name] = status
                    return
                elif health_status == "unhealthy":
                    status['status'] = 'error'
                    status['step'] = 'Container ist fehlerhaft'
                    status['progress'] = 100
                    deployment_status[app_name] = status
                    return
                # If still starting, continue
            
            time.sleep(3)
        
        # If we reach here, we timed out waiting for the container to be healthy
        # But it still might be running, so let's check
        result = subprocess.run(
            ['docker', 'inspect', '--format', '{{.State.Status}}', app_name],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        if result.returncode == 0 and result.stdout.strip() == "running":
            # For some containers, health check might not be configured properly
            # If the container is running for a while, we'll assume it's probably ok
            if app_type == 'lightdash':
                # Lightdash needs a bit more time
                time.sleep(10)
            
            status['status'] = 'success'
            status['step'] = 'Anwendung läuft (Timeout beim Health-Check)'
            status['progress'] = 100
            status['url'] = f"https://{subdomain}.ex-lab.de"
        else:
            status['status'] = 'error'
            status['step'] = 'Container konnte nicht gestartet werden'
            status['progress'] = 100
            
        deployment_status[app_name] = status
    except Exception as e:
        status['status'] = 'error'
        status['step'] = f'Fehler beim Überprüfen des Containers: {str(e)}'
        status['progress'] = 100
        deployment_status[app_name] = status

@app.route('/deploy', methods=['POST'])
def deploy():
    data = request.get_json()
    project_name = data.get('projectName')
    app_type = data.get('appType')

    if not project_name or not app_type:
        return jsonify({'error': 'ProjectName oder appType fehlt'}), 400

    # Check if the app type is supported
    if app_type not in APP_CONFIG:
        return jsonify({'error': f'App-Typ {app_type} wird nicht unterstützt'}), 400

    # Create a unique app name for the container
    app_name = f"{project_name}-{app_type}"
    
    # Initialize deployment status
    deployment_status[app_name] = {
        'status': 'starting',
        'step': 'Initialisiere Bereitstellung',
        'progress': 0
    }
    
    try:
        # Run the deployment script
        result = subprocess.run(
            ['./deploy.sh', project_name, app_type],
            cwd='/app',
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        if result.returncode != 0:
            deployment_status[app_name] = {
                'status': 'error',
                'step': 'Bereitstellungsskript fehlgeschlagen',
                'progress': 100,
                'stdout': result.stdout,
                'stderr': result.stderr
            }
            return jsonify({
                'success': False,
                'deploymentId': app_name,
                'stdout': result.stdout,
                'stderr': result.stderr
            }), 500
        
        # Start a background thread to monitor the container health
        monitoring_thread = threading.Thread(
            target=check_container_health,
            args=(app_name, project_name, app_type)
        )
        monitoring_thread.daemon = True
        monitoring_thread.start()
        
        return jsonify({
            'success': True,
            'deploymentId': app_name,
            'message': 'Bereitstellung gestartet, überprüfe den Status für Updates'
        })
        
    except Exception as e:
        deployment_status[app_name] = {
            'status': 'error',
            'step': f'Ausnahme: {str(e)}',
            'progress': 100
        }
        return jsonify({'error': str(e)}), 500

@app.route('/status/<deployment_id>', methods=['GET'])
def get_status(deployment_id):
    status = deployment_status.get(deployment_id)
    if not status:
        return jsonify({'error': 'Bereitstellung nicht gefunden'}), 404
    
    return jsonify(status)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path != "" and os.path.exists(f"public/{path}"):
        return send_from_directory('public', path)
    else:
        return send_from_directory('public', 'index.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)