"""
Test P2 Features for SportLyo:
1) Facturation avancée (PDF invoices)
2) Communauté événements (community posts/replies)
3) Remboursements (refund requests)
4) Location RFID (equipment rental)
5) Check-in mobile (participant check-in)
6) Statistiques avancées (organizer analytics)
7) Notifications SMS (Twilio - graceful degradation)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sporting-portal.preview.emergentagent.com')

# Credentials
ADMIN_EMAIL = "admin@sportsconnect.fr"
ADMIN_PASSWORD = "admin123"
ORGANIZER_EMAIL = "club@paris-sport.fr"
ORGANIZER_PASSWORD = "club123"
PARTICIPANT_EMAIL = "pierre@test.com"
PARTICIPANT_PASSWORD = "test1234"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip("Admin login failed")


@pytest.fixture(scope="module")
def organizer_token():
    """Get organizer auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ORGANIZER_EMAIL, "password": ORGANIZER_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip("Organizer login failed")


@pytest.fixture(scope="module")
def participant_token():
    """Get participant auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": PARTICIPANT_EMAIL, "password": PARTICIPANT_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip("Participant login failed")


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ============== 1) INVOICES (PDF) ==============

class TestInvoices:
    """Test invoice endpoints"""

    def test_admin_invoices_requires_auth(self):
        """GET /api/admin/invoices - requires auth"""
        resp = requests.get(f"{BASE_URL}/api/admin/invoices")
        assert resp.status_code == 401

    def test_admin_invoices_requires_admin_role(self, participant_token):
        """GET /api/admin/invoices - requires admin role"""
        resp = requests.get(f"{BASE_URL}/api/admin/invoices", headers=auth_headers(participant_token))
        assert resp.status_code == 403

    def test_admin_invoices_returns_structure(self, admin_token):
        """GET /api/admin/invoices - returns correct structure"""
        resp = requests.get(f"{BASE_URL}/api/admin/invoices", headers=auth_headers(admin_token))
        assert resp.status_code == 200
        data = resp.json()
        assert "invoices" in data
        assert "total_count" in data
        assert "total_amount" in data
        assert isinstance(data["invoices"], list)
        assert isinstance(data["total_count"], int)
        assert isinstance(data["total_amount"], (int, float))


# ============== 2) COMMUNITY POSTS ==============

class TestCommunity:
    """Test community posts and replies"""

    @pytest.fixture
    def test_event_id(self):
        """Get a test event ID"""
        # Use the event from the test request
        return "evt_186d17f1a749"

    def test_get_community_posts_public(self, test_event_id):
        """GET /api/events/{event_id}/community - public endpoint"""
        resp = requests.get(f"{BASE_URL}/api/events/{test_event_id}/community")
        assert resp.status_code == 200
        data = resp.json()
        assert "posts" in data
        assert "total" in data
        assert isinstance(data["posts"], list)

    def test_create_community_post_requires_auth(self, test_event_id):
        """POST /api/events/{event_id}/community - requires auth"""
        resp = requests.post(f"{BASE_URL}/api/events/{test_event_id}/community", json={"content": "Test"})
        assert resp.status_code == 401

    def test_create_community_post_success(self, test_event_id, participant_token):
        """POST /api/events/{event_id}/community - creates a post"""
        unique_content = f"TEST_post_{uuid.uuid4().hex[:8]}"
        resp = requests.post(
            f"{BASE_URL}/api/events/{test_event_id}/community",
            json={"content": unique_content},
            headers=auth_headers(participant_token)
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "post" in data
        assert data["post"]["content"] == unique_content
        assert "post_id" in data["post"]
        # Save for cleanup
        return data["post"]["post_id"]

    def test_like_post_requires_auth(self):
        """POST /api/community/posts/{post_id}/like - requires auth"""
        resp = requests.post(f"{BASE_URL}/api/community/posts/fake_post_id/like")
        assert resp.status_code == 401

    def test_reply_requires_auth(self):
        """POST /api/community/posts/{post_id}/replies - requires auth"""
        resp = requests.post(f"{BASE_URL}/api/community/posts/fake_post_id/replies", json={"content": "Reply"})
        assert resp.status_code == 401


# ============== 3) REFUNDS ==============

class TestRefunds:
    """Test refund endpoints"""

    def test_my_refunds_requires_auth(self):
        """GET /api/refunds/my - requires auth"""
        resp = requests.get(f"{BASE_URL}/api/refunds/my")
        assert resp.status_code == 401

    def test_my_refunds_returns_list(self, participant_token):
        """GET /api/refunds/my - returns refunds list"""
        resp = requests.get(f"{BASE_URL}/api/refunds/my", headers=auth_headers(participant_token))
        assert resp.status_code == 200
        data = resp.json()
        assert "refunds" in data
        assert isinstance(data["refunds"], list)

    def test_admin_refunds_requires_auth(self):
        """GET /api/admin/refunds/all - requires auth"""
        resp = requests.get(f"{BASE_URL}/api/admin/refunds/all")
        assert resp.status_code == 401

    def test_admin_refunds_requires_admin_role(self, participant_token):
        """GET /api/admin/refunds/all - requires admin role"""
        resp = requests.get(f"{BASE_URL}/api/admin/refunds/all", headers=auth_headers(participant_token))
        assert resp.status_code == 403

    def test_admin_refunds_returns_list(self, admin_token):
        """GET /api/admin/refunds/all - returns refunds list"""
        resp = requests.get(f"{BASE_URL}/api/admin/refunds/all", headers=auth_headers(admin_token))
        assert resp.status_code == 200
        data = resp.json()
        assert "refunds" in data
        assert isinstance(data["refunds"], list)


# ============== 4) RFID EQUIPMENT ==============

class TestRfidEquipment:
    """Test RFID equipment rental endpoints"""

    def test_get_equipment_public(self):
        """GET /api/rfid/equipment - public endpoint"""
        resp = requests.get(f"{BASE_URL}/api/rfid/equipment")
        assert resp.status_code == 200
        data = resp.json()
        assert "equipment" in data
        assert isinstance(data["equipment"], list)
        # Should have 6 seeded items
        assert len(data["equipment"]) >= 6

    def test_equipment_has_required_fields(self):
        """GET /api/rfid/equipment - items have required fields"""
        resp = requests.get(f"{BASE_URL}/api/rfid/equipment")
        assert resp.status_code == 200
        equipment = resp.json()["equipment"]
        if equipment:
            item = equipment[0]
            assert "equipment_id" in item
            assert "name" in item
            assert "daily_rate" in item
            assert "category" in item

    def test_create_rental_requires_auth(self):
        """POST /api/rfid/rentals - requires auth"""
        resp = requests.post(f"{BASE_URL}/api/rfid/rentals", json={})
        assert resp.status_code == 401

    def test_create_rental_requires_organizer(self, participant_token):
        """POST /api/rfid/rentals - requires organizer role"""
        resp = requests.post(f"{BASE_URL}/api/rfid/rentals", json={}, headers=auth_headers(participant_token))
        assert resp.status_code == 403

    def test_my_rentals_requires_auth(self):
        """GET /api/rfid/rentals/my - requires auth"""
        resp = requests.get(f"{BASE_URL}/api/rfid/rentals/my")
        assert resp.status_code == 401

    def test_my_rentals_returns_list(self, organizer_token):
        """GET /api/rfid/rentals/my - returns rentals list"""
        resp = requests.get(f"{BASE_URL}/api/rfid/rentals/my", headers=auth_headers(organizer_token))
        assert resp.status_code == 200
        data = resp.json()
        assert "rentals" in data
        assert isinstance(data["rentals"], list)


# ============== 5) CHECK-IN ==============

class TestCheckin:
    """Test check-in endpoints"""

    def test_checkin_scan_requires_auth(self):
        """POST /api/checkin/scan - requires auth"""
        resp = requests.post(f"{BASE_URL}/api/checkin/scan", json={})
        assert resp.status_code == 401

    def test_checkin_scan_requires_organizer(self, participant_token):
        """POST /api/checkin/scan - requires organizer role"""
        resp = requests.post(f"{BASE_URL}/api/checkin/scan", json={}, headers=auth_headers(participant_token))
        assert resp.status_code == 403

    def test_checkin_stats_requires_auth(self):
        """GET /api/checkin/stats/{event_id} - requires auth"""
        resp = requests.get(f"{BASE_URL}/api/checkin/stats/fake_event_id")
        assert resp.status_code == 401

    def test_checkin_stats_requires_organizer(self, participant_token):
        """GET /api/checkin/stats/{event_id} - requires organizer role"""
        resp = requests.get(f"{BASE_URL}/api/checkin/stats/fake_event_id", headers=auth_headers(participant_token))
        assert resp.status_code == 403

    def test_checkin_search_requires_auth(self):
        """GET /api/checkin/search/{event_id} - requires auth"""
        resp = requests.get(f"{BASE_URL}/api/checkin/search/fake_event_id?q=test")
        assert resp.status_code == 401

    def test_checkin_search_requires_organizer(self, participant_token):
        """GET /api/checkin/search/{event_id} - requires organizer role"""
        resp = requests.get(f"{BASE_URL}/api/checkin/search/fake_event_id?q=test", headers=auth_headers(participant_token))
        assert resp.status_code == 403


# ============== 6) ANALYTICS ==============

class TestAnalytics:
    """Test organizer analytics endpoint"""

    def test_analytics_requires_auth(self):
        """GET /api/organizer/analytics - requires auth"""
        resp = requests.get(f"{BASE_URL}/api/organizer/analytics")
        assert resp.status_code == 401

    def test_analytics_requires_organizer(self, participant_token):
        """GET /api/organizer/analytics - requires organizer role"""
        resp = requests.get(f"{BASE_URL}/api/organizer/analytics", headers=auth_headers(participant_token))
        assert resp.status_code == 403

    def test_analytics_returns_structure(self, organizer_token):
        """GET /api/organizer/analytics - returns correct structure"""
        resp = requests.get(f"{BASE_URL}/api/organizer/analytics", headers=auth_headers(organizer_token))
        assert resp.status_code == 200
        data = resp.json()
        assert "overview" in data
        assert "events" in data
        assert "monthly_trend" in data
        assert "tshirt_distribution" in data
        # Verify overview structure
        overview = data["overview"]
        assert "total_events" in overview
        assert "total_registrations" in overview
        assert "total_revenue" in overview
        assert "checkin_rate" in overview


# ============== 7) SMS NOTIFICATIONS ==============

class TestSmsNotifications:
    """Test SMS notification endpoints (Twilio - graceful degradation)"""

    def test_sms_history_requires_auth(self):
        """GET /api/sms/history - requires auth"""
        resp = requests.get(f"{BASE_URL}/api/sms/history")
        assert resp.status_code == 401

    def test_sms_history_requires_organizer(self, participant_token):
        """GET /api/sms/history - requires organizer role"""
        resp = requests.get(f"{BASE_URL}/api/sms/history", headers=auth_headers(participant_token))
        assert resp.status_code == 403

    def test_sms_history_returns_list(self, organizer_token):
        """GET /api/sms/history - returns history list"""
        resp = requests.get(f"{BASE_URL}/api/sms/history", headers=auth_headers(organizer_token))
        assert resp.status_code == 200
        data = resp.json()
        assert "history" in data
        assert isinstance(data["history"], list)

    def test_sms_send_requires_auth(self):
        """POST /api/sms/send - requires auth"""
        resp = requests.post(f"{BASE_URL}/api/sms/send", json={})
        assert resp.status_code == 401

    def test_sms_send_requires_organizer(self, participant_token):
        """POST /api/sms/send - requires organizer role"""
        resp = requests.post(f"{BASE_URL}/api/sms/send", json={}, headers=auth_headers(participant_token))
        assert resp.status_code == 403

    def test_sms_config_requires_auth(self):
        """GET /api/sms/config - requires auth"""
        resp = requests.get(f"{BASE_URL}/api/sms/config")
        assert resp.status_code == 401

    def test_sms_config_requires_admin(self, organizer_token):
        """GET /api/sms/config - requires admin role"""
        resp = requests.get(f"{BASE_URL}/api/sms/config", headers=auth_headers(organizer_token))
        assert resp.status_code == 403

    def test_sms_config_returns_status(self, admin_token):
        """GET /api/sms/config - returns config status"""
        resp = requests.get(f"{BASE_URL}/api/sms/config", headers=auth_headers(admin_token))
        assert resp.status_code == 200
        data = resp.json()
        assert "configured" in data
        assert "has_sid" in data
        assert "has_token" in data
        assert "has_from" in data


# ============== INTEGRATION TESTS ==============

class TestIntegration:
    """Integration tests for P2 features"""

    def test_rfid_rental_full_flow(self, organizer_token):
        """Test RFID rental flow: get equipment -> create rental"""
        # Get equipment
        eq_resp = requests.get(f"{BASE_URL}/api/rfid/equipment")
        assert eq_resp.status_code == 200
        equipment = eq_resp.json()["equipment"]
        assert len(equipment) > 0

        # Get organizer's events
        events_resp = requests.get(f"{BASE_URL}/api/organizer/events", headers=auth_headers(organizer_token))
        if events_resp.status_code != 200 or not events_resp.json().get("events"):
            pytest.skip("No organizer events available")
        event_id = events_resp.json()["events"][0]["event_id"]

        # Create rental
        rental_resp = requests.post(
            f"{BASE_URL}/api/rfid/rentals",
            json={
                "event_id": event_id,
                "items": [{"equipment_id": equipment[0]["equipment_id"], "quantity": 1, "days": 3}],
                "start_date": "2025-02-01",
                "end_date": "2025-02-03"
            },
            headers=auth_headers(organizer_token)
        )
        assert rental_resp.status_code == 200
        rental_data = rental_resp.json()
        assert "rental" in rental_data
        assert rental_data["rental"]["status"] == "pending"

    def test_sms_send_graceful_degradation(self, organizer_token):
        """Test SMS send in graceful degradation mode (queued, not sent)"""
        # Get organizer's events
        events_resp = requests.get(f"{BASE_URL}/api/organizer/events", headers=auth_headers(organizer_token))
        if events_resp.status_code != 200 or not events_resp.json().get("events"):
            pytest.skip("No organizer events available")
        event_id = events_resp.json()["events"][0]["event_id"]

        # Send SMS (should be queued, not sent, since Twilio not configured)
        sms_resp = requests.post(
            f"{BASE_URL}/api/sms/send",
            json={
                "event_id": event_id,
                "message": f"TEST_sms_{uuid.uuid4().hex[:8]}",
                "recipients": "all"
            },
            headers=auth_headers(organizer_token)
        )
        assert sms_resp.status_code == 200
        sms_data = sms_resp.json()
        assert "sms" in sms_data
        # Should be queued (graceful degradation)
        assert sms_data["sms"]["status"] in ["queued", "sent"]
        assert "twilio_enabled" in sms_data["sms"]
