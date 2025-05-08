"""
Simple script to create and modify files for testing
"""

import os
import time
import random
import string

def create_file(name, content):
    """Create a file with the given name and content"""
    with open(name, 'w') as f:
        f.write(content)
    print(f"Created file: {name}")

def modify_file(name, content):
    """Modify a file by appending content"""
    with open(name, 'a') as f:
        f.write(content)
    print(f"Modified file: {name}")

def rename_file(old_name, new_name):
    """Rename a file"""
    os.rename(old_name, new_name)
    print(f"Renamed file: {old_name} -> {new_name}")

def delete_file(name):
    """Delete a file"""
    os.remove(name)
    print(f"Deleted file: {name}")

def main():
    # Create a test directory
    test_dir = "test_files"
    os.makedirs(test_dir, exist_ok=True)
    
    # Create some normal files
    print("\nCreating normal files...")
    for i in range(3):
        file_name = os.path.join(test_dir, f"normal_file_{i}.txt")
        create_file(file_name, f"This is normal file {i}\n")
        time.sleep(1)
    
    # Modify the files
    print("\nModifying files...")
    for i in range(3):
        file_name = os.path.join(test_dir, f"normal_file_{i}.txt")
        modify_file(file_name, f"Modified at {time.ctime()}\n")
        time.sleep(1)
    
    # Create files with ransomware extensions
    print("\nCreating files with ransomware extensions...")
    for i in range(3):
        file_name = os.path.join(test_dir, f"encrypted_file_{i}.encrypted")
        create_file(file_name, f"This file has a ransomware extension\n")
        time.sleep(1)
    
    # Create a ransom note
    print("\nCreating a ransom note...")
    ransom_note = os.path.join(test_dir, "HOW_TO_DECRYPT.txt")
    create_file(ransom_note, "YOUR FILES HAVE BEEN ENCRYPTED!\n")
    
    print("\nTest completed. Check if the monitoring system detected these events.")

if __name__ == "__main__":
    main()