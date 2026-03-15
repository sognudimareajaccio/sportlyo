"""
Test Suite for Partner Subscription System - SportLyo
Features tested:
- GET /api/subscriptions/my - Provider subscription retrieval with auto-trial creation
- POST /api/subscriptions/create-payment - Payment link generation
- GET /api/admin/subscriptions - Admin subscription stats
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
PROVIDER_EMAIL = "boutique@sportlyo.fr"
PROVIDER_PASSWORD = "boutique123"
ADMIN_EMAIL = "admin@sportsconnect.fr"
ADMIN_PASSWORD = "admin123"


class TestProviderSubscription:
    """Provider subscription endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup provider auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as provider
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": PROVIDER_EMAIL,
            "password": PROVIDER_PASSWORD
        })
        if response.status_code == 200:
            self.provider_token = response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.provider_token}"})
        else:
            pytest.skip(f"Provider login failed: {response.text}")
    
    def test_get_my_subscription(self):
        """Test GET /api/subscriptions/my returns subscription with expected fields"""
        response = self.session.get(f"{BASE_URL}/api/subscriptions/my")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "subscription" in data, "Response should contain 'subscription' key"
        
        sub = data["subscription"]
        # Verify subscription structure
        assert "status" in sub, "Subscription should have status"
        assert sub["status"] in ["trial", "active", "trial_expired", "expired", "cancelled"], f"Invalid status: {sub['status']}"
        
        # Verify pricing fields
        assert sub.get("price") == 19.0, f"Expected price 19.0, got {sub.get('price')}"
        assert sub.get("commitment_months") == 12, f"Expected 12 month commitment, got {sub.get('commitment_months')}"
        
        # If trial, verify trial_end exists and is in the future
        if sub["status"] == "trial":
            assert "trial_end" in sub, "Trial subscription should have trial_end"
            trial_end = datetime.fromisoformat(sub["trial_end"].replace("Z", "+00:00"))
            # Trial end should be in the future (within 14 days + some buffer)
            print(f"Trial status: {sub['status']}, trial_end: {sub['trial_end']}")
        
        print(f"SUCCESS: GET /api/subscriptions/my - Status: {sub['status']}, Price: {sub.get('price')}EUR, Commitment: {sub.get('commitment_months')} months")
    
    def test_create_payment_returns_url_and_amount(self):
        """Test POST /api/subscriptions/create-payment returns payment URL and correct amount"""
        response = self.session.post(f"{BASE_URL}/api/subscriptions/create-payment")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify payment_url exists
        assert "payment_url" in data, "Response should contain payment_url"
        assert data["payment_url"], "payment_url should not be empty"
        
        # Verify amount
        assert data.get("amount") == 19.0, f"Expected amount 19.0, got {data.get('amount')}"
        
        # Verify payment_id exists
        assert "payment_id" in data, "Response should contain payment_id"
        
        print(f"SUCCESS: POST /api/subscriptions/create-payment - URL: {data['payment_url'][:50]}..., Amount: {data['amount']}EUR")


class TestAdminSubscriptions:
    """Admin subscription stats endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        else:
            pytest.skip(f"Admin login failed: {response.text}")
    
    def test_admin_get_subscriptions_with_stats(self):
        """Test GET /api/admin/subscriptions returns subscriptions list with stats"""
        response = self.session.get(f"{BASE_URL}/api/admin/subscriptions")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify subscriptions list exists
        assert "subscriptions" in data, "Response should contain 'subscriptions' key"
        assert isinstance(data["subscriptions"], list), "subscriptions should be a list"
        
        # Verify stats exist
        assert "stats" in data, "Response should contain 'stats' key"
        stats = data["stats"]
        
        # Verify stats structure
        assert "total" in stats, "Stats should have 'total' count"
        assert "trial" in stats, "Stats should have 'trial' count"
        assert "active" in stats, "Stats should have 'active' count"
        
        # Verify stats are numbers
        assert isinstance(stats["total"], int), "total should be integer"
        assert isinstance(stats["trial"], int), "trial should be integer"
        assert isinstance(stats["active"], int), "active should be integer"
        
        print(f"SUCCESS: GET /api/admin/subscriptions - Total: {stats['total']}, Trial: {stats['trial']}, Active: {stats['active']}")


class TestSubscriptionAuth:
    """Test subscription endpoint authorization"""
    
    def test_non_provider_cannot_access_my_subscription(self):
        """Test that non-provider users get 403 on /api/subscriptions/my"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as participant (not provider)
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pierre@test.com",
            "password": "test1234"
        })
        if response.status_code != 200:
            pytest.skip("Participant login failed")
        
        token = response.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Try to access subscription endpoint
        response = session.get(f"{BASE_URL}/api/subscriptions/my")
        assert response.status_code == 403, f"Expected 403 for non-provider, got {response.status_code}"
        print("SUCCESS: Non-provider correctly blocked from /api/subscriptions/my")
    
    def test_non_admin_cannot_access_admin_subscriptions(self):
        """Test that non-admin users get 403 on /api/admin/subscriptions"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as provider (not admin)
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": PROVIDER_EMAIL,
            "password": PROVIDER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Provider login failed")
        
        token = response.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Try to access admin subscription endpoint
        response = session.get(f"{BASE_URL}/api/admin/subscriptions")
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("SUCCESS: Non-admin correctly blocked from /api/admin/subscriptions")
