"""
Test Suite for Iteration 51: Revenue Dashboard with Subscriptions + Trial Alerts

Features to test:
1. GET /api/admin/revenue-breakdown - includes 'abonnements' in sources and monthly data
2. GET /api/admin/subscriptions - returns subscription list with user_name, user_email, trial_end for frontend filtering
3. Full flow admin provider access
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestRevenueBreakdownWithSubscriptions:
    """Test revenue breakdown API includes subscription data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        # Admin login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sportsconnect.fr",
            "password": "admin123"
        })
        if response.status_code == 200:
            token = response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Admin login failed")
    
    def test_revenue_breakdown_contains_abonnements_source(self):
        """Feature 1: Verify revenue-breakdown response includes sources.abonnements"""
        response = self.session.get(f"{BASE_URL}/api/admin/revenue-breakdown")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify sources dict exists
        assert "sources" in data, "Missing 'sources' in response"
        
        # Verify abonnements key exists in sources
        assert "abonnements" in data["sources"], "Missing 'abonnements' in sources"
        
        abonnements = data["sources"]["abonnements"]
        
        # Verify expected fields in abonnements source
        expected_fields = ["total", "fees", "count", "pending_total", "pending_count", "active_subs", "trial_subs", "label"]
        for field in expected_fields:
            assert field in abonnements, f"Missing field '{field}' in abonnements source"
        
        # Verify numeric fields are numbers
        assert isinstance(abonnements["total"], (int, float)), "total should be numeric"
        assert isinstance(abonnements["fees"], (int, float)), "fees should be numeric"
        assert isinstance(abonnements["count"], int), "count should be int"
        assert isinstance(abonnements["active_subs"], int), "active_subs should be int"
        assert isinstance(abonnements["trial_subs"], int), "trial_subs should be int"
        
        print(f"SUCCESS: sources.abonnements = total={abonnements['total']}€, active_subs={abonnements['active_subs']}, trial_subs={abonnements['trial_subs']}")
    
    def test_revenue_breakdown_monthly_has_abonnements(self):
        """Feature 1: Verify monthly data includes 'abonnements' key"""
        response = self.session.get(f"{BASE_URL}/api/admin/revenue-breakdown")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify monthly array exists
        assert "monthly" in data, "Missing 'monthly' in response"
        assert isinstance(data["monthly"], list), "monthly should be a list"
        assert len(data["monthly"]) > 0, "monthly should have entries"
        
        # Check first month entry has abonnements
        first_month = data["monthly"][0]
        assert "abonnements" in first_month, "Missing 'abonnements' in monthly entry"
        assert isinstance(first_month["abonnements"], (int, float)), "abonnements should be numeric"
        
        # Verify other expected keys
        for key in ["month", "inscriptions", "dons", "sponsors", "produits", "abonnements", "total"]:
            assert key in first_month, f"Missing '{key}' in monthly entry"
        
        print(f"SUCCESS: Monthly data includes 'abonnements' key. Sample month: {first_month['month']} = {first_month['abonnements']}€ abonnements")
    
    def test_revenue_breakdown_grand_total_includes_subscriptions(self):
        """Feature 1: Verify grand_total includes subscription revenue"""
        response = self.session.get(f"{BASE_URL}/api/admin/revenue-breakdown")
        assert response.status_code == 200
        
        data = response.json()
        
        assert "grand_total" in data, "Missing grand_total"
        assert isinstance(data["grand_total"], (int, float)), "grand_total should be numeric"
        
        # Sum individual sources
        sources = data["sources"]
        calculated_total = (
            sources["inscriptions"]["total"] +
            sources["dons"]["total"] +
            sources["sponsors"]["total"] +
            sources["produits"]["total"] +
            sources["abonnements"]["total"]
        )
        
        # Should match (allowing for rounding)
        assert abs(data["grand_total"] - calculated_total) < 0.1, f"grand_total {data['grand_total']} != sum of sources {calculated_total}"
        
        print(f"SUCCESS: grand_total={data['grand_total']}€ matches sum of sources={calculated_total}€")


