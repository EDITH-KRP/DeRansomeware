"""
Basic File System Monitor for Ransomware Detection

This is a very simple script to monitor file system events and detect potential ransomware activity.
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
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Common ransomware file extensions
RANSOMWARE_EXTENSIONS = [
    '.encrypted', '.enc', '.crypted', '.crypt', '.crypto', '.locked', '.lock',
    '.ryk', '.ryuk', '.lck', '.locky', '.wncry', '.wannacry', '.wcry'
]

class SimpleEventHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory:
            return
        self._check_file(event.src_path, "created")
    
    def on_modified(self, event):
        if event.is_directory:
            return
        self._check_file(event.src_path, "modified")
    
    def on_moved(self, event):
        if event.is_directory:
            return
        self._check_file(event.dest_path, "renamed")
    
    def _check_file(self, file_path, event_type):
        # Check for ransomware extensions
        _, ext = os.path.splitext(file_path.lower())
        if ext in RANSOMWARE_EXTENSIONS:
            logging.warning(f"🚨 HIGH RISK: {event_type} file with ransomware extension: {file_path}")
            return
        
        # Check for ransom note
        filename = os.path.basename(file_path).lower()
        if any(pattern in filename for pattern in ['ransom', 'decrypt', 'how_to', 'readme']):
            logging.warning(f"🚨 HIGH RISK: Potential ransom note {event_type}: {file_path}")
            return
        
        # Log normal events
        logging.info(f"File {event_type}: {file_path}")

def main():
    if len(sys.argv) > 1:
        path = sys.argv[1]
    else:
        path = os.path.join(os.environ['USERPROFILE'], 'Documents')
    
    if not os.path.isdir(path):
        logging.error(f"Directory not found: {path}")
        return
    
    print(f"\nMonitoring directory: {path}")
    print("Press Ctrl+C to stop monitoring.\n")
    
    event_handler = SimpleEventHandler()
    observer = Observer()
    observer.schedule(event_handler, path, recursive=True)
    observer.start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
    
    print("\nMonitoring stopped.")

if __name__ == "__main__":
    main()