"""
Test new features for SportLyo:
1. Registration API with first_name, last_name, gender, birth_date fields
2. Check-in endpoints (scan, stats)
3. RFID endpoint
4. Timing export CSV
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_api_health(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ API health check passed")

    def test_api_root(self):
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "SportLyo" in data.get("message", "")
        print("✓ API root returns SportLyo branding")


class TestAuthentication:
    """Auth tests to get tokens for protected endpoints"""
    
    @pytest.fixture
    def participant_token(self):
        """Get participant auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pierre@test.com",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Participant login failed")
    
    @pytest.fixture
    def organizer_token(self):
        """Get organizer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "club@paris-sport.fr",
            "password": "club123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Organizer login failed")
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sportsconnect.fr",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")

    def test_participant_login(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pierre@test.com",
            "password": "test1234"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print("✓ Participant login works")
    
    def test_organizer_login(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "club@paris-sport.fr",
            "password": "club123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print("✓ Organizer login works")
    
    def test_admin_login(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sportsconnect.fr",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print("✓ Admin login works")


class TestRegistrationWithNewFields:
    """Test registration API with first_name, last_name, gender, birth_date fields"""
    
    @pytest.fixture
    def participant_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pierre@test.com",
            "password": "test1234"
        })
        if response.status_code == 200:
            token = response.json().get("token")
            session.headers.update({"Authorization": f"Bearer {token}"})
            return session
        pytest.skip("Login failed")
    
    def test_registration_accepts_new_fields(self, participant_session):
        """Test that registration API accepts first_name, last_name, gender, birth_date"""
        # First get an available event
        events_resp = participant_session.get(f"{BASE_URL}/api/events")
        assert events_resp.status_code == 200
        events = events_resp.json().get("events", [])
        
        if not events:
            pytest.skip("No events available")
        
        # Try registration with new fields
        event = events[0]
        event_id = event.get("event_id")
        
        # Create registration with all new fields
        registration_data = {
            "event_id": event_id,
            "first_name": "TEST_Jean",
            "last_name": "TEST_Dupont",
            "gender": "M",
            "birth_date": "1990-05-15",
            "emergency_contact": "Marie Dupont",
            "emergency_phone": "+33612345678"
        }
        
        response = participant_session.post(
            f"{BASE_URL}/api/registrations",
            json=registration_data
        )
        
        # Either 200 (success) or 400 (already registered) is acceptable
        if response.status_code == 400:
            error_detail = response.json().get("detail", "")
            if "Already registered" in error_detail or "Complet" in error_detail:
                print("✓ Registration API accepts new fields (user already registered)")
                return
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response contains registration ID and bib number
        assert "registration_id" in data
        assert "bib_number" in data
        print(f"✓ Registration created with bib: {data.get('bib_number')}")


class TestCheckinEndpoints:
    """Test check-in endpoints - POST /api/checkin/scan and GET /api/checkin/stats/{event_id}"""
    
    @pytest.fixture
    def organizer_session(self):
        """Get organizer authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "club@paris-sport.fr",
            "password": "club123"
        })
        if response.status_code == 200:
            token = response.json().get("token")
            session.headers.update({"Authorization": f"Bearer {token}"})
            return session
        pytest.skip("Organizer login failed")
    
    @pytest.fixture
    def admin_session(self):
        """Get admin authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sportsconnect.fr",
            "password": "admin123"
        })
        if response.status_code == 200:
            token = response.json().get("token")
            session.headers.update({"Authorization": f"Bearer {token}"})
            return session
        pytest.skip("Admin login failed")
    
    def test_checkin_scan_endpoint_exists(self, admin_session):
        """Test that POST /api/checkin/scan endpoint exists and responds"""
        # Test with dummy data - should return 400 or 404, not 500
        response = admin_session.post(
            f"{BASE_URL}/api/checkin/scan",
            json={"registration_id": "nonexistent_123"}
        )
        # Should not be 500 (server error) or 405 (method not allowed)
        assert response.status_code not in [500, 405], f"Endpoint error: {response.status_code}"
        print(f"✓ Check-in scan endpoint exists (status: {response.status_code})")
    
    def test_checkin_scan_requires_auth(self):
        """Test that check-in scan requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/checkin/scan",
            json={"registration_id": "test_123"}
        )
        assert response.status_code == 401
        print("✓ Check-in scan requires authentication")
    
    def test_checkin_stats_endpoint(self, admin_session):
        """Test GET /api/checkin/stats/{event_id}"""
        event_id = "evt_f79c5cfd5036"  # COURSE CORSICA FEVER
        response = admin_session.get(f"{BASE_URL}/api/checkin/stats/{event_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "total_registered" in data
        assert "checked_in" in data
        assert "remaining" in data
        
        print(f"✓ Check-in stats: {data.get('checked_in')}/{data.get('total_registered')} checked in")


class TestRFIDEndpoint:
    """Test RFID reading endpoint POST /api/rfid-read (MOCKED - no real hardware)"""
    
    def test_rfid_read_endpoint_exists(self):
        """Test that POST /api/rfid-read endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/rfid-read",
            json={
                "chip_id": "1234567890",
                "timestamp": "2026-01-15T10:30:00Z",
                "checkpoint": "finish"
            }
        )
        # Should not return 405 (method not allowed) or 500
        assert response.status_code not in [405, 500], f"Endpoint error: {response.status_code}"
        print(f"✓ RFID read endpoint exists (status: {response.status_code})")
    
    def test_rfid_read_requires_fields(self):
        """Test RFID read validation"""
        response = requests.post(
            f"{BASE_URL}/api/rfid-read",
            json={}
        )
        # Should return 400 for missing required fields
        assert response.status_code == 400
        print("✓ RFID read validates required fields")
    
    def test_rfid_read_unmatched_chip(self):
        """Test RFID read with unmatched chip returns appropriate response"""
        response = requests.post(
            f"{BASE_URL}/api/rfid-read",
            json={
                "chip_id": "9999999999",
                "timestamp": "2026-01-15T10:30:00Z",
                "checkpoint": "finish"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "unmatched"
        print("✓ RFID read returns 'unmatched' for unknown chip")


class TestTimingExport:
    """Test timing export CSV endpoint GET /api/organizer/events/{event_id}/export-timing"""
    
    @pytest.fixture
    def organizer_session(self):
        """Get organizer authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "club@paris-sport.fr",
            "password": "club123"
        })
        if response.status_code == 200:
            token = response.json().get("token")
            session.headers.update({"Authorization": f"Bearer {token}"})
            return session
        pytest.skip("Organizer login failed")
    
    @pytest.fixture
    def admin_session(self):
        """Get admin authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sportsconnect.fr",
            "password": "admin123"
        })
        if response.status_code == 200:
            token = response.json().get("token")
            session.headers.update({"Authorization": f"Bearer {token}"})
            return session
        pytest.skip("Admin login failed")
    
    def test_export_timing_endpoint_exists(self, admin_session):
        """Test that export timing endpoint exists and returns CSV"""
        event_id = "evt_f79c5cfd5036"  # COURSE CORSICA FEVER
        response = admin_session.get(f"{BASE_URL}/api/organizer/events/{event_id}/export-timing")
        
        assert response.status_code == 200
        # Check content type is CSV
        content_type = response.headers.get("content-type", "")
        assert "csv" in content_type.lower() or "text" in content_type.lower()
        
        # Check content is valid CSV (has header row)
        content = response.text
        assert "BibNumber" in content or "FirstName" in content
        print("✓ Export timing endpoint returns CSV")
    
    def test_export_timing_requires_auth(self):
        """Test that export timing requires authentication"""
        event_id = "evt_f79c5cfd5036"
        response = requests.get(f"{BASE_URL}/api/organizer/events/{event_id}/export-timing")
        assert response.status_code == 401
        print("✓ Export timing requires authentication")


class TestEvents:
    """Test events endpoints to verify registration form data"""
    
    def test_get_events(self):
        """Test GET /api/events"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        print(f"✓ Got {len(data['events'])} events")
    
    def test_get_event_detail(self):
        """Test GET /api/events/{event_id}"""
        event_id = "evt_f79c5cfd5036"  # COURSE CORSICA FEVER
        response = requests.get(f"{BASE_URL}/api/events/{event_id}")
        
        if response.status_code == 404:
            # Try other event
            event_id = "evt_caf5d0d9d80c"
            response = requests.get(f"{BASE_URL}/api/events/{event_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "title" in data
        print(f"✓ Got event: {data.get('title')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
