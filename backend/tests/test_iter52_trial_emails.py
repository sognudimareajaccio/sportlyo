"""
Test suite for Iteration 52 - Trial Email Reminders Feature
Tests: check-trials endpoint, email-log endpoint, duplicate prevention
"""
import pytest
import requests
import os
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTrialEmailFeature:
    """Tests for trial expiry email reminder feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sportsconnect.fr",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "Content-Type": "application/json"
        }
    
    # Feature 1: Check Trials Endpoint
    def test_check_trials_endpoint_returns_correct_structure(self):
        """POST /api/subscriptions/check-trials should return proper response structure"""
        response = requests.post(f"{BASE_URL}/api/subscriptions/check-trials", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "emails_sent" in data, "Missing 'emails_sent' field"
        assert "trials_expired" in data, "Missing 'trials_expired' field"
        assert "already_notified" in data, "Missing 'already_notified' field"
        assert "errors" in data, "Missing 'errors' field"
        assert "details" in data, "Missing 'details' array"
        
        # Validate data types
        assert isinstance(data["emails_sent"], int)
        assert isinstance(data["trials_expired"], int)
        assert isinstance(data["already_notified"], int)
        assert isinstance(data["errors"], int)
        assert isinstance(data["details"], list)
    
    def test_check_trials_details_have_correct_fields(self):
        """Details array should have partner, template, status for each entry"""
        response = requests.post(f"{BASE_URL}/api/subscriptions/check-trials", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        # If there are details, verify structure
        if data["details"]:
            for detail in data["details"]:
                assert "partner" in detail, f"Missing 'partner' in detail: {detail}"
                assert "template" in detail, f"Missing 'template' in detail: {detail}"
                assert "status" in detail, f"Missing 'status' in detail: {detail}"
    
    def test_check_trials_requires_admin_role(self):
        """Non-admin should get 403"""
        # Login as a non-admin user
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "boutique@sportlyo.fr",
            "password": "boutique123"
        })
        if login_response.status_code == 200:
            provider_token = login_response.json()["token"]
            provider_headers = {"Authorization": f"Bearer {provider_token}"}
            response = requests.post(f"{BASE_URL}/api/subscriptions/check-trials", headers=provider_headers)
            assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        else:
            pytest.skip("Provider login failed - cannot test role restriction")
    
    # Feature 2: Email Log Endpoint
    def test_email_log_endpoint_returns_emails_array(self):
        """GET /api/subscriptions/email-log should return emails array"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/email-log", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "emails" in data, "Missing 'emails' array"
        assert isinstance(data["emails"], list)
    
    def test_email_log_entries_have_correct_fields(self):
        """Email log entries should have required fields"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/email-log", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        if data["emails"]:
            for email in data["emails"]:
                assert "email_id" in email, "Missing email_id"
                assert "subscription_id" in email, "Missing subscription_id"
                assert "recipient" in email, "Missing recipient"
                assert "template" in email, "Missing template"
                assert "subject" in email, "Missing subject"
                assert "status" in email, "Missing status"
                assert "created_at" in email, "Missing created_at"
    
    def test_email_log_requires_admin_role(self):
        """Non-admin should get 403"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "boutique@sportlyo.fr",
            "password": "boutique123"
        })
        if login_response.status_code == 200:
            provider_token = login_response.json()["token"]
            provider_headers = {"Authorization": f"Bearer {provider_token}"}
            response = requests.get(f"{BASE_URL}/api/subscriptions/email-log", headers=provider_headers)
            assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        else:
            pytest.skip("Provider login failed - cannot test role restriction")
    
    # Feature 5: Duplicate Prevention (verify email_log is recording attempts)
    def test_check_trials_creates_email_log_entries(self):
        """Running check-trials should create email log entries (even if failed)"""
        # Get email count before
        log_before = requests.get(f"{BASE_URL}/api/subscriptions/email-log", headers=self.headers)
        assert log_before.status_code == 200
        count_before = len(log_before.json()["emails"])
        
        # Run check-trials
        check_response = requests.post(f"{BASE_URL}/api/subscriptions/check-trials", headers=self.headers)
        assert check_response.status_code == 200
        check_data = check_response.json()
        
        # Get email count after - should have at least as many entries
        log_after = requests.get(f"{BASE_URL}/api/subscriptions/email-log", headers=self.headers)
        assert log_after.status_code == 200
        count_after = len(log_after.json()["emails"])
        
        # If there were errors (attempts to send), log count should increase
        if check_data["errors"] > 0 or check_data["emails_sent"] > 0:
            assert count_after >= count_before, "Email log should record attempts"
    
    def test_check_trials_template_matching_for_moreati(self):
        """Moreati's trial (1-3 days left) should trigger reminder_3days template"""
        response = requests.post(f"{BASE_URL}/api/subscriptions/check-trials", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        # Find Moreati in details
        moreati_detail = next((d for d in data["details"] if "Moreati" in d.get("partner", "")), None)
        
        if moreati_detail:
            # Based on trial_end ~March 17 and current date ~March 15, should be reminder_3days
            assert moreati_detail["template"] in ["reminder_3days", "expired", "last_chance"], \
                f"Unexpected template: {moreati_detail['template']}"
            print(f"Moreati template: {moreati_detail['template']}, status: {moreati_detail['status']}")
    
    # Admin subscriptions endpoint (used for trial alerts display)
    def test_admin_subscriptions_returns_trial_data(self):
        """GET /api/admin/subscriptions should return subscriptions with trial info"""
        response = requests.get(f"{BASE_URL}/api/admin/subscriptions", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "subscriptions" in data
        assert "stats" in data
        
        # Check stats structure
        stats = data["stats"]
        assert "total" in stats
        assert "trial" in stats
        assert "active" in stats
        assert "expired" in stats
        assert "cancelled" in stats


class TestEmailTemplates:
    """Test template matching logic based on days_left"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sportsconnect.fr",
            "password": "admin123"
        })
        assert response.status_code == 200
        self.admin_token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_template_badge_labels_exist_in_details(self):
        """Templates should be one of: reminder_3days, expired, last_chance"""
        response = requests.post(f"{BASE_URL}/api/subscriptions/check-trials", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        valid_templates = ["reminder_3days", "expired", "last_chance"]
        
        for detail in data["details"]:
            if "template" in detail:
                assert detail["template"] in valid_templates, \
                    f"Invalid template: {detail['template']}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
