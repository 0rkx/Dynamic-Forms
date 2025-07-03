#!/usr/bin/env python3
"""
Test script to verify rate limiting is working on the AI endpoints.
Run this after starting the Flask backend server.
"""

import requests
import time
import json

BASE_URL = "http://localhost:5000"

def test_rate_limiting():
    """Test rate limiting on AI endpoints"""
    
    print("Testing rate limiting on AI endpoints...")
    print("=" * 50)
    
    # Test endpoint
    endpoint = "/api/ai/generate-form"
    
    print(f"Testing endpoint: {endpoint}")
    print(f"Rate limit: 10 per minute, 100 per hour")
    print()
    
    # Make requests until we hit the rate limit
    for i in range(15):
        try:
            response = requests.post(
                f"{BASE_URL}{endpoint}",
                json={"prompt": f"Test prompt {i}"},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 429:
                print(f"✅ Rate limit hit after {i+1} requests")
                print(f"Response: {response.json()}")
                break
            elif response.status_code == 200:
                print(f"✅ Request {i+1}: Success")
            else:
                print(f"❌ Request {i+1}: Status {response.status_code}")
                print(f"Response: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Request {i+1}: Error - {e}")
            
        time.sleep(0.1)  # Small delay between requests
    
    print()
    print("Rate limiting test completed!")

def test_health_endpoint():
    """Test that health endpoint is not rate limited"""
    
    print("Testing health endpoint (should not be rate limited)...")
    print("=" * 50)
    
    endpoint = "/api/health"
    
    for i in range(5):
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            
            if response.status_code == 200:
                print(f"✅ Health check {i+1}: Success")
            else:
                print(f"❌ Health check {i+1}: Status {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Health check {i+1}: Error - {e}")
            
        time.sleep(0.1)
    
    print()
    print("Health endpoint test completed!")

if __name__ == "__main__":
    print("Rate Limiting Test Suite")
    print("Make sure the Flask backend is running on http://localhost:5000")
    print()
    
    # Test health endpoint first
    test_health_endpoint()
    
    print()
    
    # Test rate limiting
    test_rate_limiting()
    
    print()
    print("All tests completed!") 