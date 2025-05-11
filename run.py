"""
De-Ransom Main Entry Point
-------------------------
This script starts the De-Ransom application.
"""

import os
import sys
import importlib.util

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the Flask app
from backend.app import app
from backend.config import FLASK_HOST, FLASK_PORT, DEBUG, validate_config
from backend.websocket import run_server as run_websocket_server

if __name__ == "__main__":
    # Validate configuration but always continue in real mode
    is_valid, missing_keys = validate_config()
    if not is_valid:
        print("WARNING: Missing configuration keys:", ", ".join(missing_keys))
        print("Some features may not work correctly.")
        print("Running in REAL MODE - not using mock data")
    
    # Ensure the logs directory exists
    os.makedirs(os.path.join(os.path.dirname(__file__), 'backend', 'logs'), exist_ok=True)
    
    # Start the WebSocket server in a separate thread
    websocket_thread = run_websocket_server(host=FLASK_HOST, port=8765)
    print(f"WebSocket server started on ws://{FLASK_HOST}:8765")
    
    print(f"Starting De-Ransom server on {FLASK_HOST}:{FLASK_PORT}")
    print("Press Ctrl+C to stop the server")
    
    # Start the Flask application
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=DEBUG)