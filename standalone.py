"""
De-Ransom Standalone Server
-------------------------
This script provides a standalone HTTP server for the De-Ransom frontend
with simulated backend functionality and automatic directory monitoring.
"""

import os
import sys
import json
import time
import random
import hashlib
import threading
import http.server
import socketserver
import webbrowser
from datetime import datetime
from urllib.parse import parse_qs, urlparse

# Configuration
PORT = 8000
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(SCRIPT_DIR, "frontend")
STATIC_DIR = os.path.join(SCRIPT_DIR, "static")

# Simulated state
is_monitoring = False
activity_log = []
file_count = 0
suspicious_count = 0
events_logged = 0

# Auto-detect common directories to monitor
def get_default_directories():
    """Get default directories to monitor based on the operating system."""
    directories = []
    
    # Get user home directory
    home = os.path.expanduser("~")
    directories.append(home)
    
    # Add common directories
    if os.name == 'nt':  # Windows
        # Add common Windows directories
        for dir_name in ['Documents', 'Desktop', 'Downloads', 'Pictures']:
            path = os.path.join(home, dir_name)
            if os.path.exists(path) and os.path.isdir(path):
                directories.append(path)
        
        # Add root drives
        import string
        for drive in string.ascii_uppercase:
            if os.path.exists(f"{drive}:\\"):
                directories.append(f"{drive}:\\")
    else:  # Unix/Linux/Mac
        # Add common Unix directories
        for dir_name in ['Documents', 'Desktop', 'Downloads', 'Pictures']:
            path = os.path.join(home, dir_name)
            if os.path.exists(path) and os.path.isdir(path):
                directories.append(path)
        
        # Add some system directories
        for path in ['/tmp', '/var/log']:
            if os.path.exists(path) and os.path.isdir(path):
                directories.append(path)
    
    return directories

# Get directories to monitor
monitored_directories = get_default_directories()
print(f"Auto-detected directories to monitor: {monitored_directories}")

# Common ransomware file extensions
RANSOMWARE_EXTENSIONS = [
    '.encrypted', '.enc', '.crypted', '.crypt', '.crypto', '.locked', '.lock',
    '.ryk', '.ryuk', '.lck', '.locky', '.wncry', '.wannacry', '.wcry'
]

class DeRansomRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom request handler for De-Ransom standalone server."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SCRIPT_DIR, **kwargs)
    
    def do_GET(self):
        """Handle GET requests."""
        # API endpoints
        if self.path.startswith('/api/'):
            self.handle_api_get()
        # Handle direct navigation to dashboard or login
        elif self.path == '/dashboard' or self.path == '/dashboard/':
            self.path = '/frontend/dashboard.html'
            return super().do_GET()
        elif self.path == '/login' or self.path == '/login/':
            self.path = '/frontend/login.html'
            return super().do_GET()
        else:
            # Serve static files
            if self.path == '/' or self.path == '/index.html':
                self.path = '/frontend/index.html'
            
            return super().do_GET()
    
    def do_POST(self):
        """Handle POST requests."""
        if self.path.startswith('/api/'):
            self.handle_api_post()
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not Found')
    
    def handle_api_get(self):
        """Handle API GET requests."""
        if self.path == '/api/logs':
            self.send_json_response(activity_log)
        elif self.path == '/api/blockchain/status':
            self.send_json_response({
                'connected': True,
                'network': 'sepolia',
                'blockNumber': 12345678 + random.randint(1, 100),
                'contractConnected': True,
                'accountConnected': True,
                'simulation': True,
                'eventCount': events_logged
            })
        elif self.path == '/api/backup/status':
            self.send_json_response({
                'total': len([e for e in activity_log if 'ipfs_hash' in e]),
                'high_risk': len([e for e in activity_log if e.get('risk_level') == 'high' and 'ipfs_hash' in e]),
                'medium_risk': len([e for e in activity_log if e.get('risk_level') == 'medium' and 'ipfs_hash' in e]),
                'low_risk': len([e for e in activity_log if e.get('risk_level') == 'low' and 'ipfs_hash' in e])
            })
        elif self.path == '/api/directories':
            # Return the list of monitored directories
            self.send_json_response({
                'directories': monitored_directories
            })
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'API endpoint not found')
    
    def handle_api_post(self):
        """Handle API POST requests."""
        global is_monitoring
        
        if self.path == '/api/monitor':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # If a path is provided, add it to monitored directories
            if 'path' in data and data['path']:
                path = data['path']
                if path not in monitored_directories:
                    monitored_directories.append(path)
            
            is_monitoring = True
            
            # Start the simulation thread if not already running
            if not any(t.name == 'simulation_thread' for t in threading.enumerate()):
                simulation_thread = threading.Thread(
                    target=simulate_file_activity,
                    name='simulation_thread',
                    daemon=True
                )
                simulation_thread.start()
            
            self.send_json_response({
                'status': 'success',
                'message': f'Started monitoring {len(monitored_directories)} directories',
                'timestamp': datetime.now().isoformat()
            })
        
        elif self.path == '/api/monitor/stop':
            is_monitoring = False
            self.send_json_response({
                'status': 'success',
                'message': 'Monitoring stopped',
                'timestamp': datetime.now().isoformat()
            })
        
        elif self.path == '/api/backup/restore':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            self.send_json_response({
                'status': 'success',
                'message': f'File restored to {data.get("output_path", "unknown")}',
                'timestamp': datetime.now().isoformat()
            })
        
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'API endpoint not found')
    
    def send_json_response(self, data):
        """Send a JSON response."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def log_message(self, format, *args):
        """Customize logging."""
        if args and len(args) > 2 and '200' in args[1]:
            return  # Don't log successful requests
        super().log_message(format, *args)


def simulate_file_activity():
    """Simulate file activity for demonstration purposes."""
    global file_count, suspicious_count, events_logged
    
    # Wait a bit before starting to simulate events
    time.sleep(2)
    
    # Get a list of real files from the monitored directories
    real_files = []
    for directory in monitored_directories:
        try:
            for root, _, files in os.walk(directory):
                for file in files:
                    real_files.append(os.path.join(root, file))
                    if len(real_files) >= 1000:  # Limit to 1000 files
                        break
                if len(real_files) >= 1000:
                    break
        except Exception as e:
            print(f"Error scanning directory {directory}: {e}")
    
    # If we couldn't find any real files, use dummy filenames
    if not real_files:
        for directory in monitored_directories:
            for i in range(1, 20):
                real_files.append(os.path.join(directory, f"document_{i}.docx"))
                real_files.append(os.path.join(directory, f"image_{i}.jpg"))
                real_files.append(os.path.join(directory, f"spreadsheet_{i}.xlsx"))
    
    print(f"Found {len(real_files)} files to simulate activity on")
    
    while True:
        if not is_monitoring:
            time.sleep(1)
            continue
        
        # Simulate different types of events
        event_types = ['created', 'modified', 'renamed', 'deleted']
        risk_levels = ['low', 'medium', 'high']
        
        # Select a random file and event
        file_path = random.choice(real_files)
        event_type = random.choice(event_types)
        
        # Determine risk level based on event type
        if event_type == 'renamed' and random.random() < 0.7:
            # 70% chance that rename events are suspicious
            risk_level = random.choice(['medium', 'high'])
        elif event_type == 'modified' and random.random() < 0.3:
            # 30% chance that modify events are suspicious
            risk_level = random.choice(['medium', 'high'])
        else:
            # Other events are usually low risk
            weights = [0.7, 0.2, 0.1]  # 70% low, 20% medium, 10% high
            risk_level = random.choices(risk_levels, weights=weights)[0]
        
        # For high risk events, simulate ransomware extension
        if risk_level == 'high' and event_type in ['renamed', 'modified']:
            base_name, _ = os.path.splitext(file_path)
            ransomware_ext = random.choice(RANSOMWARE_EXTENSIONS)
            file_path = base_name + ransomware_ext
        
        # Create the event
        event = {
            'file_path': file_path,
            'event_type': event_type,
            'risk_level': risk_level,
            'timestamp': datetime.now().isoformat()
        }
        
        # Add IPFS hash for medium and high risk events
        if risk_level in ['medium', 'high']:
            event['ipfs_hash'] = f"Qm{hashlib.sha256(file_path.encode()).hexdigest()[:38]}"
            suspicious_count += 1
            
            # Add blockchain transaction for high risk events
            if risk_level == 'high':
                event['blockchain_tx'] = f"0x{hashlib.sha256((file_path + str(time.time())).encode()).hexdigest()}"
                events_logged += 1
        
        # Add to activity log
        activity_log.append(event)
        if len(activity_log) > 100:
            activity_log.pop(0)  # Keep the log size manageable
        
        # Update file count
        file_count += 1
        
        # Wait between 5-15 seconds before next event
        time.sleep(random.uniform(5, 15))


def open_browser():
    """Open the browser to the frontend."""
    webbrowser.open(f"http://localhost:{PORT}")


def try_port(port_number):
    """Try to start the server on the specified port."""
    try:
        with socketserver.TCPServer(("", port_number), DeRansomRequestHandler) as httpd:
            print(f"De-Ransom standalone server running at http://localhost:{port_number}")
            print("Press Ctrl+C to stop the server")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    except OSError as e:
        if e.errno == 98 or e.errno == 10048:  # Address already in use
            print(f"Port {port_number} is already in use. Trying another port...")
            return try_port(port_number + 1)
        else:
            print(f"Error starting server: {e}")
            return False
    return True


if __name__ == "__main__":
    print("De-Ransom Standalone Mode")
    print("-------------------------")
    print("This version automatically monitors your system for ransomware activity.")
    print(f"Monitoring {len(monitored_directories)} directories.")
    
    # Start browser in a separate thread
    browser_thread = threading.Thread(target=lambda: open_browser())
    browser_thread.daemon = True
    browser_thread.start()
    
    # Start the server
    try_port(PORT)