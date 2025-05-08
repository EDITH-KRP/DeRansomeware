"""
DeRansomeware Service Installer

This script installs, removes, starts, and stops the DeRansomeware Windows service.
Run with administrator privileges.
"""

import os
import sys
import subprocess
import win32serviceutil
import win32service
import win32con
import win32event
import win32api
import servicemanager
import argparse

# Service name
SERVICE_NAME = "DeRansomeware"
SERVICE_DISPLAY_NAME = "DeRansomeware Protection Service"
SERVICE_DESCRIPTION = "Provides real-time protection against ransomware attacks"

def is_admin():
    """Check if the script is running with administrator privileges"""
    try:
        return win32api.GetCurrentProcess().IsUserAnAdmin()
    except:
        return False

def install_service():
    """Install the DeRansomeware service"""
    print("Installing DeRansomeware service...")
    
    # Get the absolute path to the service script
    service_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'windows_service.py')
    
    # Install the service
    try:
        # Use pythonw.exe to run without a console window
        python_exe = sys.executable.replace('python.exe', 'pythonw.exe')
        if not os.path.exists(python_exe):
            python_exe = sys.executable
        
        # Install the service
        subprocess.run([
            python_exe, service_script, 'install',
            '--startup', 'auto',  # Start automatically on boot
        ], check=True)
        
        # Set the service description
        import win32api
        import win32service
        
        # Open the service control manager
        hscm = win32service.OpenSCManager(None, None, win32service.SC_MANAGER_ALL_ACCESS)
        
        # Open the service
        hs = win32service.OpenService(hscm, SERVICE_NAME, win32service.SERVICE_ALL_ACCESS)
        
        # Set the description
        win32service.ChangeServiceConfig2(
            hs,
            win32service.SERVICE_CONFIG_DESCRIPTION,
            SERVICE_DESCRIPTION
        )
        
        # Close the handles
        win32service.CloseServiceHandle(hs)
        win32service.CloseServiceHandle(hscm)
        
        print("Service installed successfully!")
        print(f"Service name: {SERVICE_NAME}")
        print(f"Display name: {SERVICE_DISPLAY_NAME}")
        print("You can now start the service using this script or the Windows Services console.")
        
    except subprocess.CalledProcessError as e:
        print(f"Error installing service: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False
    
    return True

def remove_service():
    """Remove the DeRansomeware service"""
    print("Removing DeRansomeware service...")
    
    # Get the absolute path to the service script
    service_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'windows_service.py')
    
    # Remove the service
    try:
        subprocess.run([sys.executable, service_script, 'remove'], check=True)
        print("Service removed successfully!")
    except subprocess.CalledProcessError as e:
        print(f"Error removing service: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False
    
    return True

def start_service():
    """Start the DeRansomeware service"""
    print("Starting DeRansomeware service...")
    
    try:
        win32serviceutil.StartService(SERVICE_NAME)
        print("Service started successfully!")
    except Exception as e:
        print(f"Error starting service: {e}")
        return False
    
    return True

def stop_service():
    """Stop the DeRansomeware service"""
    print("Stopping DeRansomeware service...")
    
    try:
        win32serviceutil.StopService(SERVICE_NAME)
        print("Service stopped successfully!")
    except Exception as e:
        print(f"Error stopping service: {e}")
        return False
    
    return True

def service_status():
    """Get the status of the DeRansomeware service"""
    try:
        status = win32serviceutil.QueryServiceStatus(SERVICE_NAME)[1]
        
        if status == win32service.SERVICE_RUNNING:
            print("Service status: RUNNING")
        elif status == win32service.SERVICE_STOPPED:
            print("Service status: STOPPED")
        elif status == win32service.SERVICE_START_PENDING:
            print("Service status: STARTING")
        elif status == win32service.SERVICE_STOP_PENDING:
            print("Service status: STOPPING")
        elif status == win32service.SERVICE_PAUSED:
            print("Service status: PAUSED")
        else:
            print(f"Service status: UNKNOWN ({status})")
        
        return True
    except Exception as e:
        print(f"Error getting service status: {e}")
        print("The service may not be installed.")
        return False

def configure_directories():
    """Configure the directories to monitor"""
    config_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config')
    os.makedirs(config_dir, exist_ok=True)
    
    config_file = os.path.join(config_dir, 'monitored_directories.txt')
    
    # Create default config file if it doesn't exist
    if not os.path.exists(config_file):
        with open(config_file, 'w') as f:
            f.write("# Add directories to monitor, one per line\n")
            f.write(f"{os.path.join(os.environ['USERPROFILE'], 'Documents')}\n")
            f.write(f"{os.path.join(os.environ['USERPROFILE'], 'Desktop')}\n")
            f.write(f"{os.path.join(os.environ['USERPROFILE'], 'Pictures')}\n")
            f.write(f"{os.path.join(os.environ['USERPROFILE'], 'Downloads')}\n")
    
    # Open the config file in notepad
    print(f"Opening configuration file: {config_file}")
    print("Add the directories you want to monitor, one per line.")
    print("Save and close the file when you're done.")
    
    try:
        subprocess.run(['notepad', config_file], check=True)
        print("Configuration saved.")
        
        # Ask if the user wants to monitor the entire system
        monitor_all = input("Do you want to monitor the entire system drive? (y/n): ")
        if monitor_all.lower() == 'y':
            system_drive = os.environ.get('SystemDrive', 'C:')
            
            with open(config_file, 'a') as f:
                f.write(f"\n# System drive added automatically\n")
                f.write(f"{system_drive}\\\n")
            
            print(f"Added system drive {system_drive} to monitored directories.")
        
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error opening configuration file: {e}")
        return False

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="DeRansomeware Service Manager")
    parser.add_argument('action', choices=['install', 'remove', 'start', 'stop', 'status', 'configure'],
                        help="Action to perform")
    
    args = parser.parse_args()
    
    # Check if running with administrator privileges
    if not is_admin() and args.action in ['install', 'remove', 'start', 'stop']:
        print("This script must be run with administrator privileges.")
        print("Please restart the script as an administrator.")
        return
    
    # Perform the requested action
    if args.action == 'install':
        install_service()
    elif args.action == 'remove':
        stop_service()  # Try to stop the service first
        remove_service()
    elif args.action == 'start':
        start_service()
    elif args.action == 'stop':
        stop_service()
    elif args.action == 'status':
        service_status()
    elif args.action == 'configure':
        configure_directories()

if __name__ == '__main__':
    main()