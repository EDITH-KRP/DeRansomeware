"""
Simple File System Monitor for Ransomware Detection

This module provides a file system monitoring system that doesn't rely on watchdog,
making it compatible with all Python versions.
"""

import os
import time
import hashlib
import threading
import re
from datetime import datetime

# Common ransomware file extensions
RANSOMWARE_EXTENSIONS = [
    '.encrypted', '.enc', '.crypted', '.crypt', '.crypto', '.locked', '.lock',
    '.ryk', '.ryuk', '.lck', '.locky', '.wncry', '.wannacry', '.wcry',
    '.cryp1', '.zepto', '.cerber', '.cerber3', '.crab', '.sage', '.globe'
]

# Ransom note patterns
RANSOM_NOTE_PATTERNS = [
    'readme.txt', 'help_decrypt', 'how_to_decrypt', 'ransom', 'recover', 
    'decrypt', 'restore', 'how_to', 'payment'
]

class RansomwareDetector:
    """Analyzes file events to detect potential ransomware activity."""
    
    def __init__(self):
        self.recent_events = []  # Store recent events for pattern detection
        self.file_hashes = {}    # Store file hashes for change detection
        self.lock = threading.Lock()
    
    def has_ransomware_extension(self, file_path):
        """Check if the file has a known ransomware extension."""
        _, ext = os.path.splitext(file_path.lower())
        return ext in RANSOMWARE_EXTENSIONS
    
    def is_potential_ransom_note(self, file_path):
        """Check if the file matches patterns of ransom notes."""
        filename = os.path.basename(file_path).lower()
        return any(pattern in filename for pattern in RANSOM_NOTE_PATTERNS)
    
    def check_rapid_modifications(self, recent_events, timeframe=5, threshold=10):
        """Check if many files were modified in a short time period."""
        # Get events in the specified timeframe
        recent_time = time.time() - timeframe
        recent_mods = [e for e in recent_events 
                      if e['time'] > recent_time and e['type'] in ['modified', 'created']]
        
        # If more than threshold files were modified in timeframe seconds, it's suspicious
        return len(recent_mods) >= threshold
    
    def check_entropy(self, file_path):
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

