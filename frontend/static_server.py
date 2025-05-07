"""
Simple HTTP Server for De-Ransom Frontend
----------------------------------------
This script provides a simple HTTP server to serve the frontend files.
"""

import os
import sys
import http.server
import socketserver
import webbrowser
from threading import Thread

# Get the directory of this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

class SimpleHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom request handler that serves files from the frontend directory."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SCRIPT_DIR, **kwargs)
    
    def log_message(self, format, *args):
        """Suppress log messages."""
        pass

def start_server(port=8000):
    """Start the HTTP server on the specified port."""
    try:
        with socketserver.TCPServer(("", port), SimpleHTTPRequestHandler) as httpd:
            print(f"Serving frontend at http://localhost:{port}")
            print("Press Ctrl+C to stop the server")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"Port {port} is already in use. Trying another port...")
            start_server(port + 1)
        else:
            print(f"Error starting server: {e}")

def open_browser(port=8000):
    """Open the browser to the frontend."""
    webbrowser.open(f"http://localhost:{port}")

if __name__ == "__main__":
    port = 8000
    
    # Start browser in a separate thread
    browser_thread = Thread(target=lambda: open_browser(port))
    browser_thread.daemon = True
    browser_thread.start()
    
    # Start the server
    start_server(port)