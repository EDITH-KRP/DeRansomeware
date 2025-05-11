"""
De-Ransom API Module
------------------
This module defines the API endpoints for the De-Ransom application.
It includes authentication, real-time monitoring, and alert functionality.
"""

from flask import Blueprint, request, jsonify, current_app, session
import os
import json
import threading
import time
from datetime import datetime
from functools import wraps
import secrets
import hashlib
from flask_socketio import emit

# Import our custom modules
from backend.simple_detector import FileMonitor
from backend.mock_data import MockFileMonitor  # Import the mock file monitor
from backend.blockchain import BlockchainLogger
from backend.filebase_uploader import FilebaseUploader
from backend.config import ACTIVITY_LOG_FILE, CONTRACT_ADDRESS, BLOCKCHAIN_NETWORK, USER_DB_FILE

# Initialize Blueprint
api = Blueprint('api', __name__)

# Initialize components
file_monitor = None
blockchain_logger = BlockchainLogger(
    network=BLOCKCHAIN_NETWORK,
    contract_address=CONTRACT_ADDRESS
)
filebase_uploader = FilebaseUploader()

# Ensure log directory exists
os.makedirs(os.path.dirname(ACTIVITY_LOG_FILE), exist_ok=True)

# Load existing logs or create empty log file
if os.path.exists(ACTIVITY_LOG_FILE):
    try:
        with open(ACTIVITY_LOG_FILE, 'r') as f:
            activity_log = json.load(f)
    except json.JSONDecodeError:
        activity_log = []
else:
    activity_log = []
    with open(ACTIVITY_LOG_FILE, 'w') as f:
        json.dump(activity_log, f)

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

# Background monitoring thread
background_monitor_thread = None
monitored_directories = []

# Authentication decorator (bypassed for direct access)
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Bypass authentication - always allow access
        # Set a default user in the session if not present
        if 'user_id' not in session:
            session['user_id'] = 1  # Default admin user
            session['username'] = 'admin'
            session['role'] = 'admin'
        return f(*args, **kwargs)
    return decorated_function

# Role-based access control decorator (bypassed for direct access)
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Bypass authentication - always grant admin access
        if 'user_id' not in session:
            session['user_id'] = 1  # Default admin user
            session['username'] = 'admin'
            session['role'] = 'admin'
        
        # Always set role to admin
        session['role'] = 'admin'
            
        return f(*args, **kwargs)
    return decorated_function


# Authentication routes
@api.route('/auth/login', methods=['POST'])
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

@api.route('/auth/logout', methods=['POST'])
def logout():
    """End the user session."""
    session.clear()
    return jsonify({'status': 'success'})

@api.route('/auth/register', methods=['POST'])
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

@api.route('/auth/user', methods=['GET'])
@login_required
def get_current_user():
    """Get the current authenticated user."""
    user = next((u for u in users_db["users"] if u["id"] == session['user_id']), None)
    if not user:
        session.clear()
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'id': user["id"],
        'username': user["username"],
        'email': user["email"],
        'role': user["role"],
        'created_at': user["created_at"],
        'last_login': user["last_login"]
    })

# User management routes (admin only)
@api.route('/users', methods=['GET'])
@admin_required
def get_users():
    """Get all users (admin only)."""
    user_list = [{
        'id': u["id"],
        'username': u["username"],
        'email': u["email"],
        'role': u["role"],
        'created_at': u["created_at"],
        'last_login': u["last_login"]
    } for u in users_db["users"]]
    
    return jsonify(user_list)