class FileMonitor:
    """Monitor a directory for file system events using periodic scanning."""
    
    def __init__(self, directory, callback):
        """
        Initialize the file monitor.
        
        Args:
            directory (str): Directory to monitor
            callback (function): Function to call when an event is detected
        """
        self.directory = directory
        self.callback = callback
        self.is_running = False
        self.detector = RansomwareDetector()
        self.file_info = {}  # Store file info (hash, size, mtime)
        self.recent_events = []  # Store recent events for pattern detection
        self.scan_interval = 2  # Seconds between scans
        self.scan_thread = None
        
        print(f"Initialized file monitor for directory: {directory}")
        print("Running in SCAN monitoring mode - periodic scanning for file changes")
    
    def start(self):
        """Start monitoring the directory."""
        if self.is_running:
            return True
        
        self.is_running = True
        
        try:
            # Start a thread to scan the directory periodically
            self.scan_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
            self.scan_thread.start()
            
            print(f"Started monitoring for directory: {self.directory}")
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
            print(f"Stopped monitoring for directory: {self.directory}")
    
    def _monitoring_loop(self):
        """Main monitoring loop that scans for changes periodically."""
        # Perform initial scan
        self._initial_scan()
        
        # Monitor loop
        while self.is_running:
            try:
                # Scan for changes
                self._scan_for_changes()
                
                # Wait before next scan
                time.sleep(self.scan_interval)
            except Exception as e:
                print(f"Error during monitoring loop: {str(e)}")
                # Continue monitoring despite errors
    
    def _initial_scan(self):
        """Scan the directory for existing files."""
        print(f"Scanning directory for existing files: {self.directory}")
        file_count = 0
        
        try:
            for root, _, files in os.walk(self.directory):
                for filename in files:
                    file_path = os.path.join(root, filename)
                    
                    try:
                        # Get file info
                        if os.path.exists(file_path) and os.path.isfile(file_path):
                            stat = os.stat(file_path)
                            file_hash = self._calculate_file_hash(file_path)
                            
                            if file_hash:
                                self.file_info[file_path] = {
                                    'hash': file_hash,
                                    'size': stat.st_size,
                                    'mtime': stat.st_mtime
                                }
                                file_count += 1
                                
                                # Check if the file has a suspicious extension
                                if self.detector.has_ransomware_extension(file_path):
                                    self.callback({
                                        'event_type': 'existing_file',
                                        'file_path': file_path,
                                        'risk_level': 'high',
                                        'detection_reasons': ['File has a known ransomware extension']
                                    })
                                
                                # Check if the file is a potential ransom note
                                if self.detector.is_potential_ransom_note(file_path):
                                    self.callback({
                                        'event_type': 'existing_file',
                                        'file_path': file_path,
                                        'risk_level': 'high',
                                        'detection_reasons': ['File appears to be a ransom note']
                                    })
                    except (PermissionError, OSError):
                        # Skip files we can't access
                        pass
            
            print(f"Initial scan complete. {file_count} files indexed.")
        except Exception as e:
            print(f"Error scanning directory: {str(e)}")
    
    def _scan_for_changes(self):
        """Scan for file changes and detect suspicious activity."""
        try:
            # Track file events
            created_files = []
            modified_files = []
            deleted_files = []
            
            # Get current files
            current_files = set()
            for root, _, files in os.walk(self.directory):
                for filename in files:
                    file_path = os.path.join(root, filename)
                    current_files.add(file_path)
                    
                    try:
                        # Skip files we can't access
                        if not os.path.exists(file_path) or not os.path.isfile(file_path):
                            continue
                        
                        # Get current file info
                        stat = os.stat(file_path)
                        
                        # Check if file is new
                        if file_path not in self.file_info:
                            created_files.append(file_path)
                            # Calculate hash for new file
                            file_hash = self._calculate_file_hash(file_path)
                            if file_hash:
                                self.file_info[file_path] = {
                                    'hash': file_hash,
                                    'size': stat.st_size,
                                    'mtime': stat.st_mtime
                                }
                        else:
                            # Check if file was modified
                            old_info = self.file_info[file_path]
                            if stat.st_mtime > old_info['mtime'] or stat.st_size != old_info['size']:
                                # File was modified, check if content changed
                                new_hash = self._calculate_file_hash(file_path)
                                if new_hash and new_hash != old_info['hash']:
                                    modified_files.append(file_path)
                                    # Update file info
                                    self.file_info[file_path] = {
                                        'hash': new_hash,
                                        'size': stat.st_size,
                                        'mtime': stat.st_mtime
                                    }
                    except (PermissionError, OSError):
                        # Skip files we can't access
                        pass
            
            # Check for deleted files
            for file_path in list(self.file_info.keys()):
                if file_path not in current_files:
                    deleted_files.append(file_path)
                    # Remove from our database
                    self.file_info.pop(file_path, None)
            
            # Store events for pattern detection
            current_time = time.time()
            
            # Process created files
            for file_path in created_files:
                self.recent_events.append({
                    'path': file_path,
                    'type': 'created',
                    'time': current_time
                })
                
                # Create event data
                event_data = {
                    'event_type': 'created',
                    'file_path': file_path,
                    'risk_level': 'low'
                }
                
                # Check for suspicious characteristics
                reasons = []
                
                # Check for ransomware extension
                if self.detector.has_ransomware_extension(file_path):
                    event_data['risk_level'] = 'high'
                    reasons.append('File has a known ransomware extension')
                
                # Check for ransom note
                if self.detector.is_potential_ransom_note(file_path):
                    event_data['risk_level'] = 'high'
                    reasons.append('File appears to be a ransom note')
                
                if reasons:
                    event_data['detection_reasons'] = reasons
                
                # Send the event to the callback
                self.callback(event_data)
            
            # Process modified files
            for file_path in modified_files:
                self.recent_events.append({
                    'path': file_path,
                    'type': 'modified',
                    'time': current_time
                })
                
                # Create event data
                event_data = {
                    'event_type': 'modified',
                    'file_path': file_path,
                    'risk_level': 'low'
                }
                
                # Send the event to the callback
                self.callback(event_data)
            
            # Process deleted files
            for file_path in deleted_files:
                self.recent_events.append({
                    'path': file_path,
                    'type': 'deleted',
                    'time': current_time
                })
                
                # Create event data
                event_data = {
                    'event_type': 'deleted',
                    'file_path': file_path,
                    'risk_level': 'low'
                }
                
                # Send the event to the callback
                self.callback(event_data)
            
            # Keep only events from the last 30 seconds
            cutoff_time = current_time - 30
            self.recent_events = [e for e in self.recent_events if e['time'] > cutoff_time]
            
            # Check for rapid file operations (potential ransomware behavior)
            if self.detector.check_rapid_modifications(self.recent_events):
                self.callback({
                    'event_type': 'rapid_operations',
                    'file_path': self.directory,
                    'risk_level': 'medium',
                    'detection_reasons': [f'Rapid file operations detected - multiple operations in a short time']
                })
        
        except Exception as e:
            print(f"Error during scan: {str(e)}")
    
    def _calculate_file_hash(self, file_path, block_size=65536):
        """Calculate SHA-256 hash of a file"""
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