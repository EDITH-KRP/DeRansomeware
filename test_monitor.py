"""
Test script for file monitoring
"""

import os
import time
import random
import string

def create_random_file(directory, prefix="test_", extension=".txt"):
    """Create a random file in the specified directory"""
    if not os.path.exists(directory):
        os.makedirs(directory)
    
    # Generate a random filename
    random_str = ''.join(random.choices(string.ascii_lowercase, k=8))
    filename = f"{prefix}{random_str}{extension}"
    file_path = os.path.join(directory, filename)
    
    # Create the file with random content
    with open(file_path, 'w') as f:
        f.write(f"Test file created at {time.ctime()}\n")
        f.write(''.join(random.choices(string.ascii_letters + string.digits + ' \n', k=100)))
    
    print(f"Created file: {file_path}")
    return file_path

def modify_file(file_path):
    """Modify an existing file"""
    if os.path.exists(file_path):
        with open(file_path, 'a') as f:
            f.write(f"\nModified at {time.ctime()}\n")
            f.write(''.join(random.choices(string.ascii_letters + string.digits + ' \n', k=50)))
        print(f"Modified file: {file_path}")

def rename_file(file_path, new_extension):
    """Rename a file with a new extension"""
    if os.path.exists(file_path):
        base_name = os.path.splitext(file_path)[0]
        new_path = f"{base_name}{new_extension}"
        os.rename(file_path, new_path)
        print(f"Renamed file: {file_path} -> {new_path}")
        return new_path
    return file_path

def delete_file(file_path):
    """Delete a file"""
    if os.path.exists(file_path):
        os.remove(file_path)
        print(f"Deleted file: {file_path}")

def simulate_normal_activity(directory, count=5):
    """Simulate normal file activity"""
    print("\n=== Simulating normal file activity ===")
    files = []
    
    # Create some files
    for i in range(count):
        file_path = create_random_file(directory)
        files.append(file_path)
        time.sleep(1)
    
    # Modify some files
    for file_path in files[:count//2]:
        modify_file(file_path)
        time.sleep(1)
    
    # Delete some files
    for file_path in files[count//2:]:
        delete_file(file_path)
        time.sleep(1)
    
    return files[:count//2]  # Return the files that weren't deleted

def simulate_ransomware_activity(directory, count=5):
    """Simulate ransomware-like file activity"""
    print("\n=== Simulating ransomware-like activity ===")
    
    # Create some normal files first
    files = []
    for i in range(count):
        file_path = create_random_file(directory, prefix="important_")
        files.append(file_path)
        time.sleep(0.5)  # Faster file creation
    
    # Rename files with ransomware extensions
    ransomware_extensions = ['.encrypted', '.locked', '.crypted', '.crypt']
    encrypted_files = []
    
    for file_path in files:
        ext = random.choice(ransomware_extensions)
        new_path = rename_file(file_path, ext)
        encrypted_files.append(new_path)
        time.sleep(0.5)  # Faster renaming
    
    # Create a ransom note
    ransom_note = os.path.join(directory, "HOW_TO_DECRYPT.txt")
    with open(ransom_note, 'w') as f:
        f.write("YOUR FILES HAVE BEEN ENCRYPTED!\n\n")
        f.write("To decrypt your files, you need to pay 1 Bitcoin to the following address:\n")
        f.write("1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T\n\n")
        f.write("After payment, contact us at decrypt@example.com with your payment ID.\n")
    
    print(f"Created ransom note: {ransom_note}")

def main():
    # Create a test directory
    test_dir = os.path.join(os.getcwd(), "test_files")
    os.makedirs(test_dir, exist_ok=True)
    
    print(f"Using test directory: {test_dir}")
    print("This script will create, modify, and delete files to test the monitoring system.")
    print("Make sure the monitoring system is running before continuing.")
    input("Press Enter to continue...")
    
    # Simulate normal activity
    remaining_files = simulate_normal_activity(test_dir)
    
    print("\nNormal activity completed. Check if the monitoring system detected the changes.")
    input("Press Enter to continue with ransomware simulation...")
    
    # Simulate ransomware activity
    simulate_ransomware_activity(test_dir)
    
    print("\nRansomware simulation completed. Check if the monitoring system detected the suspicious activity.")
    print("The monitoring system should have detected high-risk events for the ransomware extensions and ransom note.")

if __name__ == "__main__":
    main()