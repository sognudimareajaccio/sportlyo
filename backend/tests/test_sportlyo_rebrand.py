"""
Tests for SportLyo rebranding and Coming Soon functionality
- Backend API verification
- Waitlist email endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestAPRooting:
    """Test API root endpoint returns SportLyo branding"""

    def test_api_root_returns_sportlyo(self):
        """GET /api/ should return 'SportLyo API' message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message' field"
        assert "SportLyo" in data["message"], f"Expected 'SportLyo' in message, got: {data['message']}"
        print(f"✓ API root returns: {data['message']}")

    def test_api_health_check(self):
        """GET /api/health should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health check passed")


class TestWaitlistEmail:
    """Test waitlist email endpoint for Coming Soon page"""

    def test_waitlist_email_success(self):
        """POST /api/waitlist-email should store email successfully"""
        test_email = f"test_{os.urandom(4).hex()}@sportlyo.com"
        
        response = requests.post(
            f"{BASE_URL}/api/waitlist-email",
            json={"email": test_email},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("message") == "ok", f"Expected 'ok' message, got: {data}"
        print(f"✓ Waitlist email submitted: {test_email}")

    def test_waitlist_email_duplicate(self):
        """POST /api/waitlist-email with same email should not fail"""
        test_email = f"duplicate_{os.urandom(4).hex()}@sportlyo.com"
        
        # First submission
        response1 = requests.post(
            f"{BASE_URL}/api/waitlist-email",
            json={"email": test_email},
            headers={"Content-Type": "application/json"}
        )
        assert response1.status_code == 200
        
        # Second submission (same email)
        response2 = requests.post(
            f"{BASE_URL}/api/waitlist-email",
            json={"email": test_email},
            headers={"Content-Type": "application/json"}
        )
        assert response2.status_code == 200, "Duplicate email should not cause error"
        print("✓ Duplicate email handled gracefully")

    def test_waitlist_email_empty(self):
        """POST /api/waitlist-email with empty email should fail"""
        response = requests.post(
            f"{BASE_URL}/api/waitlist-email",
            json={"email": ""},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 400, f"Expected 400 for empty email, got {response.status_code}"
        print("✓ Empty email rejected")

    def test_waitlist_email_missing(self):
        """POST /api/waitlist-email with no email field should fail"""
        response = requests.post(
            f"{BASE_URL}/api/waitlist-email",
            json={},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 400, f"Expected 400 for missing email, got {response.status_code}"
        print("✓ Missing email rejected")


class TestAuthEndpoints:
    """Test auth endpoints still work with new branding"""

    def test_login_admin(self):
        """POST /api/auth/login with admin credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "admin@sportsconnect.fr",
                "password": "admin123"
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["role"] == "admin", "User should be admin"
        print(f"✓ Admin login successful: {data['user']['email']}")

    def test_events_endpoint(self):
        """GET /api/events should return events list"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        
        data = response.json()
        assert "events" in data, "Response should contain events list"
        assert "total" in data, "Response should contain total count"
        print(f"✓ Events endpoint working - {data['total']} events")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
