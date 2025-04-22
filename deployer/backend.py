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
        'startup_time': 10  # Reduced to reflect faster deployment
    },
    'lightdash': {
        'port': 8080,
        'health_path': '/',
        'startup_time': 120  # Increased even further for Lightdash
    }
}

def check_container_health(app_name, subdomain, app_type):
    """
    Check and update the health status of a container until it's healthy or fails
    """
    status = deployment_status.get(app_name, {})
    status['status'] = 'deploying'
    status['step'] = 'Container wird erstellt'
    
    # Set initial progress based on app type
    if app_type == 'grafana':
        status['progress'] = 15  # Start higher for Grafana
    else:
        status['progress'] = 5  # Start lower for other apps
        
    deployment_status[app_name] = status

    # Wait for container to be created
    time.sleep(2)
    
    # Update status to starting
    status['step'] = 'Container wird gestartet'
    
    # Set progress based on app type
    if app_type == 'grafana':
        status['progress'] = 30  # Higher initial progress for Grafana
    else:
        status['progress'] = 15  # Lower initial progress for other apps
        
    deployment_status[app_name] = status
    
    # Get app configuration
    app_config = APP_CONFIG.get(app_type, {})
    port = app_config.get('port', 3000)
    health_path = app_config.get('health_path', '/api/health')
    startup_time = app_config.get('startup_time', 30)
    
    # Check if container exists and get its status
    try:
        # Increase max_tries for more realistic timing
        max_tries = 20  # Try for about 60 seconds
        
        # For Lightdash, we need to check both PostgreSQL and Lightdash
        if app_type == 'lightdash':
            # First check if PostgreSQL is ready
            status['step'] = 'Warte auf Datenbank-Initialisierung'
            status['progress'] = 20
            deployment_status[app_name] = status
            
            # Check PostgreSQL container health
            for attempt in range(5):  # Try for about 15 seconds
                pg_result = subprocess.run(
                    ['docker', 'inspect', '--format', '{{.State.Health.Status}}', f"postgres-{app_name}"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                if pg_result.returncode == 0 and pg_result.stdout.strip() == "healthy":
                    status['step'] = 'Datenbank bereit, starte Lightdash'
                    status['progress'] = 30
                    deployment_status[app_name] = status
                    break
                
                time.sleep(3)
        
        # Now check the main application container
        for attempt in range(max_tries):
            # Calculate progress more realistically based on app type
            if app_type == 'metabase':
                # Metabase starts quickly but takes time to initialize
                progress_base = 30 + (attempt * 3)  # Slower progress
            elif app_type == 'grafana':
                # Grafana starts up very quickly
                progress_base = 40 + (attempt * 4)  # Fast but more gradual progress
                if attempt > 2:
                    # More gradual progress for Grafana to avoid getting stuck
                    progress_base = min(80, 50 + (attempt * 2.5))
            elif app_type == 'lightdash':
                # Lightdash needs database initialization first
                progress_base = 30 + (attempt * 3)  # Slower progress
            else:
                progress_base = 30 + (attempt * 3)
                
            status['progress'] = min(90, progress_base)
            
            # Update step message based on app type and progress
            if app_type == 'grafana':
                if status['progress'] < 50:
                    status['step'] = 'Grafana wird gestartet...'
                elif status['progress'] < 70:
                    status['step'] = 'Grafana wird konfiguriert...'
                else:
                    status['step'] = 'Grafana fast bereit...'
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
                # For Lightdash, we'll be more lenient - it might still be initializing
                # Check if the container is at least running
                container_status_result = subprocess.run(
                    ['docker', 'inspect', '--format', '{{.State.Status}}', app_name],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                if container_status_result.returncode == 0 and container_status_result.stdout.strip() == "running":
                    # Give Lightdash more time to initialize
                    time.sleep(30)
                    
                    # Mark as success even if health check hasn't passed yet
                    status['status'] = 'success'
                    status['step'] = 'Lightdash wird gestartet (kann einige Minuten dauern)'
                    status['progress'] = 100
                    status['url'] = f"https://{subdomain}.ex-lab.de"
                    deployment_status[app_name] = status
                    
                    print(f"Lightdash container {app_name} is running but health check may not have passed yet. Marking as success.")
                    return
                else:
                    status['status'] = 'error'
                    status['step'] = 'Lightdash-Container konnte nicht gestartet werden'
                    status['progress'] = 100
                    deployment_status[app_name] = status
                    return
            
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
