"""
Final File Monitor for Ransomware Detection

This script monitors a directory for changes and detects suspicious file operations
that might indicate ransomware activity.
"""

import os
import sys
import time
import hashlib
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

# Common ransomware file extensions
RANSOMWARE_EXTENSIONS = [
    '.encrypted', '.enc', '.crypted', '.crypt', '.crypto', '.locked', '.lock',
    '.ryk', '.ryuk', '.lck', '.locky', '.wncry', '.wannacry', '.wcry'
]

# Ransom note patterns
RANSOM_NOTE_PATTERNS = [
    'ransom', 'decrypt', 'how_to', 'readme', 'help_', 'restore', 'recover'
]

class FileMonitor:
    def __init__(self, directory):
        self.directory = directory
        self.file_info = {}  # Store file info (hash, size, mtime)
        self.recent_events = []  # Store recent events for pattern detection
        self.is_running = False
        
        print(f"Initialized file monitor for directory: {directory}")
    
    def start(self):
        """Start monitoring the directory"""
        self.is_running = True
        
        print(f"\nMonitoring directory: {self.directory}")
        print("Press Ctrl+C to stop monitoring.\n")
        
        # Perform initial scan
        self._initial_scan()
        
        # Monitor loop
        try:
            while self.is_running:
                # Scan for changes
                self._scan_for_changes()
                
                # Wait before next scan
                time.sleep(1)
        except KeyboardInterrupt:
            self.is_running = False
            print("\nMonitoring stopped.")
    
    def _initial_scan(self):
        """Scan the directory and build initial file database"""
        print("Performing initial scan...")
        file_count = 0
        
        try:
            for root, _, files in os.walk(self.directory):
                for filename in files:
                    file_path = os.path.join(root, filename)
                    try:
                        # Get file info
                        stat = os.stat(file_path)
                        file_hash = self._calculate_file_hash(file_path)
                        
                        if file_hash:
                            self.file_info[file_path] = {
                                'hash': file_hash,
                                'size': stat.st_size,
                                'mtime': stat.st_mtime
                            }
                            file_count += 1
                            
                            if file_count % 100 == 0:
                                print(f"Scanned {file_count} files...")
                    except (PermissionError, OSError) as e:
                        # Skip files we can't access
                        pass
        except Exception as e:
            print(f"Error during initial scan: {str(e)}")
        
        print(f"Initial scan complete. Indexed {file_count} files.")
    
    def _scan_for_changes(self):
        """Scan for file changes and detect suspicious activity"""
        try:
            # Track file events
            created_files = []
            modified_files = []
            deleted_files = []
            renamed_files = []
            
            # Get current files
            current_files = set()
            for root, _, files in os.walk(self.directory):
                for filename in files:
                    file_path = os.path.join(root, filename)
                    current_files.add(file_path)
                    
                    try:
                        # Skip files we can't access
                        if not os.path.exists(file_path) or not os.access(file_path, os.R_OK):
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
                    except (PermissionError, OSError) as e:
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
            for file_path in created_files:
                self.recent_events.append({
                    'path': file_path,
                    'type': 'created',
                    'time': current_time
                })
                self._check_file(file_path, "created")
            
            for file_path in modified_files:
                self.recent_events.append({
                    'path': file_path,
                    'type': 'modified',
                    'time': current_time
                })
                self._check_file(file_path, "modified")
            
            for file_path in deleted_files:
                self.recent_events.append({
                    'path': file_path,
                    'type': 'deleted',
                    'time': current_time
                })
                logging.info(f"File deleted: {file_path}")
            
            # Keep only events from the last 30 seconds
            cutoff_time = current_time - 30
            self.recent_events = [e for e in self.recent_events if e['time'] > cutoff_time]
            
            # Check for rapid file operations (potential ransomware behavior)
            recent_ops = [e for e in self.recent_events if e['time'] > (current_time - 5)]
            if len(recent_ops) >= 10:
                logging.warning(f"🚨 HIGH RISK: Rapid file operations detected - {len(recent_ops)} operations in 5 seconds")
        
        except Exception as e:
            logging.error(f"Error during scan: {str(e)}")
    
    def _check_file(self, file_path, event_type):
        """Check a file for suspicious characteristics"""
        # Check for ransomware extensions
        _, ext = os.path.splitext(file_path.lower())
        if ext in RANSOMWARE_EXTENSIONS:
            logging.warning(f"🚨 HIGH RISK: {event_type} file with ransomware extension: {file_path}")
            return
        
        # Check for ransom note
        filename = os.path.basename(file_path).lower()
        if any(pattern in filename for pattern in RANSOM_NOTE_PATTERNS):
            logging.warning(f"🚨 HIGH RISK: Potential ransom note {event_type}: {file_path}")
            return
        
        # Log normal events
        logging.info(f"File {event_type}: {file_path}")
    
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

def main():
    if len(sys.argv) > 1:
        path = sys.argv[1]
    else:
        path = os.path.join(os.environ['USERPROFILE'], 'Documents')
    
    if not os.path.isdir(path):
        logging.error(f"Directory not found: {path}")
        return
    
    monitor = FileMonitor(path)
    monitor.start()

if __name__ == "__main__":
    main()