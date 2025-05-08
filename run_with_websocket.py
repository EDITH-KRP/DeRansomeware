"""
De-Ransom Main Entry Point with WebSocket Support
------------------------------------------------
This script starts the De-Ransom application with WebSocket support for real-time notifications.
"""

import os
import sys
import importlib.util

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the Flask app and Socket.IO instance
from backend.app import app, socketio
from backend.config import FLASK_HOST, FLASK_PORT, DEBUG, validate_config

if __name__ == "__main__":
    # Validate configuration
    is_valid, missing_keys = validate_config()
    if not is_valid:
        print("WARNING: Missing configuration keys:", ", ".join(missing_keys))
        print("Some features may not work correctly.")
        print("Please update your .env file with the required values.")
        
        # Ask user if they want to continue anyway
        if input("Continue anyway? (y/n): ").lower() != 'y':
            sys.exit(1)
    
    # Ensure the logs directory exists
    os.makedirs(os.path.join(os.path.dirname(__file__), 'backend', 'logs'), exist_ok=True)
    
    print(f"Starting De-Ransom server with WebSocket support on {FLASK_HOST}:{FLASK_PORT}")
    print("Press Ctrl+C to stop the server")
    
    # Start the Flask application with Socket.IO
    socketio.run(app, host=FLASK_HOST, port=FLASK_PORT, debug=DEBUG)