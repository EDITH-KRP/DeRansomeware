"""
Simple File System Monitor for Ransomware Detection

This script monitors file system events and detects potential ransomware activity.
It's a simplified version that doesn't depend on complex class structures.
"""

import os
import sys
import time
import logging
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)

# Common ransomware file extensions
RANSOMWARE_EXTENSIONS = [
    '.encrypted', '.enc', '.crypted', '.crypt', '.crypto', '.locked', '.lock',
    '.ryk', '.ryuk', '.lck', '.locky', '.wncry', '.wannacry', '.wcry',
    '.cryp1', '.zepto', '.cerber', '.cerber3', '.crab', '.sage', '.globe'
]

# Ransom note patterns
RANSOM_NOTE_PATTERNS = [
    'readme.txt', 'help_decrypt', 'how_to_decrypt', 'ransom', 'recover', 
    'decrypt', 'restore', 'how_to', 'restore_files'
]

class RansomwareDetectionHandler(FileSystemEventHandler):
    """Handler for file system events to detect ransomware activity"""
    
    def __init__(self):
        self.recent_events = []
        
    def on_any_event(self, event):
        """Handle any file system event"""
        if event.is_directory:
            return
            
        # Store the event for pattern analysis
        self.recent_events.append({
            'path': event.src_path,
            'type': event.event_type,
            'time': time.time()
        })
        
        # Keep only events from the last 30 seconds
        cutoff_time = time.time() - 30
        self.recent_events = [e for e in self.recent_events if e['time'] > cutoff_time]
        
        # Check for rapid file modifications
        recent_mods = [e for e in self.recent_events 
                      if e['time'] > (time.time() - 5) and e['type'] in ['modified', 'created']]
        
        # Analyze the event
        risk_level = 'low'
        reasons = []
        
        # Check for ransomware extensions
        if event.event_type in ['created', 'modified', 'moved']:
            file_path = event.dest_path if hasattr(event, 'dest_path') else event.src_path
            _, ext = os.path.splitext(file_path.lower())
            
            if ext in RANSOMWARE_EXTENSIONS:
                risk_level = 'high'
                reasons.append(f"File has a known ransomware extension: {ext}")
        
        # Check for ransom note creation
        if event.event_type == 'created':
            file_path = event.src_path
            filename = os.path.basename(file_path).lower()
            
            for pattern in RANSOM_NOTE_PATTERNS:
                if pattern in filename:
                    risk_level = 'high'
                    reasons.append(f"Potential ransom note created: {filename}")
                    break
        
        # Check for rapid succession of file operations
        if len(recent_mods) >= 10:
            risk_level = max(risk_level, 'medium')
            reasons.append(f"Multiple files modified in rapid succession: {len(recent_mods)} in 5 seconds")
        
        # Log the event based on risk level
        if risk_level == 'high':
            self._log_event('HIGH', event, reasons)
        elif risk_level == 'medium':
            self._log_event('MEDIUM', event, reasons)
        elif event.event_type in ['created', 'modified', 'moved']:
            self._log_event('LOW', event, reasons)
    
    def _log_event(self, risk_level, event, reasons):
        """Log a file system event with risk assessment"""
        event_type = event.event_type
        file_path = event.dest_path if hasattr(event, 'dest_path') else event.src_path
        
        if risk_level == 'HIGH':
            log_func = logging.warning
            prefix = "🚨 HIGH RISK:"
        elif risk_level == 'MEDIUM':
            log_func = logging.warning
            prefix = "⚠️ MEDIUM RISK:"
        else:
            log_func = logging.info
            prefix = "ℹ️ LOW RISK:"
        
        message = f"{prefix} {event_type} on {file_path}"
        if reasons:
            message += f"\n   Reasons: {', '.join(reasons)}"
        
        log_func(message)

def monitor_directory(path):
    """Monitor a directory for file system events"""
    try:
        logging.info(f"Starting monitoring for directory: {path}")
        
        event_handler = RansomwareDetectionHandler()
        observer = Observer()
        observer.schedule(event_handler, path, recursive=True)
        observer.daemon = True  # Set daemon to True
        observer.start()
        
        logging.info(f"Successfully monitoring directory: {path}")
        return observer
    except Exception as e:
        import traceback
        logging.error(f"Error monitoring directory {path}: {str(e)}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        return None

def main():
    """Main function"""
    print("\n=== DeRansomeware Simple Monitor ===")
    print("This tool monitors file system activity and detects potential ransomware behavior.")
    print("Press Ctrl+C to stop monitoring.\n")
    
    # Default directories to monitor
    default_dirs = [
        os.path.join(os.environ['USERPROFILE'], 'Documents'),
        os.path.join(os.environ['USERPROFILE'], 'Desktop'),
        os.path.join(os.environ['USERPROFILE'], 'Downloads')
    ]
    
    # Add command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == '--system-drive':
            system_drive = os.environ.get('SystemDrive', 'C:')
            default_dirs = [system_drive + '\\']
        else:
            default_dirs = sys.argv[1:]
    
    # Start monitoring each directory
    observers = []
    for directory in default_dirs:
        if os.path.isdir(directory):
            observer = monitor_directory(directory)
            if observer:
                observers.append(observer)
    
    if not observers:
        logging.error("No valid directories to monitor. Exiting.")
        return
    
    logging.info(f"Monitoring {len(observers)} directories. Press Ctrl+C to stop.")
    
    try:
        # Keep the script running until Ctrl+C is pressed
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logging.info("Stopping monitoring...")
        for observer in observers:
            observer.stop()
        
        # Wait for all observers to stop
        for observer in observers:
            observer.join()
        
        logging.info("Monitoring stopped.")

if __name__ == '__main__':
    main()