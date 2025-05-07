"""
De-Ransom File Monitoring System (Simplified Version)
---------------------------------------------------
This module provides simulated file system monitoring for demonstration purposes.
"""

import os
import time
import hashlib
import threading
import random
from datetime import datetime

# Common ransomware file extensions
RANSOMWARE_EXTENSIONS = [
    '.encrypted', '.enc', '.crypted', '.crypt', '.crypto', '.locked', '.lock',
    '.ryk', '.ryuk', '.lck', '.locky', '.wncry', '.wannacry', '.wcry',
    '.cryp1', '.zepto', '.cerber', '.cerber3', '.crab', '.sage', '.globe'
]

class FileMonitor:
    """
    A class that simulates monitoring a directory for file changes that might indicate
    ransomware activity.
    """
    
    def __init__(self, directory, callback=None):
        """
        Initialize the file monitor.
        
        Args:
            directory (str): The directory to monitor
            callback (function): Function to call when suspicious activity is detected
        """
        self.directory = directory
        self.callback = callback
        self.is_running = False
        self.thread = None
        self.file_hashes = {}  # Store file hashes for change detection
        
        print(f"Initialized file monitor for directory: {directory}")
        print("NOTE: Running in simulation mode - no actual file monitoring will occur")
    
    def start(self):
        """Start monitoring the directory."""
        if self.is_running:
            return
        
        self.is_running = True
        self.thread = threading.Thread(target=self._simulation_loop, daemon=True)
        self.thread.start()
        
        print(f"Started simulated monitoring for directory: {self.directory}")
        
        # Start a thread to scan existing files
        threading.Thread(target=self._initial_scan, daemon=True).start()
    
    def stop(self):
        """Stop monitoring the directory."""
        if self.is_running:
            self.is_running = False
            if self.thread:
                self.thread.join(timeout=1.0)
            print(f"Stopped monitoring directory: {self.directory}")
    
    def _initial_scan(self):
        """Scan existing files in the directory to establish baseline."""
        print(f"Scanning existing files in {self.directory}...")
        
        try:
            file_count = 0
            for root, _, files in os.walk(self.directory):
                for file in files:
                    file_count += 1
                    if file_count > 100:  # Limit to 100 files for performance
                        break
            
            print(f"Initial scan complete. {file_count} files found.")
        except Exception as e:
            print(f"Error scanning directory: {str(e)}")
    
    def _simulation_loop(self):
        """Simulate file events for demonstration purposes."""
        # Wait a bit before starting to simulate events
        time.sleep(5)
        
        # Get some real files from the directory to use in simulations
        real_files = []
        try:
            for root, _, files in os.walk(self.directory):
                for file in files:
                    real_files.append(os.path.join(root, file))
                    if len(real_files) >= 10:  # Get up to 10 real files
                        break
                if len(real_files) >= 10:
                    break
        except Exception:
            # If we can't get real files, use dummy filenames
            real_files = [
                os.path.join(self.directory, f"document_{i}.docx") 
                for i in range(1, 6)
            ]
            real_files.extend([
                os.path.join(self.directory, f"image_{i}.jpg") 
                for i in range(1, 4)
            ])
            real_files.append(os.path.join(self.directory, "spreadsheet.xlsx"))
            real_files.append(os.path.join(self.directory, "presentation.pptx"))
        
        # Event simulation loop
        while self.is_running:
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
            
            # Call the callback with the simulated event
            if self.callback:
                self.callback({
                    'file_path': file_path,
                    'event_type': event_type,
                    'risk_level': risk_level,
                    'detection_time': time.time()
                })
            
            # Wait between 5-15 seconds before next event
            time.sleep(random.uniform(5, 15))
    
    def _calculate_file_hash(self, file_path, block_size=65536):
        """
        Calculate SHA-256 hash of a file.
        
        Args:
            file_path (str): Path to the file
            block_size (int): Size of blocks to read
            
        Returns:
            str: Hex digest of file hash
        """
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            return None
        
        try:
            hasher = hashlib.sha256()
            with open(file_path, 'rb') as file:
                buf = file.read(block_size)
                while len(buf) > 0:
                    hasher.update(buf)
                    buf = file.read(block_size)
            return hasher.hexdigest()
        except (PermissionError, OSError):
            # Can't read the file, skip it
            return None


# For testing the module directly
if __name__ == "__main__":
    def print_alert(event):
        print(f"ALERT: {event['risk_level']} risk - {event['event_type']} on {event['file_path']}")
    
    # Get directory to monitor from user input
    directory = input("Enter directory to monitor: ")
    if os.path.isdir(directory):
        monitor = FileMonitor(directory, print_alert)
        monitor.start()
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            monitor.stop()
            print("Monitoring stopped.")
    else:
        print("Invalid directory path.")