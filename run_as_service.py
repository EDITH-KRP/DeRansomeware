"""
De-Ransom Background Service
---------------------------
This script runs De-Ransom as a background service that continuously monitors
directories for ransomware activity.
"""

import os
import sys
import time
import json
import logging
import threading
from datetime import datetime

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import our custom modules
from backend.simple_detector import FileMonitor
from backend.blockchain import BlockchainLogger
from backend.filebase_uploader import FilebaseUploader
from backend.config import (
    ACTIVITY_LOG_FILE, CONTRACT_ADDRESS, BLOCKCHAIN_NETWORK,
    LOG_LEVEL, LOG_FILE
)

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger('de-ransom-service')

# Initialize components
file_monitors = {}
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

# Event handler for suspicious activity
def on_suspicious_activity(event):
    """
    Handle suspicious file activity detected by the monitor.
    
    Args:
        event (dict): Event data containing file path, event type, and risk level
    """
    logger.warning(f"Suspicious activity detected: {event}")
    
    # Add timestamp
    event['timestamp'] = datetime.now().isoformat()
    
    # For high-risk events, backup to IPFS and log to blockchain
    if event['risk_level'] in ['high', 'medium']:
        # Upload to IPFS via Filebase if file exists
        if os.path.exists(event['file_path']) and os.path.isfile(event['file_path']):
            try:
                ipfs_hash = filebase_uploader.upload_file(event['file_path'])
                event['ipfs_hash'] = ipfs_hash
                logger.info(f"File backed up to IPFS: {ipfs_hash}")
                
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
                        logger.info(f"Event logged to blockchain. TX Hash: {tx_hash}")
                        logger.info(f"View on Etherscan: {event['etherscan_link']}")
                    except Exception as e:
                        logger.error(f"Error logging to blockchain: {str(e)}")
                        event['blockchain_error'] = str(e)
            except Exception as e:
                logger.error(f"Error backing up file to IPFS: {str(e)}")
                event['ipfs_error'] = str(e)
    
    # Add to activity log
    activity_log.append(event)
    
    # Save to log file
    with open(ACTIVITY_LOG_FILE, 'w') as f:
        json.dump(activity_log, f, indent=2)
    
    # In a real service, we would also send notifications here
    # For example, via email, SMS, or push notifications

def load_monitored_directories():
    """Load the list of directories to monitor from configuration."""
    config_path = os.path.join(os.path.dirname(__file__), 'config', 'monitored_directories.txt')
    
    if not os.path.exists(config_path):
        logger.warning(f"Monitored directories config not found: {config_path}")
        return []
    
    try:
        with open(config_path, 'r') as f:
            directories = [line.strip() for line in f if line.strip() and not line.startswith('#')]
        
        # Filter out directories that don't exist
        valid_directories = []
        for directory in directories:
            if os.path.isdir(directory):
                valid_directories.append(directory)
            else:
                logger.warning(f"Directory does not exist: {directory}")
        
        return valid_directories
    except Exception as e:
        logger.error(f"Error loading monitored directories: {str(e)}")
        return []

def start_monitoring(directory):
    """Start monitoring a directory for ransomware activity."""
    global file_monitors
    
    if directory in file_monitors and file_monitors[directory].is_running:
        logger.info(f"Already monitoring directory: {directory}")
        return True
    
    try:
        # Create and start new file monitor
        file_monitors[directory] = FileMonitor(directory, on_suspicious_activity)
        success = file_monitors[directory].start()
        
        if success:
            logger.info(f"Started monitoring directory: {directory}")
        else:
            logger.error(f"Failed to start monitoring directory: {directory}")
        
        return success
    except Exception as e:
        logger.error(f"Error starting monitoring for directory {directory}: {str(e)}")
        return False

def stop_monitoring(directory):
    """Stop monitoring a directory."""
    global file_monitors
    
    if directory in file_monitors and file_monitors[directory].is_running:
        try:
            file_monitors[directory].stop()
            logger.info(f"Stopped monitoring directory: {directory}")
            return True
        except Exception as e:
            logger.error(f"Error stopping monitoring for directory {directory}: {str(e)}")
            return False
    else:
        logger.warning(f"Not monitoring directory: {directory}")
        return False

def stop_all_monitoring():
    """Stop all active monitors."""
    global file_monitors
    
    for directory, monitor in file_monitors.items():
        if monitor.is_running:
            try:
                monitor.stop()
                logger.info(f"Stopped monitoring directory: {directory}")
            except Exception as e:
                logger.error(f"Error stopping monitoring for directory {directory}: {str(e)}")

def run_service():
    """Run the De-Ransom service."""
    logger.info("Starting De-Ransom background service")
    
    try:
        # Load directories to monitor
        directories = load_monitored_directories()
        
        if not directories:
            logger.warning("No directories configured for monitoring")
            logger.info("Add directories to config/monitored_directories.txt")
        
        # Start monitoring each directory
        for directory in directories:
            start_monitoring(directory)
        
        # Keep the service running
        logger.info("De-Ransom service is running. Press Ctrl+C to stop.")
        
        try:
            while True:
                # Check if any monitors have stopped and restart them
                for directory, monitor in file_monitors.items():
                    if not monitor.is_running:
                        logger.warning(f"Monitor for {directory} has stopped. Restarting...")
                        start_monitoring(directory)
                
                # Sleep for a while
                time.sleep(60)
        except KeyboardInterrupt:
            logger.info("Received stop signal. Shutting down...")
            stop_all_monitoring()
    
    except Exception as e:
        logger.error(f"Error in De-Ransom service: {str(e)}")
        stop_all_monitoring()

if __name__ == "__main__":
    run_service()