"""
De-Ransom Backend Flask Application
-----------------------------------
This is the main Flask application that serves as the backend for the De-Ransom system.
It provides API endpoints for file monitoring, blockchain interaction, and IPFS uploads.
It also includes real-time notifications via WebSockets and user authentication.
"""

import os
import secrets
from flask import Flask, send_from_directory, session, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_session import Session

# Import our API blueprint and initialization function
from backend.api import api, init_app

# Initialize Flask app
app = Flask(__name__, static_folder='../frontend')
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}}, supports_credentials=True)  # Enable CORS for all routes with credentials support

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
    
    # Add routes for static files and redirects
    @app.route('/')
    def index():
        """Redirect root URL to frontend index.html."""
        return app.send_static_file('index.html')
    
    @app.route('/dashboard')
    def dashboard():
        """Redirect /dashboard to frontend dashboard.html."""
        return app.send_static_file('dashboard.html')
    
    @app.route('/dashboard.html')
    def dashboard_html():
        """Redirect /dashboard.html to frontend dashboard.html."""
        return app.send_static_file('dashboard.html')
    
    @app.route('/favicon.ico')
    def favicon():
        """Serve favicon.ico from static folder."""
        return app.send_static_file('favicon.ico')
    
    # Direct API routes for authentication
    @app.route('/api/auth/register', methods=['POST'])
    def direct_register():
        """Direct registration endpoint."""
        data = request.json
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not username or not email or not password:
            return jsonify({'error': 'Username, email, and password required'}), 400
        
        # Import users_db from api module
        from backend.api import users_db, USER_DB_FILE
        
        # Check if username or email already exists
        if any(u["username"] == username for u in users_db["users"]):
            return jsonify({'error': 'Username already exists'}), 400
        
        if any(u["email"] == email for u in users_db["users"]):
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create new user
        import secrets
        import hashlib
        from datetime import datetime
        
        salt = secrets.token_hex(16)
        password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        
        new_user = {
            "id": users_db["next_id"],
            "username": username,
            "email": email,
            "password_hash": password_hash,
            "salt": salt,
            "role": "client",  # Default role is client
            "created_at": datetime.now().isoformat(),
            "last_login": None
        }
        
        users_db["users"].append(new_user)
        users_db["next_id"] += 1
        
        # Save the user database
        import json
        with open(USER_DB_FILE, 'w') as f:
            json.dump(users_db, f, indent=2)
        
        return jsonify({
            'status': 'success',
            'user': {
                'id': new_user["id"],
                'username': new_user["username"],
                'email': new_user["email"],
                'role': new_user["role"]
            }
        })
        
    @app.route('/api/auth/login', methods=['POST'])
    def direct_login():
        """Direct login endpoint."""
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        # Import users_db from api module
        from backend.api import users_db, USER_DB_FILE
        
        # Find user in database
        user = next((u for u in users_db["users"] if u["username"] == username), None)
        if not user:
            return jsonify({'error': 'Invalid username or password'}), 401
        
        # Verify password
        import hashlib
        from datetime import datetime
        
        password_hash = hashlib.sha256((password + user["salt"]).encode()).hexdigest()
        if password_hash != user["password_hash"]:
            return jsonify({'error': 'Invalid username or password'}), 401
        
        # Update last login time
        user["last_login"] = datetime.now().isoformat()
        import json
        with open(USER_DB_FILE, 'w') as f:
            json.dump(users_db, f, indent=2)
        
        # Create session
        session['user_id'] = user["id"]
        session['username'] = user["username"]
        session['role'] = user["role"]
        
        return jsonify({
            'status': 'success',
            'user': {
                'id': user["id"],
                'username': user["username"],
                'email': user["email"],
                'role': user["role"]
            }
        })
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

# Frontend routes are defined in the configure_app function
@app.route('/frontend')
def frontend_index():
    """Serve the frontend application."""
    return send_from_directory('../frontend', 'index.html')

@app.route('/frontend/admin.html')
def admin_panel():
    """Serve the admin panel."""
    return send_from_directory('../frontend', 'admin.html')

@app.route('/frontend/client.html')
def client_panel():
    """Serve the client panel."""
    return send_from_directory('../frontend', 'client.html')

@app.route('/frontend/login.html')
def login_page():
    """Serve the login page."""
    return send_from_directory('../frontend', 'login.html')

@app.route('/frontend/register.html')
def register_page():
    """Serve the registration page."""
    return send_from_directory('../frontend', 'register.html')

@app.route('/frontend/simple_login.html')
def simple_login_page():
    """Serve the simple login page."""
    return send_from_directory('../frontend', 'simple_login.html')

@app.route('/frontend/simple_register.html')
def simple_register_page():
    """Serve the simple registration page."""
    return send_from_directory('../frontend', 'simple_register.html')

@app.route('/frontend/<path:path>')
def serve_static(path):
    """Serve static files from the frontend directory."""
    return send_from_directory('../frontend', path)

@app.route('/test-api')
def test_api():
    """Test API endpoint."""
    return jsonify({
        'status': 'success',
        'message': 'API is working',
        'routes': [str(rule) for rule in app.url_map.iter_rules() if rule.rule.startswith('/api')]
    })

@app.route('/test-register', methods=['POST'])
def test_register():
    """Test registration endpoint."""
    try:
        data = request.json
        print(f"Test registration data: {data}")
        return jsonify({
            'status': 'success',
            'message': 'Registration test successful',
            'data': data
        })
    except Exception as e:
        print(f"Test registration error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Registration test failed: {str(e)}'
        }), 500

# Error handlers
@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors."""
    print(f"404 error: {request.path}")
    # Only redirect to index.html if it's not an API request
    if not request.path.startswith('/api/'):
        return send_from_directory('../frontend', 'index.html')
    return jsonify({'error': 'Not found'}), 404

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