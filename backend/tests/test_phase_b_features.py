"""
Phase B Feature Tests - SportLyo
Tests for:
1. ComingSoonPage guard removal (app loads directly)
2. Events page showing only published events
3. Emergency contact required for registration
4. GET /api/participant/new-events endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPhaseB:
    """Phase B feature tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    # ============== Test 1: Events API returns only published events ==============
    
    def test_events_api_returns_only_published(self):
        """GET /api/events should only return published=true events"""
        response = self.session.get(f"{BASE_URL}/api/events?limit=50")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "events" in data, "Response should have 'events' key"
        events = data["events"]
        
        # Check all returned events are published
        for event in events:
            # If 'published' field exists, it should be True
            if "published" in event:
                assert event["published"] == True, f"Event {event.get('event_id')} should be published"
        
        print(f"✅ GET /api/events returned {len(events)} published events")
    
    # ============== Test 2: Login as participant ==============
    
    def test_participant_login(self):
        """Login as participant pierre@test.com"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pierre@test.com",
            "password": "test1234"
        })
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should have token"
        assert "user" in data, "Response should have user"
        
        self.token = data["token"]
        print(f"✅ Participant login successful: {data['user']['name']}")
        return data
    
    # ============== Test 3: GET /api/participant/new-events ==============
    
    def test_new_events_endpoint(self):
        """GET /api/participant/new-events returns recently published events"""
        # First login
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pierre@test.com",
            "password": "test1234"
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["token"]
        
        # Call new events endpoint
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/participant/new-events", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "events" in data, "Response should have 'events' key"
        
        events = data["events"]
        print(f"✅ GET /api/participant/new-events returned {len(events)} events")
        
        # Validate event structure if events exist
        if len(events) > 0:
            event = events[0]
            assert "event_id" in event, "Event should have event_id"
            assert "title" in event, "Event should have title"
            print(f"   First event: {event.get('title')}")
    
    # ============== Test 4: Registration without emergency contact fails ==============
    
    def test_registration_requires_emergency_contact(self):
        """POST /api/registrations without emergency_contact should return 400"""
        # First login
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pierre@test.com",
            "password": "test1234"
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["token"]
        
        # Get a published event to try registration
        events_resp = self.session.get(f"{BASE_URL}/api/events?limit=1")
        assert events_resp.status_code == 200
        events = events_resp.json()["events"]
        
        if len(events) == 0:
            pytest.skip("No events available for registration test")
        
        event = events[0]
        event_id = event["event_id"]
        
        # Try to register WITHOUT emergency contact
        headers = {"Authorization": f"Bearer {token}"}
        reg_data = {
            "event_id": event_id,
            "first_name": "Test",
            "last_name": "User",
            "gender": "M",
            "email": "pierre@test.com",
            "phone": "0612345678",
            # MISSING: emergency_contact and emergency_phone
        }
        
        response = self.session.post(f"{BASE_URL}/api/registrations", json=reg_data, headers=headers)
        
        # Should fail with 400
        assert response.status_code == 400, f"Expected 400 without emergency contact, got {response.status_code}"
        
        data = response.json()
        detail = data.get("detail", "")
        assert "urgence" in detail.lower() or "emergency" in detail.lower(), \
            f"Error message should mention emergency contact: {detail}"
        
        print(f"✅ Registration correctly rejected without emergency contact: {detail}")
    
    def test_registration_with_emergency_contact_partial(self):
        """POST /api/registrations with only emergency_contact but no phone should fail"""
        # First login
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pierre@test.com",
            "password": "test1234"
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["token"]
        
        # Get a published event to try registration
        events_resp = self.session.get(f"{BASE_URL}/api/events?limit=1")
        assert events_resp.status_code == 200
        events = events_resp.json()["events"]
        
        if len(events) == 0:
            pytest.skip("No events available for registration test")
        
        event = events[0]
        event_id = event["event_id"]
        
        # Try to register with only emergency_contact (no phone)
        headers = {"Authorization": f"Bearer {token}"}
        reg_data = {
            "event_id": event_id,
            "first_name": "Test",
            "last_name": "User",
            "gender": "M",
            "email": "pierre@test.com",
            "phone": "0612345678",
            "emergency_contact": "John Doe",
            # MISSING: emergency_phone
        }
        
        response = self.session.post(f"{BASE_URL}/api/registrations", json=reg_data, headers=headers)
        
        # Should fail with 400
        assert response.status_code == 400, f"Expected 400 without emergency phone, got {response.status_code}"
        print(f"✅ Registration correctly rejected without emergency phone")
    
    # ============== Test 5: Categories API ==============
    
    def test_categories_api(self):
        """GET /api/categories returns sport categories"""
        response = self.session.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "categories" in data, "Response should have 'categories' key"
        
        categories = data["categories"]
        assert len(categories) > 0, "Should have some categories"
        
        print(f"✅ GET /api/categories returned {len(categories)} categories")
        for cat in categories[:5]:
            print(f"   - {cat.get('id')}: {cat.get('name')}")


class TestEventsPageFiltering:
    """Test events page filtering capabilities"""
    
    def test_events_filter_by_sport_type(self):
        """Test filtering events by sport type"""
        session = requests.Session()
        
        # Get all events first
        response = session.get(f"{BASE_URL}/api/events?limit=50")
        assert response.status_code == 200
        all_events = response.json()["events"]
        
        # Get cycling events
        response = session.get(f"{BASE_URL}/api/events?sport_type=cycling&limit=50")
        assert response.status_code == 200
        cycling_events = response.json()["events"]
        
        # All cycling events should have sport_type = cycling
        for event in cycling_events:
            assert event.get("sport_type") == "cycling", \
                f"Event {event.get('event_id')} should be cycling type"
        
        print(f"✅ Filter by sport_type works: {len(cycling_events)} cycling events")
    
    def test_events_search(self):
        """Test events search functionality"""
        session = requests.Session()
        
        # Search for events with a common word
        response = session.get(f"{BASE_URL}/api/events?search=trail&limit=50")
        assert response.status_code == 200
        
        data = response.json()
        events = data["events"]
        
        print(f"✅ Search for 'trail' returned {len(events)} events")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
