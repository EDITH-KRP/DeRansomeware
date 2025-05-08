#!/usr/bin/env python
"""
Cleanup script for DeRansomeware project
Removes temporary files, cache files, and other unwanted files
"""

import os
import shutil
import sys

def main():
    # Get the project root directory
    project_root = os.path.dirname(os.path.abspath(__file__))
    print(f"Cleaning up project at: {project_root}")
    
    # Count of removed items
    removed_count = 0
    
    # 1. Remove __pycache__ directories
    print("\nRemoving __pycache__ directories...")
    for root, dirs, files in os.walk(project_root):
        if "__pycache__" in dirs:
            pycache_path = os.path.join(root, "__pycache__")
            try:
                shutil.rmtree(pycache_path)
                print(f"  Removed: {pycache_path}")
                removed_count += 1
            except Exception as e:
                print(f"  Error removing {pycache_path}: {e}")
    
    # 2. Remove .pyc files
    print("\nRemoving .pyc files...")
    for root, dirs, files in os.walk(project_root):
        for file in files:
            if file.endswith(".pyc"):
                pyc_path = os.path.join(root, file)
                try:
                    os.remove(pyc_path)
                    print(f"  Removed: {pyc_path}")
                    removed_count += 1
                except Exception as e:
                    print(f"  Error removing {pyc_path}: {e}")
    
    # 3. Remove any .log files
    print("\nRemoving .log files...")
    for root, dirs, files in os.walk(project_root):
        for file in files:
            if file.endswith(".log"):
                log_path = os.path.join(root, file)
                try:
                    os.remove(log_path)
                    print(f"  Removed: {log_path}")
                    removed_count += 1
                except Exception as e:
                    print(f"  Error removing {log_path}: {e}")
    
    # 4. Remove any .bak or ~ backup files
    print("\nRemoving backup files...")
    for root, dirs, files in os.walk(project_root):
        for file in files:
            if file.endswith(".bak") or file.endswith("~"):
                bak_path = os.path.join(root, file)
                try:
                    os.remove(bak_path)
                    print(f"  Removed: {bak_path}")
                    removed_count += 1
                except Exception as e:
                    print(f"  Error removing {bak_path}: {e}")
    
    print(f"\nCleanup complete! Removed {removed_count} items.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nCleanup interrupted by user.")
        sys.exit(1)