"""
Test script for the De-Ransom API
"""

import requests
import json

BASE_URL = "http://localhost:5000"

def test_register():
    """Test the registration endpoint."""
    url = f"{BASE_URL}/api/auth/register"
    data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123"
    }
    
    print(f"Sending POST request to {url} with data: {data}")
    
    try:
        response = requests.post(url, json=data)
        print(f"Status code: {response.status_code}")
        print(f"Response headers: {response.headers}")
        
        try:
            print(f"Response body: {response.json()}")
        except:
            print(f"Response body (text): {response.text}")
            
        return response
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

def test_login():
    """Test the login endpoint."""
    url = f"{BASE_URL}/api/auth/login"
    data = {
        "username": "testuser",
        "password": "password123"
    }
    
    print(f"Sending POST request to {url} with data: {data}")
    
    try:
        response = requests.post(url, json=data)
        print(f"Status code: {response.status_code}")
        print(f"Response headers: {response.headers}")
        
        try:
            print(f"Response body: {response.json()}")
        except:
            print(f"Response body (text): {response.text}")
            
        return response
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

def test_api_endpoint():
    """Test a simple GET endpoint."""
    url = f"{BASE_URL}/api/logs"
    
    print(f"Sending GET request to {url}")
    
    try:
        response = requests.get(url)
        print(f"Status code: {response.status_code}")
        print(f"Response headers: {response.headers}")
        
        try:
            print(f"Response body: {response.json()}")
        except:
            print(f"Response body (text): {response.text}")
            
        return response
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

if __name__ == "__main__":
    print("Testing De-Ransom API...")
    print("\n=== Testing registration endpoint ===")
    test_register()
    
    print("\n=== Testing login endpoint ===")
    test_login()
    
    print("\n=== Testing logs endpoint ===")
    test_api_endpoint()