"""
DeRansomeware System Monitor

This script monitors the entire system for ransomware activity.
It can be run directly without installing as a service.
"""

import os
import sys
import time
import logging
import threading
import argparse
from pathlib import Path

# Add the current directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import our modules
from backend.detector import FileMonitor
from backend.blockchain import BlockchainLogger
from backend.config import BLOCKCHAIN_NETWORK, CONTRACT_ADDRESS

# Set up logging
log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, 'deransomeware_monitor.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger('DeRansomewareMonitor')

class SystemMonitor:
    """Monitors the system for ransomware activity"""
    
    def __init__(self, directories=None, blockchain=True):
        """
        Initialize the system monitor.
        
        Args:
            directories (list): List of directories to monitor
            blockchain (bool): Whether to use blockchain logging
        """
        self.monitors = []
        self.blockchain_logger = None
        self.is_running = False
        
        # Default directories to monitor
        self.default_directories = [
            os.path.join(os.environ['USERPROFILE'], 'Documents'),
            os.path.join(os.environ['USERPROFILE'], 'Desktop'),
            os.path.join(os.environ['USERPROFILE'], 'Pictures'),
            os.path.join(os.environ['USERPROFILE'], 'Downloads')
        ]
        
        # Use provided directories or load from config
        if directories:
            self.directories = directories
        else:
            self.directories = self.load_monitored_directories()
        
        # Initialize blockchain logger if requested
        if blockchain:
            try:
                self.blockchain_logger = BlockchainLogger(
                    network=BLOCKCHAIN_NETWORK,
                    contract_address=CONTRACT_ADDRESS,
                    allow_fallback=True
                )
                logger.info("Blockchain logger initialized")
            except Exception as e:
                logger.error(f"Error initializing blockchain logger: {str(e)}")
                self.blockchain_logger = None
    
    def on_suspicious_activity(self, event):
        """Handle suspicious activity events"""
        risk_level = event.get('risk_level', 'low')
        event_type = event.get('event_type', 'unknown')
        file_path = event.get('file_path', 'unknown')
        
        # Format the alert based on risk level
        if risk_level == 'high':
            alert = f"🚨 HIGH RISK: {event_type} on {file_path}"
        elif risk_level == 'medium':
            alert = f"⚠️ MEDIUM RISK: {event_type} on {file_path}"
        else:
            alert = f"ℹ️ LOW RISK: {event_type} on {file_path}"
            
        # Add detection reasons if available
        if 'detection_reasons' in event:
            alert += f"\n   Reasons: {', '.join(event['detection_reasons'])}"
        
        # Log the event
        if risk_level == 'high':
            logger.warning(alert)
        elif risk_level == 'medium':
            logger.warning(alert)
        else:
            logger.info(alert)
        
        # Print to console
        print(alert)
        
        # Log high-risk events to blockchain
        if risk_level == 'high' and self.blockchain_logger:
            try:
                # Generate a simple hash for the event
                event_hash = f"Event detected at {time.time()}"
                
                # Log to blockchain
                tx_hash = self.blockchain_logger.log_event(
                    file_path=file_path,
                    event_type=event_type,
                    ipfs_hash=event_hash
                )
                
                logger.info(f"Event logged to blockchain. TX Hash: {tx_hash}")
                print(f"Event logged to blockchain. TX Hash: {tx_hash}")
            except Exception as e:
                logger.error(f"Error logging to blockchain: {str(e)}")
                print(f"Error logging to blockchain: {str(e)}")
    
    def load_monitored_directories(self):
        """Load the list of directories to monitor from config file"""
        directories = []
        
        # Config file path
        config_file = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), 
            'config', 
            'monitored_directories.txt'
        )
        
        # Create config directory if it doesn't exist
        os.makedirs(os.path.dirname(config_file), exist_ok=True)
        
        # Create default config file if it doesn't exist
        if not os.path.exists(config_file):
            with open(config_file, 'w') as f:
                f.write("# Add directories to monitor, one per line\n")
                for directory in self.default_directories:
                    f.write(f"{directory}\n")
        
        # Load directories from config file
        try:
            with open(config_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    # Skip comments and empty lines
                    if line and not line.startswith('#'):
                        # Expand environment variables
                        expanded_path = os.path.expandvars(line)
                        if os.path.isdir(expanded_path):
                            directories.append(expanded_path)
                        else:
                            logger.warning(f"Directory not found: {expanded_path}")
        except Exception as e:
            logger.error(f"Error loading monitored directories: {str(e)}")
            # Fall back to default directories
            directories = [d for d in self.default_directories if os.path.isdir(d)]
        
        # If no valid directories were found, use system drive
        if not directories:
            system_drive = os.environ.get('SystemDrive', 'C:')
            directories = [system_drive + '\\']
            logger.warning(f"No valid directories found. Monitoring system drive: {system_drive}")
        
        return directories
    
    def start(self):
        """Start monitoring the system"""
        if self.is_running:
            return
        
        self.is_running = True
        
        # Start monitoring each directory
        for directory in self.directories:
            try:
                logger.info(f"Starting monitoring for directory: {directory}")
                print(f"Starting monitoring for directory: {directory}")
                monitor = FileMonitor(directory, self.on_suspicious_activity)
                success = monitor.start()
                if success:
                    self.monitors.append(monitor)
                else:
                    logger.warning(f"Failed to start monitoring for directory: {directory}")
            except Exception as e:
                logger.error(f"Error monitoring directory {directory}: {str(e)}")
                print(f"Error monitoring directory {directory}: {str(e)}")
        
        logger.info(f"System monitoring started. Monitoring {len(self.monitors)} directories.")
        print(f"System monitoring started. Monitoring {len(self.monitors)} directories.")
        print("Press Ctrl+C to stop monitoring.")
    
    def stop(self):
        """Stop monitoring the system"""
        if not self.is_running:
            return
        
        self.is_running = False
        
        # Stop all file monitors
        logger.info("Stopping file monitors...")
        print("Stopping file monitors...")
        for monitor in self.monitors:
            monitor.stop()
        
        logger.info("System monitoring stopped.")
        print("System monitoring stopped.")

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="DeRansomeware System Monitor")
    parser.add_argument('--directories', '-d', nargs='+', help="Directories to monitor")
    parser.add_argument('--no-blockchain', action='store_true', help="Disable blockchain logging")
    parser.add_argument('--system-drive', action='store_true', help="Monitor the entire system drive")
    
    args = parser.parse_args()
    
    # If system drive flag is set, add it to the directories
    directories = args.directories or []
    if args.system_drive:
        system_drive = os.environ.get('SystemDrive', 'C:')
        directories.append(system_drive + '\\')
    
    # Create and start the monitor
    monitor = SystemMonitor(
        directories=directories if directories else None,
        blockchain=not args.no_blockchain
    )
    
    try:
        monitor.start()
        
        # Keep the script running until Ctrl+C is pressed
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping monitoring...")
        monitor.stop()
        print("Monitoring stopped.")

if __name__ == '__main__':
    main()