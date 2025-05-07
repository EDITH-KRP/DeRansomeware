"""
De-Ransom Backend Flask Application
-----------------------------------
This is the main Flask application that serves as the backend for the De-Ransom system.
It provides API endpoints for file monitoring, blockchain interaction, and IPFS uploads.
"""

import os
from flask import Flask, send_from_directory
from flask_cors import CORS

# Import our API blueprint
from backend.api import api

# Initialize Flask app
app = Flask(__name__, static_folder='../frontend')
CORS(app)  # Enable CORS for all routes

# Register the API blueprint
app.register_blueprint(api, url_prefix='/api')

# Frontend routes
@app.route('/')
def index():
    """Serve the frontend application."""
    return send_from_directory('../frontend', 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    """Serve static files from the frontend directory."""
    return send_from_directory('../frontend', path)


# Error handlers
@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors."""
    return send_from_directory('../frontend', 'index.html')


@app.errorhandler(500)
def server_error(e):
    """Handle 500 errors."""
    return {
        'error': 'Internal server error',
        'message': str(e)
    }, 500


if __name__ == '__main__':
    # Import configuration
    from backend.config import FLASK_HOST, FLASK_PORT, DEBUG
    
    # Start the Flask app
    app.run(debug=DEBUG, host=FLASK_HOST, port=FLASK_PORT)