"""
De-Ransom Production Server
-------------------------
This script starts the De-Ransom application using Gunicorn for production.
"""

import os
import sys
import subprocess
import importlib.util

# Check if Gunicorn is installed
try:
    import gunicorn
except ImportError:
    print("Gunicorn is not installed. Installing now...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "gunicorn"])

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import configuration
from backend.config import FLASK_HOST, FLASK_PORT, validate_config

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
    
    # Number of worker processes
    workers = os.cpu_count() * 2 + 1
    if workers > 8:
        workers = 8  # Cap at 8 workers
    
    print(f"Starting De-Ransom production server on {FLASK_HOST}:{FLASK_PORT} with {workers} workers")
    
    # Start Gunicorn
    subprocess.call([
        "gunicorn",
        "--workers", str(workers),
        "--bind", f"{FLASK_HOST}:{FLASK_PORT}",
        "backend.app:app"
    ])