@api.route('/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """Update a user (admin only)."""
    data = request.json
    
    # Find user in database
    user = next((u for u in users_db["users"] if u["id"] == user_id), None)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Update user fields
    if 'username' in data:
        # Check if username already exists
        if any(u["username"] == data['username'] and u["id"] != user_id for u in users_db["users"]):
            return jsonify({'error': 'Username already exists'}), 400
        user["username"] = data['username']
    
    if 'email' in data:
        # Check if email already exists
        if any(u["email"] == data['email'] and u["id"] != user_id for u in users_db["users"]):
            return jsonify({'error': 'Email already exists'}), 400
        user["email"] = data['email']
    
    if 'role' in data and data['role'] in ['admin', 'client']:
        user["role"] = data['role']
    
    if 'password' in data:
        salt = secrets.token_hex(16)
        password_hash = hashlib.sha256((data['password'] + salt).encode()).hexdigest()
        user["password_hash"] = password_hash
        user["salt"] = salt
    
    # Save the user database
    with open(USER_DB_FILE, 'w') as f:
        json.dump(users_db, f, indent=2)
    
    return jsonify({
        'status': 'success',
        'user': {
            'id': user["id"],
            'username': user["username"],
            'email': user["email"],
            'role': user["role"]
        }
    })

@api.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """Delete a user (admin only)."""
    # Find user in database
    user_index = next((i for i, u in enumerate(users_db["users"]) if u["id"] == user_id), None)
    if user_index is None:
        return jsonify({'error': 'User not found'}), 404
    
    # Cannot delete yourself
    if user_id == session['user_id']:
        return jsonify({'error': 'Cannot delete your own account'}), 400
    
    # Delete user
    deleted_user = users_db["users"].pop(user_index)
    
    # Save the user database
    with open(USER_DB_FILE, 'w') as f:
        json.dump(users_db, f, indent=2)
    
    return jsonify({
        'status': 'success',
        'message': f'User {deleted_user["username"]} deleted'
    })

# Background monitoring functions
def background_monitoring_thread():
    """Background thread for continuous monitoring."""
    global file_monitor, monitored_directories
    
    print("Starting background monitoring thread")
    
    while True:
        try:
            # Check if we need to start monitoring any directories
            for directory in monitored_directories:
                if not file_monitor or not file_monitor.is_running:
                    print(f"Starting monitoring for directory: {directory}")
                    file_monitor = FileMonitor(directory, on_suspicious_activity)
                    file_monitor.start()
                    break
            
            # Sleep for a while
            time.sleep(5)
        except Exception as e:
            print(f"Error in background monitoring thread: {str(e)}")
            time.sleep(10)  # Wait a bit longer if there was an error

def start_background_monitoring():
    """Start the background monitoring thread."""
    global background_monitor_thread
    
    if background_monitor_thread is None or not background_monitor_thread.is_alive():
        background_monitor_thread = threading.Thread(
            target=background_monitoring_thread,
            daemon=True
        )
        background_monitor_thread.start()
        print("Background monitoring thread started")

# Monitoring routes
@api.route('/monitor', methods=['POST'])
@login_required
def start_monitoring():
    """Start monitoring a directory for ransomware activity."""
    global file_monitor, monitored_directories
    
    data = request.json
    directory = data.get('path')
    use_mock = data.get('use_mock', True)  # Default to using mock data
    
    if not directory or not os.path.isdir(directory):
        return jsonify({'error': 'Invalid directory path'}), 400
    
    # Add to monitored directories if not already there
    if directory not in monitored_directories:
        monitored_directories.append(directory)
    
    # Stop existing monitor if running
    if file_monitor and file_monitor.is_running:
        file_monitor.stop()
    
    # Create and start new file monitor (real or mock)
    if use_mock:
        print(f"Using MOCK file monitor for {directory}")
        file_monitor = MockFileMonitor(directory, on_suspicious_activity)
    else:
        print(f"Using REAL file monitor for {directory}")
        file_monitor = FileMonitor(directory, on_suspicious_activity)
    
    file_monitor.start()
    
    # Ensure background monitoring is running
    start_background_monitoring()
    
    # Emit a socket.io event to all connected clients
    if hasattr(current_app, 'socketio'):
        current_app.socketio.emit('monitoring_started', {
            'directory': directory,
            'timestamp': datetime.now().isoformat(),
            'user': session.get('username'),
            'mock_mode': use_mock
        })
    
    return jsonify({
        'status': 'success',
        'message': f'Started {"mock" if use_mock else "real"} monitoring for {directory}',
        'mock_mode': use_mock,
        'timestamp': datetime.now().isoformat()
    })

@api.route('/monitor/stop', methods=['POST'])
@login_required
def stop_monitoring():
    """Stop the file monitoring process."""
    global file_monitor, monitored_directories
    
    data = request.json
    directory = data.get('path')
    
    if directory and directory in monitored_directories:
        monitored_directories.remove(directory)
    
    if file_monitor and file_monitor.is_running:
        file_monitor.stop()
        
        # Emit a socket.io event to all connected clients
        if hasattr(current_app, 'socketio'):
            current_app.socketio.emit('monitoring_stopped', {
                'timestamp': datetime.now().isoformat(),
                'user': session.get('username')
            })
        
        return jsonify({
            'status': 'success',
            'message': 'Monitoring stopped',
            'timestamp': datetime.now().isoformat()
        })
    else:
        return jsonify({
            'status': 'error',
            'message': 'No active monitoring to stop',
            'timestamp': datetime.now().isoformat()
        }), 400

@api.route('/monitor/status', methods=['GET'])
@login_required
def monitoring_status():
    """Get the current monitoring status."""
    global file_monitor, monitored_directories
    
    return jsonify({
        'is_monitoring': file_monitor is not None and file_monitor.is_running,
        'monitored_directories': monitored_directories,
        'background_thread_active': background_monitor_thread is not None and background_monitor_thread.is_alive()
    })

@api.route('/logs', methods=['GET'])
@login_required
def get_logs():
    """Retrieve the activity logs."""
    # Filter logs based on user role
    if session.get('role') == 'admin':
        # Admins see all logs
        return jsonify(activity_log)
    else:
        # Clients only see high and medium risk events
        filtered_logs = [log for log in activity_log if log.get('risk_level') in ['high', 'medium']]
        return jsonify(filtered_logs)


@api.route('/blockchain/status', methods=['GET'])
@login_required
def blockchain_status():
    """Get the current blockchain connection status."""
    try:
        status = blockchain_logger.get_status()
        return jsonify(status)
    except Exception as e:
        return jsonify({
            'error': 'Failed to get blockchain status',
            'message': str(e),
            'connected': False,
            'simulation': False
        }), 500


@api.route('/backup/status', methods=['GET'])
@login_required
def backup_status():
    """Get the status of IPFS backups."""
    # Count backups by risk level
    backup_stats = {
        'total': 0,
        'high_risk': 0,
        'medium_risk': 0,
        'low_risk': 0
    }
    
    for event in activity_log:
        if 'ipfs_hash' in event:
            backup_stats['total'] += 1
            risk_level = event.get('risk_level', 'low')
            if risk_level == 'high':
                backup_stats['high_risk'] += 1
            elif risk_level == 'medium':
                backup_stats['medium_risk'] += 1
            else:
                backup_stats['low_risk'] += 1
    
    return jsonify(backup_stats)


@api.route('/backup/restore', methods=['POST'])
@login_required
def restore_backup():
    """Restore a file from IPFS backup."""
    data = request.json
    ipfs_hash = data.get('ipfs_hash')
    output_path = data.get('output_path')
    
    if not ipfs_hash or not output_path:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    # Ensure the output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Attempt to download the file
    success = filebase_uploader.download_file(ipfs_hash, output_path)
    
    if success:
        # Log the restoration event
        restoration_event = {
            'event_type': 'file_restored',
            'ipfs_hash': ipfs_hash,
            'output_path': output_path,
            'user': session.get('username'),
            'timestamp': datetime.now().isoformat()
        }
        activity_log.append(restoration_event)
        
        # Save to log file
        with open(ACTIVITY_LOG_FILE, 'w') as f:
            json.dump(activity_log, f, indent=2)
        
        # Emit a socket.io event to all connected clients
        if hasattr(current_app, 'socketio'):
            current_app.socketio.emit('file_restored', {
                'ipfs_hash': ipfs_hash,
                'output_path': output_path,
                'user': session.get('username'),
                'timestamp': datetime.now().isoformat()
            })
        
        return jsonify({
            'status': 'success',
            'message': f'File restored to {output_path}',
            'timestamp': datetime.now().isoformat()
        })
    else:
        return jsonify({
            'status': 'error',
            'message': 'Failed to restore file',
            'timestamp': datetime.now().isoformat()
        }), 500

# Dashboard statistics routes
@api.route('/dashboard/stats', methods=['GET'])
@login_required
def dashboard_stats():
    """Get statistics for the dashboard."""
    # Count events by risk level
    event_stats = {
        'total': len(activity_log),
        'high_risk': len([e for e in activity_log if e.get('risk_level') == 'high']),
        'medium_risk': len([e for e in activity_log if e.get('risk_level') == 'medium']),
        'low_risk': len([e for e in activity_log if e.get('risk_level') == 'low'])
    }
    
    # Count events by type
    event_types = {}
    for event in activity_log:
        event_type = event.get('event_type', 'unknown')
        event_types[event_type] = event_types.get(event_type, 0) + 1
    
    # Get recent events (last 10)
    recent_events = sorted(
        activity_log,
        key=lambda e: e.get('timestamp', ''),
        reverse=True
    )[:10]
    
    # Get backup stats
    backup_count = len([e for e in activity_log if 'ipfs_hash' in e])
    
    return jsonify({
        'event_stats': event_stats,
        'event_types': event_types,
        'recent_events': recent_events,
        'backup_count': backup_count,
        'is_monitoring': file_monitor is not None and file_monitor.is_running,
        'monitored_directories': monitored_directories
    })

# Notification settings routes
@api.route('/notifications/settings', methods=['GET', 'PUT'])
@login_required
def notification_settings():
    """Get or update notification settings for the current user."""
    user_id = session.get('user_id')
    
    # Find user in database
    user = next((u for u in users_db["users"] if u["id"] == user_id), None)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Initialize notification settings if they don't exist
    if 'notification_settings' not in user:
        user['notification_settings'] = {
            'email_alerts': True,
            'browser_alerts': True,
            'alert_levels': ['high', 'medium'],
            'email': user.get('email')
        }
    
    if request.method == 'GET':
        return jsonify(user['notification_settings'])
    else:  # PUT
        data = request.json
        
        # Update notification settings
        if 'email_alerts' in data:
            user['notification_settings']['email_alerts'] = bool(data['email_alerts'])
        
        if 'browser_alerts' in data:
            user['notification_settings']['browser_alerts'] = bool(data['browser_alerts'])
        
        if 'alert_levels' in data:
            valid_levels = [level for level in data['alert_levels'] if level in ['high', 'medium', 'low']]
            user['notification_settings']['alert_levels'] = valid_levels
        
        if 'email' in data:
            user['notification_settings']['email'] = data['email']
        
        # Save the user database
        with open(USER_DB_FILE, 'w') as f:
            json.dump(users_db, f, indent=2)
        
        return jsonify({
            'status': 'success',
            'notification_settings': user['notification_settings']
        })


# Event handler for suspicious activity
def on_suspicious_activity(event):
    """
    Handle suspicious file activity detected by the monitor.
    
    Args:
        event (dict): Event data containing file path, event type, and risk level
    """
    print(f"Suspicious activity detected: {event}")
    
    # Add timestamp
    event['timestamp'] = datetime.now().isoformat()
    
    # For high-risk events, backup to IPFS and log to blockchain
    if event['risk_level'] in ['high', 'medium']:
        # Upload to IPFS via Filebase if file exists
        if os.path.exists(event['file_path']) and os.path.isfile(event['file_path']):
            try:
                ipfs_hash = filebase_uploader.upload_file(event['file_path'])
                event['ipfs_hash'] = ipfs_hash
                print(f"File backed up to IPFS: {ipfs_hash}")
                
                # Log high-risk events to blockchain
                if event['risk_level'] == 'high':
                    try:
                        tx_hash = blockchain_logger.log_event(
                            file_path=event['file_path'],
                            event_type=event['event_type'],
                            ipfs_hash=ipfs_hash
                        )
                        event['blockchain_tx'] = tx_hash
                        event['etherscan_link'] = f"https://{blockchain_logger.network}.etherscan.io/tx/{tx_hash}"
                        print(f"Event logged to blockchain. TX Hash: {tx_hash}")
                        print(f"View on Etherscan: {event['etherscan_link']}")
                    except Exception as e:
                        print(f"Error logging to blockchain: {str(e)}")
                        event['blockchain_error'] = str(e)
            except Exception as e:
                print(f"Error backing up file to IPFS: {str(e)}")
                event['ipfs_error'] = str(e)
    
    # Add to activity log
    activity_log.append(event)
    
    # Save to log file (in a real app, we'd use a proper database)
    with open(ACTIVITY_LOG_FILE, 'w') as f:
        json.dump(activity_log, f, indent=2)
    
    # Send real-time notification via WebSocket
    if hasattr(current_app, 'socketio'):
        current_app.socketio.emit('ransomware_alert', {
            'event': event,
            'timestamp': datetime.now().isoformat()
        })
    
    # Send notifications to users based on their preferences
    send_notifications(event)

def send_notifications(event):
    """
    Send notifications to users based on their preferences.
    
    Args:
        event (dict): Event data containing file path, event type, and risk level
    """
    risk_level = event.get('risk_level', 'low')
    
    # Only send notifications for events that match user preferences
    for user in users_db["users"]:
        # Skip users without notification settings
        if 'notification_settings' not in user:
            continue
        
        settings = user['notification_settings']
        
        # Check if user wants notifications for this risk level
        if risk_level not in settings.get('alert_levels', ['high']):
            continue
        
        # Send email notification if enabled
        if settings.get('email_alerts', False) and settings.get('email'):
            try:
                send_email_notification(
                    email=settings['email'],
                    subject=f"De-Ransom Alert: {risk_level.upper()} risk activity detected",
                    message=f"""
                    De-Ransom has detected suspicious activity:
                    
                    Risk Level: {risk_level.upper()}
                    Event Type: {event.get('event_type', 'unknown')}
                    File Path: {event.get('file_path', 'unknown')}
                    Timestamp: {event.get('timestamp', datetime.now().isoformat())}
                    
                    Please log in to the De-Ransom dashboard for more details.
                    """
                )
            except Exception as e:
                print(f"Error sending email notification: {str(e)}")

def send_email_notification(email, subject, message):
    """
    Send an email notification.
    
    Args:
        email (str): Recipient email address
        subject (str): Email subject
        message (str): Email message
    """
    # In a real application, this would use an email service like SMTP or a third-party API
    # For now, we'll just log the email that would be sent
    print(f"Would send email to {email}")
    print(f"Subject: {subject}")
    print(f"Message: {message}")
    
    # TODO: Implement actual email sending functionality
    # Example using smtplib:
    # import smtplib
    # from email.mime.text import MIMEText
    # from email.mime.multipart import MIMEMultipart
    # 
    # smtp_server = "smtp.example.com"
    # smtp_port = 587
    # smtp_username = "your_username"
    # smtp_password = "your_password"
    # 
    # msg = MIMEMultipart()
    # msg["From"] = "deransom@example.com"
    # msg["To"] = email
    # msg["Subject"] = subject
    # msg.attach(MIMEText(message, "plain"))
    # 
    # with smtplib.SMTP(smtp_server, smtp_port) as server:
    #     server.starttls()
    #     server.login(smtp_username, smtp_password)
    #     server.send_message(msg)

# Initialize the application
def init_app(app):
    """
    Initialize the API with the Flask app.
    
    Args:
        app: Flask application instance
    """
    # Start background monitoring if there are directories to monitor
    global monitored_directories
    
    # Load monitored directories from config
    monitored_dirs_file = os.path.join(os.path.dirname(USER_DB_FILE), 'monitored_directories.json')
    if os.path.exists(monitored_dirs_file):
        try:
            with open(monitored_dirs_file, 'r') as f:
                monitored_directories = json.load(f)
        except json.JSONDecodeError:
            monitored_directories = []
    
    # Start background monitoring if there are directories to monitor
    if monitored_directories:
        start_background_monitoring()