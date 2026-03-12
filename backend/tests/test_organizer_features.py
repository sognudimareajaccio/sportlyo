"""
Test suite for SportLyo Organizer Dashboard Features - Iteration 10
Features tested:
1. OrganizerEventPage at /organizer/event/{eventId}
2. Add participant manually
3. Promo codes CRUD
4. Contact admin
5. Admin messages
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ORGANIZER_EMAIL = "club@paris-sport.fr"
ORGANIZER_PASSWORD = "club123"
ADMIN_EMAIL = "admin@sportsconnect.fr"
ADMIN_PASSWORD = "admin123"
TEST_EVENT_ID = "evt_f79c5cfd5036"

class TestOrganizerAuthentication:
    """Authentication tests for organizer endpoints"""
    
    @pytest.fixture
    def organizer_token(self):
        """Get organizer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        assert response.status_code == 200, f"Organizer login failed: {response.text}"
        return response.json().get('token')
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json().get('token')
    
    def test_organizer_login_success(self):
        """Test organizer can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] in ["organizer", "admin"]
        print("TEST PASSED: Organizer login successful")
    
    def test_admin_login_success(self):
        """Test admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print("TEST PASSED: Admin login successful")


class TestAddParticipantManually:
    """Test POST /api/organizer/events/{event_id}/add-participant"""
    
    @pytest.fixture
    def organizer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        return response.json().get('token')
    
    def test_add_participant_success(self, organizer_token):
        """Test adding participant manually"""
        unique_email = f"test_manual_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(
            f"{BASE_URL}/api/organizer/events/{TEST_EVENT_ID}/add-participant",
            headers={"Authorization": f"Bearer {organizer_token}"},
            json={
                "first_name": "Test",
                "last_name": "Manuel",
                "email": unique_email,
                "gender": "M",
                "birth_date": "1990-05-15"
            }
        )
        assert response.status_code == 200, f"Add participant failed: {response.text}"
        data = response.json()
        assert "registration_id" in data
        assert "bib_number" in data
        assert "message" in data
        print(f"TEST PASSED: Participant added - Bib: {data['bib_number']}")
    
    def test_add_participant_requires_auth(self):
        """Test that add-participant requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/organizer/events/{TEST_EVENT_ID}/add-participant",
            json={
                "first_name": "NoAuth",
                "last_name": "Test",
                "email": "noauth@test.com"
            }
        )
        assert response.status_code == 401, "Expected 401 without auth"
        print("TEST PASSED: Add participant requires authentication")
    
    def test_add_participant_requires_name_email(self, organizer_token):
        """Test validation: first_name, last_name, email required"""
        response = requests.post(
            f"{BASE_URL}/api/organizer/events/{TEST_EVENT_ID}/add-participant",
            headers={"Authorization": f"Bearer {organizer_token}"},
            json={"first_name": "OnlyFirst"}
        )
        assert response.status_code == 400, "Expected 400 for missing fields"
        print("TEST PASSED: Add participant validates required fields")


class TestPromoCodesCRUD:
    """Test promo codes CRUD operations"""
    
    @pytest.fixture
    def organizer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        return response.json().get('token')
    
    def test_get_promo_codes(self, organizer_token):
        """Test GET /api/organizer/promo-codes"""
        response = requests.get(
            f"{BASE_URL}/api/organizer/promo-codes",
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "promo_codes" in data
        assert isinstance(data["promo_codes"], list)
        print(f"TEST PASSED: GET promo-codes returned {len(data['promo_codes'])} codes")
    
    def test_create_promo_code(self, organizer_token):
        """Test POST /api/promo-codes"""
        unique_code = f"TEST{uuid.uuid4().hex[:6].upper()}"
        response = requests.post(
            f"{BASE_URL}/api/promo-codes",
            headers={"Authorization": f"Bearer {organizer_token}"},
            json={
                "code": unique_code,
                "discount_type": "percentage",
                "discount_value": 15,
                "max_uses": 10,
                "event_id": TEST_EVENT_ID
            }
        )
        assert response.status_code == 200, f"Create promo failed: {response.text}"
        data = response.json()
        assert data["code"] == unique_code
        print(f"TEST PASSED: Created promo code: {unique_code}")
        return unique_code
    
    def test_delete_promo_code(self, organizer_token):
        """Test DELETE /api/organizer/promo-codes/{promo_id}"""
        # First create a promo to delete
        unique_code = f"DEL{uuid.uuid4().hex[:6].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/promo-codes",
            headers={"Authorization": f"Bearer {organizer_token}"},
            json={
                "code": unique_code,
                "discount_type": "fixed",
                "discount_value": 5
            }
        )
        assert create_response.status_code == 200
        
        # Get promo ID
        list_response = requests.get(
            f"{BASE_URL}/api/organizer/promo-codes",
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        promos = list_response.json()["promo_codes"]
        promo_to_delete = next((p for p in promos if p["code"] == unique_code), None)
        assert promo_to_delete is not None, "Created promo not found in list"
        
        # Delete
        delete_response = requests.delete(
            f"{BASE_URL}/api/organizer/promo-codes/{promo_to_delete['promo_id']}",
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        assert delete_response.status_code == 200
        print(f"TEST PASSED: Deleted promo code: {unique_code}")


class TestContactAdmin:
    """Test contact admin functionality"""
    
    @pytest.fixture
    def organizer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        return response.json().get('token')
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get('token')
    
    def test_contact_admin_success(self, organizer_token):
        """Test POST /api/organizer/contact-admin"""
        response = requests.post(
            f"{BASE_URL}/api/organizer/contact-admin",
            headers={"Authorization": f"Bearer {organizer_token}"},
            json={
                "subject": "Test Refund Request",
                "message": "This is a test message for refund",
                "type": "refund",
                "event_id": TEST_EVENT_ID
            }
        )
        assert response.status_code == 200, f"Contact admin failed: {response.text}"
        data = response.json()
        assert "message" in data
        print("TEST PASSED: Contact admin message sent")
    
    def test_contact_admin_requires_auth(self):
        """Test contact-admin requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/organizer/contact-admin",
            json={
                "subject": "Test",
                "message": "Test message"
            }
        )
        assert response.status_code == 401
        print("TEST PASSED: Contact admin requires authentication")


