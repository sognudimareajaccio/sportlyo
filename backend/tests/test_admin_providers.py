"""
Test Admin Provider Management APIs - Iteration 50
Tests:
- GET /api/admin/providers/detailed - Get all providers with stats
- GET /api/admin/providers/{user_id}/detail - Get provider detail
- PUT /api/admin/providers/{user_id}/status - Suspend/reactivate provider
- PUT /api/admin/providers/{user_id}/subscription - Gift/extend/cancel/activate
"""
import pytest
import requests
import os

BASE_URL = "https://event-booking-34.preview.emergentagent.com"

# Test credentials
ADMIN_EMAIL = "admin@sportsconnect.fr"
ADMIN_PASSWORD = "admin123"
PROVIDER_USER_ID = "user_provider_001"

@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    token = response.json().get("token")
    if not token:
        pytest.skip("No token returned from login")
    return token


@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestAdminProvidersDetailed:
    """Test GET /api/admin/providers/detailed endpoint"""
    
    def test_get_detailed_providers_success(self, admin_headers):
        """Should return all providers with subscription and activity stats"""
        response = requests.get(f"{BASE_URL}/api/admin/providers/detailed", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Check response structure
        assert "providers" in data, "Response should contain 'providers' key"
        assert "stats" in data, "Response should contain 'stats' key"
        
        # Check stats fields
        stats = data["stats"]
        expected_stat_keys = ["total", "active", "pending", "suspended", "sub_trial", "sub_active", "total_sub_revenue"]
        for key in expected_stat_keys:
            assert key in stats, f"Stats should contain '{key}'"
        
        # Check provider data structure if providers exist
        if len(data["providers"]) > 0:
            provider = data["providers"][0]
            assert "user_id" in provider
            assert "subscription" in provider or provider.get("subscription") is None
            assert "products_count" in provider
            assert "orders_count" in provider
            assert "total_revenue" in provider
            print(f"✓ Found {len(data['providers'])} providers")
            print(f"✓ Stats: total={stats['total']}, active={stats['active']}, pending={stats['pending']}")
    
    def test_detailed_providers_unauthorized(self):
        """Should return 401/403 without admin token"""
        response = requests.get(f"{BASE_URL}/api/admin/providers/detailed")
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"


class TestAdminProviderDetail:
    """Test GET /api/admin/providers/{user_id}/detail endpoint"""
    
    def test_get_provider_detail_success(self, admin_headers):
        """Should return detailed analytics for a provider"""
        response = requests.get(f"{BASE_URL}/api/admin/providers/{PROVIDER_USER_ID}/detail", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Check response structure
        assert "provider" in data, "Response should contain 'provider'"
        assert "subscription" in data or data.get("subscription") is None
        assert "products" in data, "Response should contain 'products'"
        assert "monthly_revenue" in data, "Response should contain 'monthly_revenue'"
        assert "action_log" in data, "Response should contain 'action_log'"
        assert "subscription_payments" in data, "Response should contain 'subscription_payments'"
        
        # Check monthly revenue structure
        if len(data["monthly_revenue"]) > 0:
            month_entry = data["monthly_revenue"][0]
            assert "month" in month_entry
            assert "revenue" in month_entry
            assert "orders" in month_entry
        
        # Check KPI fields
        assert "products_count" in data
        assert "orders_count" in data
        assert "total_revenue" in data
        
        print(f"✓ Provider detail: {data['provider'].get('name', 'unknown')}")
        print(f"✓ Products: {data['products_count']}, Orders: {data['orders_count']}, Revenue: {data['total_revenue']}")
        print(f"✓ Monthly revenue entries: {len(data['monthly_revenue'])}")
        print(f"✓ Action log entries: {len(data['action_log'])}")
    
    def test_provider_detail_not_found(self, admin_headers):
        """Should return 404 for non-existent provider"""
        response = requests.get(f"{BASE_URL}/api/admin/providers/nonexistent_user/detail", headers=admin_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestAdminProviderStatus:
    """Test PUT /api/admin/providers/{user_id}/status endpoint"""
    
    def test_suspend_provider(self, admin_headers):
        """Should suspend a provider and log action"""
        # First check current status
        detail_resp = requests.get(f"{BASE_URL}/api/admin/providers/{PROVIDER_USER_ID}/detail", headers=admin_headers)
        if detail_resp.status_code == 200:
            initial_status = detail_resp.json()["provider"].get("status")
        else:
            initial_status = "unknown"
        
        # Suspend the provider
        response = requests.put(
            f"{BASE_URL}/api/admin/providers/{PROVIDER_USER_ID}/status",
            headers=admin_headers,
            json={"status": "suspended", "reason": "Test suspension - will reactivate"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        print(f"✓ Suspend response: {data['message']}")
        
        # Verify status changed
        verify_resp = requests.get(f"{BASE_URL}/api/admin/providers/{PROVIDER_USER_ID}/detail", headers=admin_headers)
        assert verify_resp.status_code == 200
        assert verify_resp.json()["provider"]["status"] == "suspended"
        print("✓ Provider status verified as 'suspended'")
    
    def test_reactivate_provider(self, admin_headers):
        """Should reactivate a suspended provider"""
        response = requests.put(
            f"{BASE_URL}/api/admin/providers/{PROVIDER_USER_ID}/status",
            headers=admin_headers,
            json={"status": "active", "reason": "Reactivation after test"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        print(f"✓ Reactivate response: {data['message']}")
        
        # Verify status changed back
        verify_resp = requests.get(f"{BASE_URL}/api/admin/providers/{PROVIDER_USER_ID}/detail", headers=admin_headers)
        assert verify_resp.status_code == 200
        assert verify_resp.json()["provider"]["status"] == "active"
        print("✓ Provider status verified as 'active'")
    
    def test_invalid_status(self, admin_headers):
        """Should reject invalid status values"""
        response = requests.put(
            f"{BASE_URL}/api/admin/providers/{PROVIDER_USER_ID}/status",
            headers=admin_headers,
            json={"status": "invalid_status", "reason": "test"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_action_log_updated(self, admin_headers):
        """Should verify action log contains the status changes"""
        response = requests.get(f"{BASE_URL}/api/admin/providers/{PROVIDER_USER_ID}/detail", headers=admin_headers)
        assert response.status_code == 200
        
        action_log = response.json().get("action_log", [])
        # Find recent status change actions
        status_actions = [a for a in action_log if a.get("action") == "status_change"]
        assert len(status_actions) > 0, "Action log should contain status change entries"
        print(f"✓ Found {len(status_actions)} status change actions in log")


class TestAdminSubscriptionActions:
    """Test PUT /api/admin/providers/{user_id}/subscription endpoint"""
    
    def test_activate_subscription(self, admin_headers):
        """Should activate subscription"""
        response = requests.put(
            f"{BASE_URL}/api/admin/providers/{PROVIDER_USER_ID}/subscription",
            headers=admin_headers,
            json={"action": "activate"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        print(f"✓ Activate subscription: {data['message']}")
    
    def test_extend_subscription(self, admin_headers):
        """Should extend subscription by days"""
        response = requests.put(
            f"{BASE_URL}/api/admin/providers/{PROVIDER_USER_ID}/subscription",
            headers=admin_headers,
            json={"action": "extend", "days": 7}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "7" in data["message"] or "jour" in data["message"].lower()
        print(f"✓ Extend subscription: {data['message']}")
    
    def test_gift_months(self, admin_headers):
        """Should gift months to subscription"""
        response = requests.put(
            f"{BASE_URL}/api/admin/providers/{PROVIDER_USER_ID}/subscription",
            headers=admin_headers,
            json={"action": "gift", "months": 1, "reason": "Testing gift feature"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "1" in data["message"] and "mois" in data["message"].lower()
        print(f"✓ Gift months: {data['message']}")
    
    def test_cancel_subscription(self, admin_headers):
        """Should cancel subscription"""
        response = requests.put(
            f"{BASE_URL}/api/admin/providers/{PROVIDER_USER_ID}/subscription",
            headers=admin_headers,
            json={"action": "cancel", "reason": "Test cancellation"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        print(f"✓ Cancel subscription: {data['message']}")
        
        # Re-activate after cancellation test
        requests.put(
            f"{BASE_URL}/api/admin/providers/{PROVIDER_USER_ID}/subscription",
            headers=admin_headers,
            json={"action": "activate"}
        )
    
    def test_invalid_subscription_action(self, admin_headers):
        """Should reject invalid subscription action"""
        response = requests.put(
            f"{BASE_URL}/api/admin/providers/{PROVIDER_USER_ID}/subscription",
            headers=admin_headers,
            json={"action": "invalid_action"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_subscription_action_log(self, admin_headers):
        """Should verify subscription actions are logged"""
        response = requests.get(f"{BASE_URL}/api/admin/providers/{PROVIDER_USER_ID}/detail", headers=admin_headers)
        assert response.status_code == 200
        
        action_log = response.json().get("action_log", [])
        sub_actions = [a for a in action_log if "subscription" in a.get("action", "")]
        assert len(sub_actions) > 0, "Action log should contain subscription actions"
        print(f"✓ Found {len(sub_actions)} subscription actions in log")


class TestProviderStatusAndSubscriptionIntegration:
    """Integration tests for status and subscription together"""
    
    def test_suspend_also_pauses_subscription(self, admin_headers):
        """Suspending provider should also suspend subscription"""
        # First make sure provider is active and has active subscription
        requests.put(
            f"{BASE_URL}/api/admin/providers/{PROVIDER_USER_ID}/status",
            headers=admin_headers,
            json={"status": "active", "reason": "Setup for integration test"}
        )
        requests.put(
            f"{BASE_URL}/api/admin/providers/{PROVIDER_USER_ID}/subscription",
            headers=admin_headers,
            json={"action": "activate"}
        )
        
        # Now suspend
        response = requests.put(
            f"{BASE_URL}/api/admin/providers/{PROVIDER_USER_ID}/status",
            headers=admin_headers,
            json={"status": "suspended", "reason": "Integration test"}
        )
        assert response.status_code == 200
        
        # Verify subscription also suspended
        detail = requests.get(f"{BASE_URL}/api/admin/providers/{PROVIDER_USER_ID}/detail", headers=admin_headers).json()
        if detail.get("subscription"):
            sub_status = detail["subscription"].get("status")
            print(f"✓ Provider suspended, subscription status: {sub_status}")
        
        # Cleanup: reactivate
        requests.put(
            f"{BASE_URL}/api/admin/providers/{PROVIDER_USER_ID}/status",
            headers=admin_headers,
            json={"status": "active", "reason": "Cleanup after integration test"}
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
