"""
DeRansomeware Windows Service

This script runs DeRansomeware as a Windows service to provide continuous
real-time protection against ransomware attacks.
"""

import os
import sys
import time
import logging
import threading
import win32serviceutil
import win32service
import win32event
import servicemanager
import socket
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
log_file = os.path.join(log_dir, 'deransomeware_service.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger('DeRansomewareService')

class DeRansomewareService(win32serviceutil.ServiceFramework):
    """Windows Service for DeRansomeware"""
    
    _svc_name_ = "DeRansomeware"
    _svc_display_name_ = "DeRansomeware Protection Service"
    _svc_description_ = "Provides real-time protection against ransomware attacks"
    
    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
        socket.setdefaulttimeout(60)
        self.is_running = False
        self.monitors = []
        self.blockchain_logger = None
        
        # Default directories to monitor
        self.default_directories = [
            os.path.join(os.environ['USERPROFILE'], 'Documents'),
            os.path.join(os.environ['USERPROFILE'], 'Desktop'),
            os.path.join(os.environ['USERPROFILE'], 'Pictures'),
            os.path.join(os.environ['USERPROFILE'], 'Downloads')
        ]
        
        # Load custom directories from config file if it exists
        self.config_file = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), 
            'config', 
            'monitored_directories.txt'
        )
        
        # Create config directory if it doesn't exist
        os.makedirs(os.path.dirname(self.config_file), exist_ok=True)
        
        # Create default config file if it doesn't exist
        if not os.path.exists(self.config_file):
            with open(self.config_file, 'w') as f:
                f.write("# Add directories to monitor, one per line\n")
                for directory in self.default_directories:
                    f.write(f"{directory}\n")
    
    def SvcStop(self):
        """Stop the service"""
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.hWaitStop)
        self.is_running = False
        
        # Stop all file monitors
        logger.info("Stopping file monitors...")
        for monitor in self.monitors:
            monitor.stop()
        
        logger.info("DeRansomeware service stopped")
    
    def SvcDoRun(self):
        """Run the service"""
        servicemanager.LogMsg(
            servicemanager.EVENTLOG_INFORMATION_TYPE,
            servicemanager.PYS_SERVICE_STARTED,
            (self._svc_name_, '')
        )
        self.main()
    
    def on_suspicious_activity(self, event):
        """Handle suspicious activity events"""
        risk_level = event.get('risk_level', 'low')
        event_type = event.get('event_type', 'unknown')
        file_path = event.get('file_path', 'unknown')
        
        # Log the event
        if risk_level == 'high':
            logger.warning(f"HIGH RISK: {event_type} on {file_path}")
        elif risk_level == 'medium':
            logger.warning(f"MEDIUM RISK: {event_type} on {file_path}")
        else:
            logger.info(f"LOW RISK: {event_type} on {file_path}")
        
        # Add detection reasons if available
        if 'detection_reasons' in event:
            reasons = ', '.join(event['detection_reasons'])
            logger.info(f"Detection reasons: {reasons}")
        
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
            except Exception as e:
                logger.error(f"Error logging to blockchain: {str(e)}")
    
    def load_monitored_directories(self):
        """Load the list of directories to monitor from config file"""
        directories = []
        
        try:
            with open(self.config_file, 'r') as f:
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
    
    def main(self):
        """Main service function"""
        self.is_running = True
        
        # Initialize blockchain logger
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
        
        # Load directories to monitor
        directories = self.load_monitored_directories()
        
        # Start monitoring each directory
        for directory in directories:
            try:
                logger.info(f"Starting monitoring for directory: {directory}")
                monitor = FileMonitor(directory, self.on_suspicious_activity)
                monitor.start()
                self.monitors.append(monitor)
            except Exception as e:
                logger.error(f"Error monitoring directory {directory}: {str(e)}")
        
        logger.info(f"DeRansomeware service started. Monitoring {len(self.monitors)} directories.")
        
        # Keep the service running until stopped
        while self.is_running:
            # Check if the service should stop
            if win32event.WaitForSingleObject(self.hWaitStop, 5000) == win32event.WAIT_OBJECT_0:
                break
            
            # Log that the service is still running (every hour)
            if int(time.time()) % 3600 < 5:  # Log approximately every hour
                logger.info("DeRansomeware service is running")


if __name__ == '__main__':
    if len(sys.argv) == 1:
        servicemanager.Initialize()
        servicemanager.PrepareToHostSingle(DeRansomewareService)
        servicemanager.StartServiceCtrlDispatcher()
    else:
        win32serviceutil.HandleCommandLine(DeRansomewareService)