from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys

# Import custom engines
from engine_triage import TriageEngine
from engine_routing import RoutingEngine

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)  # Enable Cross-Origin Resource Sharing

# Initialize engines
triage_engine = TriageEngine()
routing_engine = RoutingEngine()

@app.route('/')
def index():
    # Serve the frontend index.html
    return app.send_static_file('index.html') if os.path.exists(os.path.join(app.static_folder, 'index.html')) else jsonify({"error": "Frontend not built yet. Please check static/index.html"})

@app.route('/api/init', methods=['GET'])
def get_initial_triage():
    """Returns the root of the symptom tree to kickstart the UI."""
    try:
        if not triage_engine.symptoms_data:
            raise ValueError("Symptoms data is missing or corrupt.")
        
        # Return only the question and options to prevent sending the whole tree if desired.
        # But to allow zero-latency UX, returning the whole tree might be better.
        # Following the recent architecture shift, we just return he root node.
        root_node = triage_engine.process_triage([])
        return jsonify(root_node)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/triage', methods=['POST'])
def api_triage():
    """
    Accepts a path (list of selected option indices) and returns either:
    - The next question and options
    - The final department_id and its coordinates
    """
    try:
        data = request.get_json()
        if not data or 'path' not in data:
            return jsonify({"status": "error", "message": "Missing 'path' array in payload"}), 400
            
        path = data['path']
        if not isinstance(path, list):
            return jsonify({"status": "error", "message": "'path' must be a list of integers"}), 400

        result = triage_engine.process_triage(path)
        if "error" in result:
            return jsonify({"status": "error", "message": result["error"]}), 422
            
        return jsonify(result)

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/route', methods=['POST'])
def api_route():
    """
    Calculates the 3D A* path.
    Payload: {
        "start": [r, c, z],
        "goal": [r, c, z],
        "grid": { "0": [[1,1,0...], ...], "1": [...] }
    }
    """
    try:
        data = request.get_json()
        if not data or 'start' not in data or 'goal' not in data or 'grid' not in data:
            return jsonify({"status": "error", "message": "Missing start, goal, or grid in payload"}), 400
            
        start = data['start']
        goal = data['goal']
        grid = data['grid']
        
        # Validation
        if len(start) != 3 or len(goal) != 3:
            return jsonify({"status": "error", "message": "Start and goal must be arrays of length 3 [r, c, z]"}), 400

        result = routing_engine.find_path(start, goal, grid)
        
        # If the path is blocked, return 422 Unprocessable Entity gracefully
        if result["status"] == "blocked":
            return jsonify(result), 422
            
        return jsonify(result)

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    # Force run in debug mode for development
    app.run(host='0.0.0.0', port=5000, debug=True)
