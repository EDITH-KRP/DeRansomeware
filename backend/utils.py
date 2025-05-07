"""
De-Ransom Utility Functions
-------------------------
This module provides utility functions for the De-Ransom application.
"""

import os
import re
import hashlib
import platform
import subprocess
from datetime import datetime

def get_file_hash(file_path, algorithm='sha256', block_size=65536):
    """
    Calculate the hash of a file.
    
    Args:
        file_path (str): Path to the file
        algorithm (str): Hash algorithm to use ('md5', 'sha1', 'sha256')
        block_size (int): Size of blocks to read
        
    Returns:
        str: Hex digest of file hash or None if file cannot be read
    """
    if not os.path.exists(file_path) or not os.path.isfile(file_path):
        return None
    
    try:
        if algorithm == 'md5':
            hasher = hashlib.md5()
        elif algorithm == 'sha1':
            hasher = hashlib.sha1()
        else:
            hasher = hashlib.sha256()
        
        with open(file_path, 'rb') as file:
            buf = file.read(block_size)
            while len(buf) > 0:
                hasher.update(buf)
                buf = file.read(block_size)
        return hasher.hexdigest()
    except (PermissionError, OSError):
        return None

def is_ransomware_pattern(filename):
    """
    Check if a filename matches common ransomware patterns.
    
    Args:
        filename (str): Filename to check
        
    Returns:
        bool: True if the filename matches a ransomware pattern
    """
    # Common ransomware extensions
    ransomware_extensions = [
        '.encrypted', '.enc', '.crypted', '.crypt', '.crypto', '.locked', '.lock',
        '.ryk', '.ryuk', '.lck', '.locky', '.wncry', '.wannacry', '.wcry',
        '.cryp1', '.zepto', '.cerber', '.cerber3', '.crab', '.sage', '.globe'
    ]
    
    # Check for double extensions (e.g., file.docx.encrypted)
    parts = filename.split('.')
    if len(parts) >= 3:
        return True
    
    # Check for known ransomware extensions
    for ext in ransomware_extensions:
        if filename.lower().endswith(ext):
            return True
    
    # Check for ransom note patterns
    ransom_patterns = [
        r'readme.*\.txt',
        r'how.*decrypt.*',
        r'your.*files.*',
        r'ransom.*',
        r'decrypt.*instruction.*'
    ]
    
    for pattern in ransom_patterns:
        if re.search(pattern, filename.lower()):
            return True
    
    return False

def get_system_info():
    """
    Get system information.
    
    Returns:
        dict: System information
    """
    info = {
        'platform': platform.system(),
        'platform_release': platform.release(),
        'platform_version': platform.version(),
        'architecture': platform.machine(),
        'hostname': platform.node(),
        'processor': platform.processor(),
        'timestamp': datetime.now().isoformat()
    }
    
    # Get disk usage
    if platform.system() == 'Windows':
        try:
            import ctypes
            free_bytes = ctypes.c_ulonglong(0)
            total_bytes = ctypes.c_ulonglong(0)
            ctypes.windll.kernel32.GetDiskFreeSpaceExW(
                ctypes.c_wchar_p('C:'),
                None,
                ctypes.pointer(total_bytes),
                ctypes.pointer(free_bytes)
            )
            info['disk_total'] = total_bytes.value
            info['disk_free'] = free_bytes.value
        except:
            pass
    else:
        try:
            # Unix-like systems
            stat = os.statvfs('/')
            info['disk_total'] = stat.f_frsize * stat.f_blocks
            info['disk_free'] = stat.f_frsize * stat.f_bavail
        except:
            pass
    
    return info

def is_process_running(process_name):
    """
    Check if a process is running.
    
    Args:
        process_name (str): Name of the process to check
        
    Returns:
        bool: True if the process is running
    """
    try:
        if platform.system() == 'Windows':
            output = subprocess.check_output(['tasklist'], text=True)
            return process_name.lower() in output.lower()
        else:
            output = subprocess.check_output(['ps', 'aux'], text=True)
            return process_name.lower() in output.lower()
    except:
        return False