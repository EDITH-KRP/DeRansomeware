"""
De-Ransom Configuration
---------------------
This module contains configuration settings for the De-Ransom application.
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Application settings
APP_NAME = "De-Ransom"
APP_VERSION = "0.1.0"
DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")

# File monitoring settings
MONITOR_INTERVAL = 1.0  # seconds
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB max file size for backup
IGNORED_DIRECTORIES = [
    ".git", "node_modules", "__pycache__", "venv", 
    "env", ".vscode", ".idea", "build", "dist"
]
IGNORED_EXTENSIONS = [
    ".pyc", ".pyo", ".pyd", ".so", ".dll", ".exe", 
    ".bin", ".dat", ".db", ".sqlite", ".log"
]

# Risk assessment settings
HIGH_RISK_EXTENSIONS = [
    ".encrypted", ".enc", ".crypted", ".crypt", ".crypto", ".locked", ".lock",
    ".ryk", ".ryuk", ".lck", ".locky", ".wncry", ".wannacry", ".wcry",
    ".cryp1", ".zepto", ".cerber", ".cerber3", ".crab", ".sage", ".globe"
]
SUSPICIOUS_PATTERNS = [
    "README_FOR_DECRYPT", "HOW_TO_DECRYPT", "YOUR_FILES_ARE_ENCRYPTED",
    "DECRYPT_INSTRUCTION", "DECRYPT_YOUR_FILES"
]

# Blockchain settings
BLOCKCHAIN_NETWORK = os.getenv("BLOCKCHAIN_NETWORK", "sepolia")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "")
WEB3_PROVIDER_URI = os.getenv("WEB3_PROVIDER_URI", "")
INFURA_API_KEY = os.getenv("INFURA_API_KEY", "")
ETHEREUM_PRIVATE_KEY = os.getenv("ETHEREUM_PRIVATE_KEY", "")

# Filebase (IPFS) settings
FILEBASE_ACCESS_KEY = os.getenv("FILEBASE_ACCESS_KEY", "")
FILEBASE_SECRET_KEY = os.getenv("FILEBASE_SECRET_KEY", "")
FILEBASE_BUCKET = os.getenv("FILEBASE_BUCKET", "deransom-backups")
FILEBASE_ENDPOINT = "https://s3.filebase.com"

# Flask settings
FLASK_SECRET_KEY = os.getenv("FLASK_SECRET_KEY", os.urandom(24).hex())
FLASK_HOST = os.getenv("FLASK_HOST", "0.0.0.0")
FLASK_PORT = int(os.getenv("FLASK_PORT", "5000"))

# Logging settings
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = os.path.join(os.path.dirname(__file__), "logs", "deransom.log")
ACTIVITY_LOG_FILE = os.path.join(os.path.dirname(__file__), "logs", "activity_log.json")

# Ensure log directory exists
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

# Function to validate configuration
def validate_config():
    """
    Validate the configuration settings.
    
    Returns:
        tuple: (is_valid, missing_keys)
    """
    required_keys = [
        "INFURA_API_KEY",
        "ETHEREUM_PRIVATE_KEY",
        "FILEBASE_ACCESS_KEY",
        "FILEBASE_SECRET_KEY"
    ]
    
    missing_keys = []
    for key in required_keys:
        if not globals().get(key):
            missing_keys.append(key)
    
    return len(missing_keys) == 0, missing_keys


# Print configuration status
if __name__ == "__main__":
    is_valid, missing_keys = validate_config()
    if is_valid:
        print("Configuration is valid.")
    else:
        print(f"Configuration is missing the following keys: {', '.join(missing_keys)}")
        print("Please set these environment variables or add them to your .env file.")