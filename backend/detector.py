"""
De-Ransom File Monitoring System
---------------------------------------------------
This module provides real-time file system monitoring to detect potential ransomware activity.
"""

import os
import time
import hashlib
import threading
import re
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Common ransomware file extensions
RANSOMWARE_EXTENSIONS = [
    '.encrypted', '.enc', '.crypted', '.crypt', '.crypto', '.locked', '.lock',
    '.ryk', '.ryuk', '.lck', '.locky', '.wncry', '.wannacry', '.wcry',
    '.cryp1', '.zepto', '.cerber', '.cerber3', '.crab', '.sage', '.globe'
]

# Suspicious file operations patterns
SUSPICIOUS_PATTERNS = [
    # File content completely changed (entropy change)
    {'name': 'content_entropy_change', 'risk': 'high'},
    
    # Multiple files modified in rapid succession
    {'name': 'rapid_succession', 'risk': 'medium', 'threshold': 10, 'timeframe': 5},
    
    # Files renamed to known ransomware extensions
    {'name': 'ransomware_extension', 'risk': 'high'},
    
    # Original file deleted after a new version created
    {'name': 'delete_after_create', 'risk': 'medium'},
    
    # Unusual file access patterns (e.g., reading many files sequentially)
    {'name': 'sequential_access', 'risk': 'medium', 'threshold': 15, 'timeframe': 10},
    
    # Creation of ransom note files
    {'name': 'ransom_note', 'risk': 'high', 
     'patterns': ['readme.txt', 'help_decrypt', 'how_to_decrypt', 'ransom', 'recover']},
]

class RansomwareDetector:
    """Analyzes file events to detect potential ransomware activity."""
    
    def __init__(self):
        self.recent_events = []  # Store recent events for pattern detection
        self.file_hashes = {}    # Store file hashes for change detection
        self.lock = threading.Lock()
        
    def analyze_event(self, event):
        """
        Analyze a file event to determine if it's suspicious.
        
        Args:
            event (dict): File event data
            
        Returns:
            dict: Analysis results with risk level
        """
        file_path = event['file_path']
        event_type = event['event_type']
        risk_level = 'low'  # Default risk level
        detection_reasons = []
        
        # Store the event for pattern analysis
        with self.lock:
            self.recent_events.append({
                'path': file_path,
                'type': event_type,
                'time': time.time()
            })
            
            # Keep only events from the last 30 seconds
            cutoff_time = time.time() - 30
            self.recent_events = [e for e in self.recent_events if e['time'] > cutoff_time]
        
        # Check for known ransomware extensions
        if self._check_ransomware_extension(file_path):
            risk_level = 'high'
            detection_reasons.append('File has a known ransomware extension')
        
        # Check for ransom note files
        if self._check_ransom_note(file_path):
            risk_level = 'high'
            detection_reasons.append('Potential ransom note created')
        
        # Check for rapid file modifications
        if self._check_rapid_modifications():
            risk_level = max(risk_level, 'medium')
            detection_reasons.append('Multiple files modified in rapid succession')
        
        # For modified files, check content changes
        if event_type == 'modified' and os.path.exists(file_path) and os.path.isfile(file_path):
            # Check if we have a previous hash
            old_hash = self.file_hashes.get(file_path)
            new_hash = self._calculate_file_hash(file_path)
            
            if old_hash and new_hash and old_hash != new_hash:
                # File content changed, check entropy
                if self._check_entropy_change(file_path):
                    risk_level = 'high'
                    detection_reasons.append('File content shows signs of encryption')
            
            # Update the hash
            if new_hash:
                self.file_hashes[file_path] = new_hash
        
        # For new files, store their hash
        elif event_type == 'created' and os.path.exists(file_path) and os.path.isfile(file_path):
            new_hash = self._calculate_file_hash(file_path)
            if new_hash:
                self.file_hashes[file_path] = new_hash
        
        # Update the event with risk assessment
        event['risk_level'] = risk_level
        if detection_reasons:
            event['detection_reasons'] = detection_reasons
        
        return event
    
    def _check_ransomware_extension(self, file_path):
        """Check if the file has a known ransomware extension."""
        _, ext = os.path.splitext(file_path.lower())
        return ext in RANSOMWARE_EXTENSIONS
    
    def _check_ransom_note(self, file_path):
        """Check if the file matches patterns of ransom notes."""
        filename = os.path.basename(file_path).lower()
        for pattern in SUSPICIOUS_PATTERNS:
            if pattern['name'] == 'ransom_note':
                for note_pattern in pattern['patterns']:
                    if note_pattern in filename:
                        return True
        return False
    
    def _check_rapid_modifications(self):
        """Check if many files were modified in a short time period."""
        with self.lock:
            # Get events in the last 5 seconds
            recent_time = time.time() - 5
            recent_mods = [e for e in self.recent_events 
                          if e['time'] > recent_time and e['type'] in ['modified', 'created']]
            
            # If more than 10 files were modified in 5 seconds, it's suspicious
            return len(recent_mods) >= 10
    
    def _check_entropy_change(self, file_path):
        """
        Check if file content shows signs of encryption (high entropy).
        This is a simplified check - real implementation would be more sophisticated.
        """
        try:
            # Read a sample of the file
            with open(file_path, 'rb') as f:
                data = f.read(4096)  # Read first 4KB
            
            if not data:
                return False
                
            # Calculate simple entropy measure
            entropy = 0
            byte_counts = {}
            for byte in data:
                byte_counts[byte] = byte_counts.get(byte, 0) + 1
            
            for count in byte_counts.values():
                probability = count / len(data)
                entropy -= probability * (probability.bit_length() or 1)
            
            # High entropy (closer to 8) suggests encrypted or compressed data
            return entropy > 7.0
        except:
            return False


