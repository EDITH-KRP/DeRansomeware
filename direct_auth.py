"""
Direct Authentication Server for De-Ransom
"""

from flask import Flask, request, jsonify, session, redirect, url_for
from flask_cors import CORS
import os
import json
import secrets
import hashlib
from datetime import datetime, timedelta

app = Flask(__name__, static_folder='frontend')
app.secret_key = secrets.token_hex(32)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)

CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
                            "allow_headers": ["Content-Type", "Authorization"]}}, 
     supports_credentials=True)

# User database file
USER_DB_FILE = os.path.join(os.path.dirname(__file__), 'backend', 'data', 'users.json')

# Load or create user database
if os.path.exists(USER_DB_FILE):
    try:
        with open(USER_DB_FILE, 'r') as f:
            users_db = json.load(f)
    except json.JSONDecodeError:
        users_db = {
            "users": [],
            "next_id": 1
        }
else:
    # Create default admin user if no user database exists
    admin_salt = secrets.token_hex(16)
    admin_password = "admin123"  # Default password, should be changed immediately
    admin_hash = hashlib.sha256((admin_password + admin_salt).encode()).hexdigest()
    
    users_db = {
        "users": [
            {
                "id": 1,
                "username": "admin",
                "email": "admin@deransom.com",
                "password_hash": admin_hash,
                "salt": admin_salt,
                "role": "admin",
                "created_at": datetime.now().isoformat(),
                "last_login": None
            }
        ],
        "next_id": 2
    }
    
    # Save the user database
    os.makedirs(os.path.dirname(USER_DB_FILE), exist_ok=True)
    with open(USER_DB_FILE, 'w') as f:
        json.dump(users_db, f, indent=2)
    
    print("Created default admin user. Please change the password immediately.")
    print("Username: admin")
    print("Password: admin123")

# Serve static files
@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def static_files(path):
    return app.send_static_file(path)

# Authentication routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user."""
    print("Registration request received")
    try:
        data = request.json
        print(f"Registration data: {data}")
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not username or not email or not password:
            print("Missing required fields")
            return jsonify({'error': 'Username, email, and password required'}), 400
    except Exception as e:
        print(f"Error processing registration request: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500
    
    # Check if username or email already exists
    if any(u["username"] == username for u in users_db["users"]):
        return jsonify({'error': 'Username already exists'}), 400
    
    if any(u["email"] == email for u in users_db["users"]):
        return jsonify({'error': 'Email already exists'}), 400
    
    # Create new user
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
def login():
    """Authenticate a user and create a session."""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    # Find user in database
    user = next((u for u in users_db["users"] if u["username"] == username), None)
    if not user:
        return jsonify({'error': 'Invalid username or password'}), 401
    
    # Verify password
    password_hash = hashlib.sha256((password + user["salt"]).encode()).hexdigest()
    if password_hash != user["password_hash"]:
        return jsonify({'error': 'Invalid username or password'}), 401
    
    # Update last login time
    user["last_login"] = datetime.now().isoformat()
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

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """End the user session."""
    session.clear()
    return jsonify({'status': 'success'})

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Get activity logs."""
    # This is a simplified version that returns dummy data
    return jsonify([
        {
            "timestamp": datetime.now().isoformat(),
            "event_type": "test",
            "file_path": "test_file.txt",
            "risk_level": "low"
        }
    ])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True, use_reloader=False)