class TestAdminMessages:
    """Test admin messages endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get('token')
    
    @pytest.fixture
    def organizer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        return response.json().get('token')
    
    def test_admin_get_messages(self, admin_token):
        """Test GET /api/admin/messages"""
        response = requests.get(
            f"{BASE_URL}/api/admin/messages",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get messages failed: {response.text}"
        data = response.json()
        assert "messages" in data
        assert isinstance(data["messages"], list)
        print(f"TEST PASSED: Admin messages returned {len(data['messages'])} messages")
    
    def test_admin_messages_requires_admin_role(self, organizer_token):
        """Test that /api/admin/messages requires admin role"""
        response = requests.get(
            f"{BASE_URL}/api/admin/messages",
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        assert response.status_code == 403, "Expected 403 for non-admin"
        print("TEST PASSED: Admin messages requires admin role")


class TestOrganizerRegistrations:
    """Test organizer registrations endpoint"""
    
    @pytest.fixture
    def organizer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        return response.json().get('token')
    
    def test_get_event_registrations(self, organizer_token):
        """Test GET /api/organizer/registrations/{event_id}"""
        response = requests.get(
            f"{BASE_URL}/api/organizer/registrations/{TEST_EVENT_ID}",
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        assert response.status_code == 200, f"Get registrations failed: {response.text}"
        data = response.json()
        assert "registrations" in data
        assert "event" in data
        print(f"TEST PASSED: Event registrations returned {len(data['registrations'])} registrations")
    
    def test_registrations_include_participant_data(self, organizer_token):
        """Test registrations include participant details"""
        response = requests.get(
            f"{BASE_URL}/api/organizer/registrations/{TEST_EVENT_ID}",
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        data = response.json()
        if data["registrations"]:
            reg = data["registrations"][0]
            assert "bib_number" in reg
            assert "user_email" in reg or "user_name" in reg
            print("TEST PASSED: Registrations include participant data")
        else:
            print("TEST PASSED: No registrations to verify (empty list)")


class TestExportTiming:
    """Test export timing CSV functionality"""
    
    @pytest.fixture
    def organizer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        return response.json().get('token')
    
    def test_export_timing_csv(self, organizer_token):
        """Test GET /api/organizer/events/{event_id}/export-timing"""
        response = requests.get(
            f"{BASE_URL}/api/organizer/events/{TEST_EVENT_ID}/export-timing",
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        assert response.status_code == 200
        assert 'text/csv' in response.headers.get('content-type', '')
        content = response.text
        assert 'BibNumber' in content or 'bib' in content.lower()
        print("TEST PASSED: Export timing CSV works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
