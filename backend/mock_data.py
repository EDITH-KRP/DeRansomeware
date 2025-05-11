"""
De-Ransom Mock Data Generator
----------------------------
This module provides mock data for the De-Ransom application.
It simulates ransomware detection events for demonstration purposes.
"""

import os
import time
import random
import hashlib
import threading
from datetime import datetime

# Global variables
is_generating = False
mock_events = []
event_callback = None

# Common ransomware extensions
RANSOMWARE_EXTENSIONS = [
    '.encrypted', '.enc', '.crypted', '.crypt', '.crypto', '.locked', '.lock',
    '.ryk', '.ryuk', '.lck', '.locky', '.wncry', '.wannacry', '.wcry',
    '.cryp1', '.zepto', '.cerber', '.cerber3', '.crab', '.sage', '.globe'
]

def start_mock_data_generation(callback=None, directory=None):
    """
    Start generating mock data.
    
    Args:
        callback (function): Function to call with each generated event
        directory (str): Directory to simulate events for
    
    Returns:
        bool: True if started successfully, False otherwise
    """
    global is_generating, event_callback
    
    if is_generating:
        return False
    
    is_generating = True
    event_callback = callback
    
    # Start the generation thread
    thread = threading.Thread(target=_generate_mock_events, args=(directory,), daemon=True)
    thread.start()
    
    return True

def stop_mock_data_generation():
    """
    Stop generating mock data.
    
    Returns:
        bool: True if stopped successfully, False otherwise
    """
    global is_generating
    
    if not is_generating:
        return False
    
    is_generating = False
    return True

def get_mock_events():
    """
    Get all generated mock events.
    
    Returns:
        list: List of mock events
    """
    return mock_events

def _generate_mock_events(directory=None):
    """
    Generate mock events in a separate thread.
    
    Args:
        directory (str): Directory to simulate events for
    """
    global mock_events, is_generating
    
    # Event types
    event_types = ['created', 'modified', 'renamed', 'deleted']
    risk_levels = ['low', 'medium', 'high']
    
    # Get some real files to simulate events on
    real_files = []
    if directory and os.path.isdir(directory):
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
            os.path.join(directory or os.path.expanduser("~"), f"document_{i}.docx") 
            for i in range(1, 20)
        ]
    
    print(f"Found {len(real_files)} files for mock data simulation")
    
    while is_generating:
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
            file_path = base_name + random.choice(RANSOMWARE_EXTENSIONS)
        
        # Create the event
        event = {
            'file_path': file_path,
            'event_type': event_type,
            'risk_level': risk_level,
            'detection_time': time.time(),
            'timestamp': datetime.now().isoformat()
        }
        
        # Add detection reasons
        if risk_level == 'high':
            if '.encrypted' in file_path or '.enc' in file_path:
                event['detection_reasons'] = ['File has a known ransomware extension']
            else:
                event['detection_reasons'] = ['Suspicious file operation detected']
        elif risk_level == 'medium':
            event['detection_reasons'] = ['Multiple files modified in rapid succession']
        
        # Add IPFS hash for medium and high risk events
        if risk_level in ['medium', 'high']:
            event['ipfs_hash'] = f"Qm{hashlib.sha256(file_path.encode()).hexdigest()[:38]}"
            
            # Add blockchain transaction for high risk events
            if risk_level == 'high':
                event['blockchain_tx'] = f"0x{hashlib.sha256((file_path + str(time.time())).encode()).hexdigest()}"
        
        # Add to mock events
        mock_events.append(event)
        if len(mock_events) > 100:
            mock_events.pop(0)
        
        # Call the callback if provided
        if event_callback:
            event_callback(event)
        
        # Wait between events
        time.sleep(random.uniform(5, 10))

# Mock file monitor class that uses the mock data generator
class MockFileMonitor:
    """
    A mock file monitor that simulates file system events.
    """
    
    def __init__(self, directory, callback=None):
        """
        Initialize the mock file monitor.
        
        Args:
            directory (str): The directory to simulate monitoring for
            callback (function): Function to call when events are generated
        """
        self.directory = directory
        self.callback = callback
        self.is_running = False
        
        print(f"Initialized mock file monitor for directory: {directory}")
        print("Running in MOCK monitoring mode - simulated file system events will be generated")
    
    def start(self):
        """Start generating mock events."""
        if self.is_running:
            return False
        
        self.is_running = True
        
        try:
            # Start the mock data generator
            start_mock_data_generation(self.callback, self.directory)
            
            print(f"Started mock monitoring for directory: {self.directory}")
            return True
        except Exception as e:
            import traceback
            print(f"Error starting mock monitoring: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            self.is_running = False
            return False
    
    def stop(self):
        """Stop generating mock events."""
        if self.is_running:
            self.is_running = False
            stop_mock_data_generation()
            print(f"Stopped mock monitoring for directory: {self.directory}")