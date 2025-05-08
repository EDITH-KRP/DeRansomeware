"""
De-Ransom Backend Flask Application
-----------------------------------
This is the main Flask application that serves as the backend for the De-Ransom system.
It provides API endpoints for file monitoring, blockchain interaction, and IPFS uploads.
It also includes real-time notifications via WebSockets and user authentication.
"""

import os
import secrets
from flask import Flask, send_from_directory, session
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_session import Session

# Import our API blueprint and initialization function
from backend.api import api, init_app

# Initialize Flask app
app = Flask(__name__, static_folder='../frontend')
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)  # Enable CORS for all routes with credentials support

# Configure the Flask app
def configure_app(app):
    """Configure the Flask application."""
    # Import configuration
    from backend.config import (
        FLASK_SECRET_KEY, SESSION_TYPE, SESSION_PERMANENT, 
        SESSION_USE_SIGNER, SESSION_FILE_DIR, PERMANENT_SESSION_LIFETIME
    )
    
    # Set secret key for sessions
    app.secret_key = FLASK_SECRET_KEY or secrets.token_hex(32)
    
    # Configure session
    app.config['SESSION_TYPE'] = SESSION_TYPE
    app.config['SESSION_PERMANENT'] = SESSION_PERMANENT
    app.config['SESSION_USE_SIGNER'] = SESSION_USE_SIGNER
    app.config['SESSION_FILE_DIR'] = SESSION_FILE_DIR
    app.config['PERMANENT_SESSION_LIFETIME'] = PERMANENT_SESSION_LIFETIME
    
    # Initialize Flask-Session
    Session(app)
    
    # Initialize Socket.IO for real-time communication
    socketio = SocketIO(app, cors_allowed_origins="*", manage_session=False)
    app.socketio = socketio  # Store socketio instance in app for access in other modules
    
    # Register the API blueprint
    app.register_blueprint(api, url_prefix='/api')
    print(f"Registered API routes: {[rule for rule in app.url_map.iter_rules() if rule.rule.startswith('/api')]}")
    
    # Initialize the API with the app
    init_app(app)
    
    return socketio

# Configure the app and get the socketio instance
socketio = configure_app(app)

# WebSocket event handlers
@socketio.on('connect')
def handle_connect():
    """Handle client connection to WebSocket."""
    print(f"Client connected: {session.get('username', 'Anonymous')}")

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection from WebSocket."""
    print(f"Client disconnected: {session.get('username', 'Anonymous')}")

# Frontend routes
@app.route('/')
def index():
    """Serve the frontend application."""
    return send_from_directory('../frontend', 'index.html')

@app.route('/admin')
def admin_panel():
    """Serve the admin panel."""
    return send_from_directory('../frontend', 'admin.html')

@app.route('/client')
def client_panel():
    """Serve the client panel."""
    return send_from_directory('../frontend', 'client.html')

@app.route('/login')
def login_page():
    """Serve the login page."""
    return send_from_directory('../frontend', 'login.html')

@app.route('/register')
def register_page():
    """Serve the registration page."""
    return send_from_directory('../frontend', 'register.html')

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
    
    # Start the Flask app with Socket.IO
    socketio.run(app, debug=DEBUG, host=FLASK_HOST, port=FLASK_PORT)