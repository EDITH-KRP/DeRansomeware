"""
Simple File Monitor for Ransomware Detection

This script monitors a directory for changes by periodically scanning it
and detecting suspicious file operations that might indicate ransomware activity.
"""

import os
import sys
import time
import logging
import hashlib
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
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

class SimpleFileMonitor:
    def __init__(self, directory):
        self.directory = directory
        self.file_hashes = {}  # Store file hashes for change detection
        self.file_timestamps = {}  # Store file modification times
        self.is_running = False
        
        print(f"Initialized file monitor for directory: {directory}")
    
    def start(self):
        """Start monitoring the directory"""
        self.is_running = True
        
        print(f"\nMonitoring directory: {self.directory}")
        print("Press Ctrl+C to stop monitoring.\n")
        
        # Perform initial scan
        self._scan_directory()
        
        # Monitor loop
        try:
            while self.is_running:
                # Wait before next scan
                time.sleep(2)
                
                # Scan for changes
                self._scan_for_changes()
        except KeyboardInterrupt:
            self.is_running = False
            print("\nMonitoring stopped.")
    
    def _scan_directory(self):
        """Scan the directory and build initial file database"""
        print("Performing initial scan...")
        file_count = 0
        
        for root, _, files in os.walk(self.directory):
            for filename in files:
                file_path = os.path.join(root, filename)
                try:
                    # Get file hash and modification time
                    file_hash = self._calculate_file_hash(file_path)
                    mod_time = os.path.getmtime(file_path)
                    
                    if file_hash:
                        self.file_hashes[file_path] = file_hash
                        self.file_timestamps[file_path] = mod_time
                        file_count += 1
                except (PermissionError, OSError):
                    # Skip files we can't access
                    pass
        
        print(f"Initial scan complete. Indexed {file_count} files.")
    
    def _scan_for_changes(self):
        """Scan for file changes and detect suspicious activity"""
        new_files = []
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
                    # Check if file is new
                    if file_path not in self.file_hashes:
                        new_files.append(file_path)
                        # Calculate hash for new file
                        file_hash = self._calculate_file_hash(file_path)
                        if file_hash:
                            self.file_hashes[file_path] = file_hash
                            self.file_timestamps[file_path] = os.path.getmtime(file_path)
                    else:
                        # Check if file was modified
                        mod_time = os.path.getmtime(file_path)
                        if mod_time > self.file_timestamps.get(file_path, 0):
                            # File was modified, check if content changed
                            new_hash = self._calculate_file_hash(file_path)
                            if new_hash and new_hash != self.file_hashes.get(file_path):
                                modified_files.append(file_path)
                                # Update hash and timestamp
                                self.file_hashes[file_path] = new_hash
                                self.file_timestamps[file_path] = mod_time
                except (PermissionError, OSError):
                    # Skip files we can't access
                    pass
        
        # Check for deleted files
        for file_path in list(self.file_hashes.keys()):
            if file_path not in current_files:
                deleted_files.append(file_path)
                # Remove from our database
                self.file_hashes.pop(file_path, None)
                self.file_timestamps.pop(file_path, None)
        
        # Process file events
        for file_path in new_files:
            self._check_file(file_path, "created")
        
        for file_path in modified_files:
            self._check_file(file_path, "modified")
        
        for file_path in deleted_files:
            logging.info(f"File deleted: {file_path}")
        
        # Check for rapid file operations (potential ransomware behavior)
        if len(new_files) + len(modified_files) >= 10:
            logging.warning(f"🚨 HIGH RISK: Rapid file operations detected - {len(new_files)} new files, {len(modified_files)} modified files")
    
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
    
    monitor = SimpleFileMonitor(path)
    monitor.start()

if __name__ == "__main__":
    main()