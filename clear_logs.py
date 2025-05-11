"""
De-Ransom Log Cleaner
---------------------
This script clears all log files created by the De-Ransom application.
"""

import os
import json
import shutil
from datetime import datetime

def clear_logs():
    """Clear all De-Ransom log files."""
    print(f"De-Ransom Log Cleaner - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 60)
    
    # Define log file paths
    base_dir = "p:\\DeRansomeware"
    backend_logs_dir = os.path.join(base_dir, "backend", "logs")
    main_logs_dir = os.path.join(base_dir, "logs")
    
    # Create empty activity log
    activity_log_path = os.path.join(backend_logs_dir, "activity_log.json")
    if os.path.exists(activity_log_path):
        print(f"Clearing activity log: {activity_log_path}")
        with open(activity_log_path, 'w') as f:
            json.dump([], f)
        print("[OK] Activity log cleared")
    else:
        print(f"Activity log not found at: {activity_log_path}")
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(activity_log_path), exist_ok=True)
        with open(activity_log_path, 'w') as f:
            json.dump([], f)
        print("[OK] Created new empty activity log")
    
    # Clear application log
    app_log_path = os.path.join(backend_logs_dir, "deransom.log")
    if os.path.exists(app_log_path):
        print(f"Clearing application log: {app_log_path}")
        with open(app_log_path, 'w') as f:
            f.write("")
        print("[OK] Application log cleared")
    
    # Clear monitor log
    monitor_log_path = os.path.join(main_logs_dir, "deransomeware_monitor.log")
    if os.path.exists(monitor_log_path):
        print(f"Clearing monitor log: {monitor_log_path}")
        with open(monitor_log_path, 'w') as f:
            f.write("")
        print("[OK] Monitor log cleared")
    
    # Clear service log
    service_log_path = os.path.join(main_logs_dir, "deransomeware_service.log")
    if os.path.exists(service_log_path):
        print(f"Clearing service log: {service_log_path}")
        with open(service_log_path, 'w') as f:
            f.write("")
        print("[OK] Service log cleared")
    
    print("\nAll logs have been cleared successfully.")
    print("Note: If the application is currently running, it may recreate some log files.")
    print("It's recommended to restart the application after clearing logs.")

if __name__ == "__main__":
    try:
        clear_logs()
    except Exception as e:
        print(f"Error clearing logs: {str(e)}")"""
De-Ransom Log Cleaner
---------------------
This script clears all log files created by the De-Ransom application.
"""

import os
import json
import shutil
from datetime import datetime

def clear_logs():
    """Clear all De-Ransom log files."""
    print(f"De-Ransom Log Cleaner - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 60)
    
    # Define log file paths
    base_dir = "p:\\DeRansomeware"
    backend_logs_dir = os.path.join(base_dir, "backend", "logs")
    main_logs_dir = os.path.join(base_dir, "logs")
    
    # Create empty activity log
    activity_log_path = os.path.join(backend_logs_dir, "activity_log.json")
    if os.path.exists(activity_log_path):
        print(f"Clearing activity log: {activity_log_path}")
        with open(activity_log_path, 'w') as f:
            json.dump([], f)
        print("✓ Activity log cleared")
    else:
        print(f"Activity log not found at: {activity_log_path}")
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(activity_log_path), exist_ok=True)
        with open(activity_log_path, 'w') as f:
            json.dump([], f)
        print("✓ Created new empty activity log")
    
    # Clear application log
    app_log_path = os.path.join(backend_logs_dir, "deransom.log")
    if os.path.exists(app_log_path):
        print(f"Clearing application log: {app_log_path}")
        with open(app_log_path, 'w') as f:
            f.write("")
        print("✓ Application log cleared")
    
    # Clear monitor log
    monitor_log_path = os.path.join(main_logs_dir, "deransomeware_monitor.log")
    if os.path.exists(monitor_log_path):
        print(f"Clearing monitor log: {monitor_log_path}")
        with open(monitor_log_path, 'w') as f:
            f.write("")
        print("✓ Monitor log cleared")
    
    # Clear service log
    service_log_path = os.path.join(main_logs_dir, "deransomeware_service.log")
    if os.path.exists(service_log_path):
        print(f"Clearing service log: {service_log_path}")
        with open(service_log_path, 'w') as f:
            f.write("")
        print("✓ Service log cleared")
    
    print("\nAll logs have been cleared successfully.")
    print("Note: If the application is currently running, it may recreate some log files.")
    print("It's recommended to restart the application after clearing logs.")

if __name__ == "__main__":
    try:
        clear_logs()
    except Exception as e:
        print(f"Error clearing logs: {str(e)}")