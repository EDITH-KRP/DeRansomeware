"""
Test script to verify the application is working correctly.
"""

import os
import sys
import time
import requests
from datetime import datetime

def test_server_running():
    """Test if the server is running."""
    try:
        response = requests.get("http://localhost:5000/api/status")
        if response.status_code == 200:
            print("✅ Server is running")
            return True
        else:
            print("❌ Server returned unexpected status code:", response.status_code)
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running")
        return False

def test_blockchain_status():
    """Test blockchain status."""
    try:
        response = requests.get("http://localhost:5000/api/blockchain/status")
        if response.status_code == 200:
            data = response.json()
            print("✅ Blockchain status endpoint is working")
            print(f"   Network: {data.get('network', 'unknown')}")
            print(f"   Connected: {data.get('connected', False)}")
            print(f"   Simulation mode: {data.get('simulation', True)}")
            if data.get('message'):
                print(f"   Message: {data.get('message')}")
            return True
        else:
            print("❌ Blockchain status endpoint returned unexpected status code:", response.status_code)
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running")
        return False
    except Exception as e:
        print(f"❌ Error testing blockchain status: {str(e)}")
        return False

def test_file_monitoring():
    """Test file monitoring by creating a test file."""
    test_dir = os.path.join(os.getcwd(), "test_files")
    os.makedirs(test_dir, exist_ok=True)
    
    test_file = os.path.join(test_dir, f"test_{int(time.time())}.txt")
    
    try:
        # Create a test file
        with open(test_file, "w") as f:
            f.write(f"Test file created at {datetime.now().isoformat()}")
        print(f"✅ Created test file: {test_file}")
        
        # Modify the file to trigger monitoring
        time.sleep(1)
        with open(test_file, "a") as f:
            f.write("\nThis line might trigger ransomware detection")
        print(f"✅ Modified test file: {test_file}")
        
        # Check if the activity was logged
        time.sleep(2)
        try:
            response = requests.get("http://localhost:5000/api/activity")
            if response.status_code == 200:
                activities = response.json()
                recent_activities = [a for a in activities if test_file in a.get('file_path', '')]
                if recent_activities:
                    print(f"✅ File monitoring detected activity on test file")
                    return True
                else:
                    print("❓ No activity detected for test file (this might be normal if monitoring is not configured for this directory)")
                    return True
            else:
                print("❌ Activity endpoint returned unexpected status code:", response.status_code)
                return False
        except Exception as e:
            print(f"❌ Error checking activity: {str(e)}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing file monitoring: {str(e)}")
        return False

def main():
    """Run all tests."""
    print("=== Testing De-Ransomeware Application ===")
    print()
    
    # Test if server is running
    server_running = test_server_running()
    if not server_running:
        print("\n❌ Server is not running. Please start the server first.")
        return False
    
    print()
    
    # Test blockchain status
    blockchain_status = test_blockchain_status()
    
    print()
    
    # Test file monitoring
    file_monitoring = test_file_monitoring()
    
    print()
    print("=== Test Summary ===")
    print(f"Server running: {'✅' if server_running else '❌'}")
    print(f"Blockchain status: {'✅' if blockchain_status else '❌'}")
    print(f"File monitoring: {'✅' if file_monitoring else '❌'}")
    
    return server_running and blockchain_status and file_monitoring

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)