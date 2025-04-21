from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import subprocess
import os

app = Flask(__name__, static_folder='public')
CORS(app)

@app.route('/deploy', methods=['POST'])
def deploy():
    data = request.get_json()
    project_name = data.get('projectName')
    app_type = data.get('appType')

    if not project_name or not app_type:
        return jsonify({'error': 'Missing projectName or appType'}), 400

    try:
        result = subprocess.run(
            ['./deploy.sh', project_name, app_type],
            cwd='/app',
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        if result.returncode == 0:
            url = f"https://{project_name}.ex-lab.de"
            return jsonify({'success': True, 'url': url})
        else:
            return jsonify({
                'success': False,
                'stdout': result.stdout,
                'stderr': result.stderr
            }), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path != "" and os.path.exists(f"public/{path}"):
        return send_from_directory('public', path)
    else:
        return send_from_directory('public', 'index.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)