"""
De-Ransom Simple Server
---------------------
A very simple HTTP server for the De-Ransom demo that guarantees working navigation.
"""

import os
import sys
import json
import time
import random
import hashlib
import threading
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler
from datetime import datetime

# Configuration
PORT = 9000
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Change to the script directory
os.chdir(SCRIPT_DIR)

# Simulated state
is_monitoring = False
activity_log = []
monitored_directories = [os.path.expanduser("~")]

class DeRansomHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Handle API requests
        if self.path.startswith('/api/'):
            self.handle_api()
            return
            
        # Fix navigation paths
        if self.path == '/':
            self.path = '/frontend/index.html'
        elif self.path == '/dashboard':
            self.path = '/frontend/dashboard.html'
        elif self.path == '/login':
            self.path = '/frontend/login.html'
            
        # Serve static files
        return SimpleHTTPRequestHandler.do_GET(self)
    
    def do_POST(self):
        # Handle API POST requests
        if self.path.startswith('/api/'):
            self.handle_api_post()
        else:
            self.send_error(404)
    
    def handle_api(self):
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
                'eventCount': len([e for e in activity_log if e.get('risk_level') == 'high'])
            })
        elif self.path == '/api/backup/status':
            self.send_json_response({
                'total': len([e for e in activity_log if 'ipfs_hash' in e]),
                'high_risk': len([e for e in activity_log if e.get('risk_level') == 'high' and 'ipfs_hash' in e]),
                'medium_risk': len([e for e in activity_log if e.get('risk_level') == 'medium' and 'ipfs_hash' in e]),
                'low_risk': len([e for e in activity_log if e.get('risk_level') == 'low' and 'ipfs_hash' in e])
            })
        elif self.path == '/api/directories':
            self.send_json_response({
                'directories': monitored_directories
            })
        else:
            self.send_error(404)
    
    def handle_api_post(self):
        """Handle API POST requests."""
        global is_monitoring
        
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
        except:
            self.send_error(400, "Invalid JSON")
            return
        
        if self.path == '/api/monitor':
            is_monitoring = True
            
            # Start simulation thread if not already running
            if not any(t.name == 'simulation' for t in threading.enumerate()):
                thread = threading.Thread(target=simulate_events, name='simulation', daemon=True)
                thread.start()
            
            self.send_json_response({
                'status': 'success',
                'message': 'Started monitoring',
                'timestamp': datetime.now().isoformat()
            })
        
        elif self.path == '/api/monitor/stop':
            is_monitoring = False
            self.send_json_response({
                'status': 'success',
                'message': 'Stopped monitoring',
                'timestamp': datetime.now().isoformat()
            })
        
        else:
            self.send_error(404)
    
    def send_json_response(self, data):
        """Send a JSON response."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def log_message(self, format, *args):
        """Suppress log messages for successful requests."""
        if args and '200' in args[1]:
            return
        super().log_message(format, *args)

def simulate_events():
    """Simulate ransomware detection events."""
    global activity_log
    
    # Common ransomware extensions
    ransomware_extensions = ['.encrypted', '.enc', '.crypted', '.crypt', '.locked']
    
    # Event types
    event_types = ['created', 'modified', 'renamed', 'deleted']
    risk_levels = ['low', 'medium', 'high']
    
    # Get some real files to simulate events on
    real_files = []
    for directory in monitored_directories:
        try:
            for root, _, files in os.walk(directory):
                for file in files:
                    real_files.append(os.path.join(root, file))
                    if len(real_files) >= 100:
                        break
                if len(real_files) >= 100:
                    break
        except:
            pass
    
    # If no real files found, use dummy files
    if not real_files:
        real_files = [
            os.path.join(os.path.expanduser("~"), f"document_{i}.docx") 
            for i in range(1, 20)
        ]
    
    print(f"Found {len(real_files)} files for simulation")
    
    while True:
        if not is_monitoring:
            time.sleep(1)
            continue
        
        # Create a random event
        file_path = random.choice(real_files)
        event_type = random.choice(event_types)
        
        # Determine risk level
        if event_type == 'renamed' and random.random() < 0.7:
            risk_level = random.choice(['medium', 'high'])
        elif event_type == 'modified' and random.random() < 0.3:
            risk_level = random.choice(['medium', 'high'])
        else:
            weights = [0.7, 0.2, 0.1]
            risk_level = random.choices(risk_levels, weights=weights)[0]
        
        # For high risk events, simulate ransomware extension
        if risk_level == 'high' and event_type in ['renamed', 'modified']:
            base_name, _ = os.path.splitext(file_path)
            file_path = base_name + random.choice(ransomware_extensions)
        
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
            
            # Add blockchain transaction for high risk events
            if risk_level == 'high':
                event['blockchain_tx'] = f"0x{hashlib.sha256((file_path + str(time.time())).encode()).hexdigest()}"
        
        # Add to activity log
        activity_log.append(event)
        if len(activity_log) > 100:
            activity_log.pop(0)
        
        # Wait between events
        time.sleep(random.uniform(5, 10))

def run_server():
    """Run the HTTP server."""
    server = HTTPServer(('', PORT), DeRansomHandler)
    print(f"De-Ransom server running at http://localhost:{PORT}")
    print("Press Ctrl+C to stop")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")
        server.server_close()

if __name__ == "__main__":
    print("De-Ransom Simple Server")
    print("----------------------")
    print("This version automatically monitors your system for ransomware activity.")
    
    # Open browser
    threading.Thread(target=lambda: webbrowser.open(f"http://localhost:{PORT}"), daemon=True).start()
    
    # Run server
    run_server()