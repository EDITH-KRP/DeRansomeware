"""
De-Ransom Windows Production Server
----------------------------------
This script starts the De-Ransom application using Waitress for production on Windows.
"""

import os
import sys
import subprocess
import importlib.util

# Check if Waitress is installed
try:
    import waitress
except ImportError:
    print("Waitress is not installed. Installing now...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "waitress"])

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import configuration
from backend.config import FLASK_HOST, FLASK_PORT, validate_config
from backend.app import app

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
    
    # Number of worker threads
    threads = os.cpu_count() * 2
    if threads > 8:
        threads = 8  # Cap at 8 threads
    
    print(f"Starting De-Ransom production server on {FLASK_HOST}:{FLASK_PORT} with {threads} threads")
    
    # Start Waitress
    from waitress import serve
    serve(app, host=FLASK_HOST, port=int(FLASK_PORT), threads=threads)