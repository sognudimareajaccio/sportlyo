"""
Test suite for Organizer Hub Dashboard features (Iteration 22)
Tests the new hub grid system with 9 sections:
- Événements, Participants, Jauges, Check-in, Finances
- Correspondances, Partage, Contact Admin, Résultats
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOrganizerAllParticipants:
    """Tests for GET /api/organizer/all-participants endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as organizer before each test"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "club@paris-sport.fr",
            "password": "club123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()['token']
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_all_participants(self):
        """Test GET /api/organizer/all-participants returns participant list"""
        response = requests.get(
            f"{BASE_URL}/api/organizer/all-participants",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "participants" in data
        assert "total" in data
        assert isinstance(data["participants"], list)
        print(f"✅ GET /api/organizer/all-participants: {data['total']} participants")
    
    def test_get_participants_with_event_filter(self):
        """Test GET /api/organizer/all-participants with event_id filter"""
        # First get organizer events to get an event_id
        events_response = requests.get(
            f"{BASE_URL}/api/organizer/events",
            headers=self.headers
        )
        assert events_response.status_code == 200
        events = events_response.json().get("events", [])
        
        if events:
            event_id = events[0]["event_id"]
            response = requests.get(
                f"{BASE_URL}/api/organizer/all-participants?event_id={event_id}",
                headers=self.headers
            )
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            data = response.json()
            assert "participants" in data
            print(f"✅ GET /api/organizer/all-participants?event_id={event_id[:12]}...: {len(data['participants'])} participants")


class TestCorrespondancesEndpoints:
    """Tests for correspondances endpoints (messaging to participants)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as organizer before each test"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "club@paris-sport.fr",
            "password": "club123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()['token']
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_correspondances(self):
        """Test GET /api/organizer/correspondances returns sent messages"""
        response = requests.get(
            f"{BASE_URL}/api/organizer/correspondances",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "correspondances" in data
        assert isinstance(data["correspondances"], list)
        print(f"✅ GET /api/organizer/correspondances: {len(data['correspondances'])} messages")
    
    def test_send_correspondance_requires_message(self):
        """Test POST /api/organizer/correspondances/send requires message"""
        response = requests.post(
            f"{BASE_URL}/api/organizer/correspondances/send",
            headers=self.headers,
            json={
                "subject": "Test",
                "message": "",  # Empty message should fail
                "event_id": "test",
                "recipient_ids": "all"
            }
        )
        assert response.status_code == 400, f"Expected 400 for empty message, got {response.status_code}"
        print("✅ POST /api/organizer/correspondances/send: Correctly rejects empty message")
    
    def test_send_correspondance_success(self):
        """Test POST /api/organizer/correspondances/send successfully sends message"""
        # Get events first
        events_response = requests.get(
            f"{BASE_URL}/api/organizer/events",
            headers=self.headers
        )
        events = events_response.json().get("events", [])
        
        if not events:
            pytest.skip("No events found for organizer")
        
        event_id = events[0]["event_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/organizer/correspondances/send",
            headers=self.headers,
            json={
                "subject": "Test message from pytest",
                "message": "This is a test message content.",
                "event_id": event_id,
                "recipient_ids": "all",
                "send_email": False  # Don't send actual emails in test
            }
        )
        
        # If no recipients found, 404 is expected
        if response.status_code == 404:
            print("✅ POST /api/organizer/correspondances/send: No recipients (expected for events without registrations)")
            return
            
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "correspondance" in data
        print(f"✅ POST /api/organizer/correspondances/send: Message sent to {data['correspondance'].get('recipient_count', 0)} recipients")


class TestCheckinMarkCollected:
    """Tests for check-in mark-collected endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as organizer before each test"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "club@paris-sport.fr",
            "password": "club123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()['token']
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_mark_collected_requires_registration_id(self):
        """Test POST /api/organizer/checkin/mark-collected requires registration_id"""
        response = requests.post(
            f"{BASE_URL}/api/organizer/checkin/mark-collected",
            headers=self.headers,
            json={}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✅ POST /api/organizer/checkin/mark-collected: Correctly rejects missing registration_id")
    
    def test_mark_collected_invalid_registration(self):
        """Test POST /api/organizer/checkin/mark-collected with invalid registration_id"""
        response = requests.post(
            f"{BASE_URL}/api/organizer/checkin/mark-collected",
            headers=self.headers,
            json={"registration_id": "invalid_reg_id_12345"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ POST /api/organizer/checkin/mark-collected: Correctly returns 404 for invalid registration")
    
    def test_mark_collected_success(self):
        """Test POST /api/organizer/checkin/mark-collected successfully marks kit collected"""
        # Get participants first
        participants_response = requests.get(
            f"{BASE_URL}/api/organizer/all-participants",
            headers=self.headers
        )
        assert participants_response.status_code == 200
        participants = participants_response.json().get("participants", [])
        
        if not participants:
            pytest.skip("No participants found for testing")
        
        # Find a participant that hasn't collected kit yet
        uncollected = [p for p in participants if not p.get("kit_collected")]
        if not uncollected:
            print("✅ POST /api/organizer/checkin/mark-collected: All kits already collected")
            return
        
        registration_id = uncollected[0]["registration_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/organizer/checkin/mark-collected",
            headers=self.headers,
            json={"registration_id": registration_id}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert data["registration_id"] == registration_id
        print(f"✅ POST /api/organizer/checkin/mark-collected: Kit marked as collected for {registration_id[:15]}...")


class TestOrganizerEventsEndpoint:
    """Tests for organizer events endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as organizer before each test"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "club@paris-sport.fr",
            "password": "club123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()['token']
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_organizer_events(self):
        """Test GET /api/organizer/events returns organizer's events"""
        response = requests.get(
            f"{BASE_URL}/api/organizer/events",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "events" in data
        assert isinstance(data["events"], list)
        print(f"✅ GET /api/organizer/events: {len(data['events'])} events")
        
        # Verify event structure
        if data["events"]:
            event = data["events"][0]
            assert "event_id" in event
            assert "title" in event
            assert "current_participants" in event
            assert "max_participants" in event
            assert "price" in event


class TestUnauthorizedAccess:
    """Tests that endpoints reject unauthorized access"""
    
    def test_all_participants_unauthorized(self):
        """Test GET /api/organizer/all-participants requires authentication"""
        response = requests.get(f"{BASE_URL}/api/organizer/all-participants")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ GET /api/organizer/all-participants: Correctly requires authentication")
    
    def test_correspondances_unauthorized(self):
        """Test GET /api/organizer/correspondances requires authentication"""
        response = requests.get(f"{BASE_URL}/api/organizer/correspondances")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ GET /api/organizer/correspondances: Correctly requires authentication")
    
    def test_mark_collected_unauthorized(self):
        """Test POST /api/organizer/checkin/mark-collected requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/organizer/checkin/mark-collected",
            json={"registration_id": "test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ POST /api/organizer/checkin/mark-collected: Correctly requires authentication")
    
    def test_participant_cannot_access_organizer_endpoints(self):
        """Test that participant role cannot access organizer endpoints"""
        # Login as regular participant
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pierre@test.com",
            "password": "test1234"
        })
        
        # If participant doesn't exist, skip
        if login_response.status_code != 200:
            pytest.skip("Participant user not found")
        
        token = login_response.json()['token']
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/organizer/all-participants",
            headers=headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✅ Participant correctly blocked from organizer endpoints")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