class FileEventHandler(FileSystemEventHandler):
    """Handles file system events and passes them to the callback function."""
    
    def __init__(self, callback=None, detector=None):
        self.callback = callback
        self.detector = detector
    
    def on_created(self, event):
        if event.is_directory:
            return
        
        file_event = {
            'file_path': event.src_path,
            'event_type': 'created',
            'detection_time': time.time()
        }
        
        # Analyze the event for suspicious patterns
        if self.detector:
            file_event = self.detector.analyze_event(file_event)
        
        # Call the callback with the event
        if self.callback:
            self.callback(file_event)
    
    def on_modified(self, event):
        if event.is_directory:
            return
        
        file_event = {
            'file_path': event.src_path,
            'event_type': 'modified',
            'detection_time': time.time()
        }
        
        # Analyze the event for suspicious patterns
        if self.detector:
            file_event = self.detector.analyze_event(file_event)
        
        # Call the callback with the event
        if self.callback:
            self.callback(file_event)
    
    def on_deleted(self, event):
        if event.is_directory:
            return
        
        file_event = {
            'file_path': event.src_path,
            'event_type': 'deleted',
            'detection_time': time.time()
        }
        
        # Analyze the event for suspicious patterns
        if self.detector:
            file_event = self.detector.analyze_event(file_event)
        
        # Call the callback with the event
        if self.callback:
            self.callback(file_event)
    
    def on_moved(self, event):
        if event.is_directory:
            return
        
        file_event = {
            'file_path': event.dest_path,
            'src_path': event.src_path,
            'event_type': 'renamed',
            'detection_time': time.time()
        }
        
        # Analyze the event for suspicious patterns
        if self.detector:
            file_event = self.detector.analyze_event(file_event)
        
        # Call the callback with the event
        if self.callback:
            self.callback(file_event)


class FileMonitor:
    """
    A class that monitors a directory for file changes that might indicate
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
        self.observer = None
        self.detector = RansomwareDetector()
        
        print(f"Initialized file monitor for directory: {directory}")
        print("Running in REAL monitoring mode - actual file system events will be detected")
    
    def start(self):
        """Start monitoring the directory."""
        if self.is_running:
            return
        
        self.is_running = True
        
        try:
            # Create an observer and event handler
            self.observer = Observer()
            event_handler = FileEventHandler(self.callback, self.detector)
            
            # Schedule the observer to watch the directory recursively
            self.observer.schedule(event_handler, self.directory, recursive=True)
            self.observer.start()
            
            print(f"Started real-time monitoring for directory: {self.directory}")
            
            # Start a thread to scan existing files
            scan_thread = threading.Thread(target=self._initial_scan, daemon=True)
            scan_thread.start()
            
            return True
        except Exception as e:
            import traceback
            print(f"Error starting monitoring: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            self.is_running = False
            return False
    
    def stop(self):
        """Stop monitoring the directory."""
        if self.is_running:
            self.is_running = False
            if self.observer:
                self.observer.stop()
                self.observer.join()
            print(f"Stopped monitoring directory: {self.directory}")
    
    def _initial_scan(self):
        """Scan existing files in the directory to establish baseline."""
        print(f"Scanning existing files in {self.directory}...")
        
        try:
            file_count = 0
            for root, _, files in os.walk(self.directory):
                for file in files:
                    file_path = os.path.join(root, file)
                    file_hash = self._calculate_file_hash(file_path)
                    if file_hash:
                        self.detector.file_hashes[file_path] = file_hash
                    file_count += 1
                    if file_count % 100 == 0:
                        print(f"Scanned {file_count} files...")
            
            print(f"Initial scan complete. {file_count} files indexed.")
        except Exception as e:
            print(f"Error scanning directory: {str(e)}")
    
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


# Add the _calculate_file_hash method to RansomwareDetector class
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

# Add the method to the RansomwareDetector class
RansomwareDetector._calculate_file_hash = _calculate_file_hash


# For testing the module directly
if __name__ == "__main__":
    def print_alert(event):
        risk_level = event['risk_level']
        event_type = event['event_type']
        file_path = event['file_path']
        
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
            
        print(alert)
    
    # Get directory to monitor from user input
    directory = input("Enter directory to monitor: ")
    if os.path.isdir(directory):
        print("\n=== Real-time Ransomware Detection ===")
        print("This tool monitors file system activity and detects potential ransomware behavior.")
        print("To test, try the following:")
        print("1. Create a new file with a ransomware extension (e.g., document.encrypted)")
        print("2. Rename an existing file to add a ransomware extension")
        print("3. Create a file named 'how_to_decrypt.txt' or 'ransom_note.txt'")
        print("4. Rapidly create or modify multiple files")
        print("\nPress Ctrl+C to stop monitoring.\n")
        
        monitor = FileMonitor(directory, print_alert)
        monitor.start()
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            monitor.stop()
            print("\nMonitoring stopped.")
    else:
        print("Invalid directory path.")