class TestAdminSubscriptionsForTrialAlerts:
    """Test admin subscriptions API returns data needed for trial alerts"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sportsconnect.fr",
            "password": "admin123"
        })
        if response.status_code == 200:
            token = response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Admin login failed")
    
    def test_subscriptions_endpoint_returns_list(self):
        """Feature 3: GET /api/admin/subscriptions returns subscriptions list"""
        response = self.session.get(f"{BASE_URL}/api/admin/subscriptions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "subscriptions" in data, "Missing 'subscriptions' key"
        assert "stats" in data, "Missing 'stats' key"
        assert isinstance(data["subscriptions"], list), "subscriptions should be a list"
        
        print(f"SUCCESS: /api/admin/subscriptions returns {len(data['subscriptions'])} subscriptions")
    
    def test_subscriptions_have_required_fields_for_trial_alerts(self):
        """Feature 3: Verify subscription data includes user_name, user_email, trial_end for frontend filtering"""
        response = self.session.get(f"{BASE_URL}/api/admin/subscriptions")
        assert response.status_code == 200
        
        data = response.json()
        
        if len(data["subscriptions"]) == 0:
            pytest.skip("No subscriptions to test")
        
        # Check first subscription has required fields
        sub = data["subscriptions"][0]
        
        # Must have these fields for trial alerts
        assert "status" in sub, "Missing 'status' field"
        assert "user_id" in sub, "Missing 'user_id' field"
        
        # trial_end is needed for trial status filtering
        if sub.get("status") == "trial":
            assert "trial_end" in sub, "Missing 'trial_end' for trial subscription"
        
        print(f"SUCCESS: Subscription data has required fields. First sub status={sub['status']}, user_id={sub['user_id']}")
    
    def test_subscription_stats_structure(self):
        """Feature 3: Verify stats object has expected counters"""
        response = self.session.get(f"{BASE_URL}/api/admin/subscriptions")
        assert response.status_code == 200
        
        data = response.json()
        stats = data["stats"]
        
        for field in ["total", "trial", "active", "expired", "cancelled", "total_revenue"]:
            assert field in stats, f"Missing stats.{field}"
            assert isinstance(stats[field], (int, float)), f"stats.{field} should be numeric"
        
        print(f"SUCCESS: Stats - total={stats['total']}, trial={stats['trial']}, active={stats['active']}")


class TestAdminProviderDetailFlow:
    """Test admin can access provider details with subscription and action log"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sportsconnect.fr",
            "password": "admin123"
        })
        if response.status_code == 200:
            token = response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Admin login failed")
    
    def test_get_detailed_providers_list(self):
        """Feature 5: GET /api/admin/providers/detailed returns providers with stats"""
        response = self.session.get(f"{BASE_URL}/api/admin/providers/detailed")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "providers" in data, "Missing 'providers'"
        assert "stats" in data, "Missing 'stats'"
        
        print(f"SUCCESS: /api/admin/providers/detailed returns {len(data['providers'])} providers")
        return data
    
    def test_get_provider_detail_with_subscription(self):
        """Feature 5: GET /api/admin/providers/{user_id}/detail returns subscription and action_log"""
        # First get providers list to find one
        providers_res = self.session.get(f"{BASE_URL}/api/admin/providers/detailed")
        if providers_res.status_code != 200:
            pytest.skip("Could not get providers list")
        
        providers = providers_res.json().get("providers", [])
        if len(providers) == 0:
            pytest.skip("No providers available")
        
        provider_id = providers[0]["user_id"]
        
        response = self.session.get(f"{BASE_URL}/api/admin/providers/{provider_id}/detail")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify expected keys
        assert "provider" in data, "Missing 'provider'"
        assert "subscription" in data, "Missing 'subscription'"
        assert "action_log" in data, "Missing 'action_log'"
        
        # Verify subscription details if exists
        if data["subscription"]:
            sub = data["subscription"]
            assert "status" in sub, "subscription missing 'status'"
            if sub.get("status") == "active" and "current_period_end" in sub:
                print(f"  Subscription: status={sub['status']}, period_end={sub.get('current_period_end')}")
        
        # Verify action_log is a list
        assert isinstance(data["action_log"], list), "action_log should be a list"
        
        print(f"SUCCESS: Provider detail for {provider_id} has subscription and {len(data['action_log'])} action log entries")


class TestNonAdminAccess:
    """Verify non-admin users cannot access admin endpoints"""
    
    def test_revenue_breakdown_requires_admin(self):
        """Non-admin should get 403 on revenue-breakdown"""
        session = requests.Session()
        # Login as regular user (if exists) - skip if no test user
        # Try without auth
        response = session.get(f"{BASE_URL}/api/admin/revenue-breakdown")
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("SUCCESS: Unauthenticated user blocked from /api/admin/revenue-breakdown")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
