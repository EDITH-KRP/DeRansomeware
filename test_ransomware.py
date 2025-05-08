"""
De-Ransom Test Ransomware Simulator
----------------------------------
This script simulates ransomware behavior for testing the De-Ransom protection system.
WARNING: This is for testing purposes only and does not actually encrypt files.
"""

import os
import sys
import time
import random
import argparse
import shutil
from datetime import datetime

def create_ransom_note(directory):
    """Create a simulated ransom note in the target directory."""
    ransom_notes = [
        "HOW_TO_DECRYPT.txt",
        "README_FOR_DECRYPT.txt",
        "YOUR_FILES_ARE_ENCRYPTED.txt",
        "DECRYPT_INSTRUCTION.txt"
    ]
    
    note_content = """
    !!!!! YOUR FILES HAVE BEEN ENCRYPTED !!!!!
    
    All your files have been encrypted with a strong algorithm.
    To decrypt your files, you need to pay a ransom of 1 Bitcoin.
    
    Contact us at: evil@ransomware.example
    
    Your decryption ID: {0}
    
    WARNING: Do not attempt to decrypt files yourself or they will be permanently lost.
    """.format(random.randint(100000, 999999))
    
    note_path = os.path.join(directory, random.choice(ransom_notes))
    
    with open(note_path, 'w') as f:
        f.write(note_content)
    
    print(f"Created ransom note: {note_path}")
    return note_path

def simulate_file_encryption(directory, count=5, extensions=None):
    """Simulate encrypting files by renaming them with ransomware extensions."""
    if extensions is None:
        extensions = ['.encrypted', '.locked', '.crypt', '.crypto', '.enc']
    
    encrypted_files = []
    
    # Get all files in the directory
    all_files = []
    for root, _, files in os.walk(directory):
        for file in files:
            # Skip already "encrypted" files and ransom notes
            if any(file.endswith(ext) for ext in extensions) or file.upper().startswith(('README', 'HOW_TO', 'DECRYPT')):
                continue
            all_files.append(os.path.join(root, file))
    
    # Randomly select files to "encrypt"
    files_to_encrypt = random.sample(all_files, min(count, len(all_files)))
    
    for file_path in files_to_encrypt:
        # Choose a random ransomware extension
        ext = random.choice(extensions)
        
        # Create a copy with the ransomware extension
        encrypted_path = file_path + ext
        shutil.copy2(file_path, encrypted_path)
        
        print(f"Simulated encryption: {file_path} -> {encrypted_path}")
        encrypted_files.append(encrypted_path)
    
    return encrypted_files

def simulate_rapid_file_operations(directory, count=20):
    """Simulate rapid file operations (creates and modifies files quickly)."""
    created_files = []
    
    print(f"Simulating rapid file operations in {directory}...")
    
    for i in range(count):
        # Create a random file
        file_path = os.path.join(directory, f"test_{int(time.time())}.txt")
        with open(file_path, 'w') as f:
            f.write(f"Test file {i} created at {datetime.now().isoformat()}")
        
        created_files.append(file_path)
        print(f"Created file: {file_path}")
        
        # Sleep briefly to simulate rapid but not instantaneous operations
        time.sleep(0.1)
    
    return created_files

def cleanup(files):
    """Clean up the test files."""
    for file_path in files:
        try:
            os.remove(file_path)
            print(f"Removed: {file_path}")
        except Exception as e:
            print(f"Error removing {file_path}: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description='Simulate ransomware behavior for testing De-Ransom.')
    parser.add_argument('directory', help='Target directory for the simulation')
    parser.add_argument('--mode', choices=['encrypt', 'note', 'rapid', 'all'], default='all',
                        help='Simulation mode: encrypt (rename files), note (create ransom note), rapid (rapid file operations), all (default)')
    parser.add_argument('--count', type=int, default=5, help='Number of files to simulate (default: 5)')
    parser.add_argument('--cleanup', action='store_true', help='Clean up test files after simulation')
    
    args = parser.parse_args()
    
    if not os.path.isdir(args.directory):
        print(f"Error: {args.directory} is not a valid directory")
        return 1
    
    created_files = []
    
    try:
        print(f"Starting ransomware simulation in {args.directory}")
        print("WARNING: This is a simulation and does not actually encrypt files")
        print("Press Ctrl+C to stop the simulation")
        
        if args.mode in ['encrypt', 'all']:
            encrypted_files = simulate_file_encryption(args.directory, args.count)
            created_files.extend(encrypted_files)
        
        if args.mode in ['note', 'all']:
            note_path = create_ransom_note(args.directory)
            created_files.append(note_path)
        
        if args.mode in ['rapid', 'all']:
            rapid_files = simulate_rapid_file_operations(args.directory, args.count)
            created_files.extend(rapid_files)
        
        print("\nSimulation completed successfully")
        
        if args.cleanup:
            print("\nCleaning up test files...")
            cleanup(created_files)
            print("Cleanup completed")
        else:
            print("\nTest files were left in place for inspection")
            print("You can manually remove them when finished")
    
    except KeyboardInterrupt:
        print("\nSimulation interrupted by user")
        
        if args.cleanup:
            print("Cleaning up test files...")
            cleanup(created_files)
            print("Cleanup completed")
    
    except Exception as e:
        print(f"Error during simulation: {str(e)}")
        
        if args.cleanup:
            print("Cleaning up test files...")
            cleanup(created_files)
            print("Cleanup completed")
        
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())