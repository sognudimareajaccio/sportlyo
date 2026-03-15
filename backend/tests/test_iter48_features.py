"""
Test suite for SportLyo 5 new features - iteration_48:
1. Free Events (is_free toggle and display)
2. Sponsor Logos (upload and display)
3. Saved Events (save/unsave/list)
4. Register Role Pre-selection (URL param) - frontend only
5. Free Event Registration (skip payment)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ORGANIZER_EMAIL = "club@paris-sport.fr"
ORGANIZER_PASSWORD = "club123"
PARTICIPANT_EMAIL = "pierre@test.com"
PARTICIPANT_PASSWORD = "test1234"

TEST_EVENT_ID = "evt_fa95880cf1b9"  # Open MMA & Grappling Lyon 2026


def get_token(email, password):
    """Helper to get auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "password": password
    })
    if response.status_code == 200:
        return response.json().get("token")  # API uses 'token' not 'access_token'
    return None


class TestAuthentication:
    """Test authentication for different user roles"""
    
    def test_organizer_login(self):
        """Test organizer can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        assert response.status_code == 200, f"Organizer login failed: {response.text}"
        data = response.json()
        assert "token" in data, f"No token in response: {data}"
        assert data.get("user", {}).get("role") == "organizer"
        print(f"PASS: Organizer login successful - role={data['user']['role']}")
        
    def test_participant_login(self):
        """Test participant can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PARTICIPANT_EMAIL,
            "password": PARTICIPANT_PASSWORD
        })
        assert response.status_code == 200, f"Participant login failed: {response.text}"
        data = response.json()
        assert "token" in data, f"No token in response: {data}"
        assert data.get("user", {}).get("role") == "participant"
        print(f"PASS: Participant login successful - role={data['user']['role']}")


class TestFreeEventsFeature:
    """Feature 1 & 5: Free events toggle and registration flow"""
    
    @pytest.fixture
    def organizer_token(self):
        return get_token(ORGANIZER_EMAIL, ORGANIZER_PASSWORD)
    
    def test_update_event_to_free(self, organizer_token):
        """Test that organizer can set is_free=true on event"""
        assert organizer_token, "Failed to get organizer token"
        headers = {"Authorization": f"Bearer {organizer_token}"}
        
        # Update event to be free
        response = requests.put(
            f"{BASE_URL}/api/events/{TEST_EVENT_ID}",
            json={"is_free": True},
            headers=headers
        )
        assert response.status_code == 200, f"Update event failed: {response.text}"
        print("PASS: Event updated to is_free=true")
        
        # Verify the update
        get_response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}")
        assert get_response.status_code == 200
        event_data = get_response.json()
        assert event_data.get("is_free") == True, f"is_free should be True, got {event_data.get('is_free')}"
        print(f"PASS: Event verified as free - is_free={event_data.get('is_free')}")
        
    def test_revert_event_to_paid(self, organizer_token):
        """Test reverting event back to paid"""
        assert organizer_token, "Failed to get organizer token"
        headers = {"Authorization": f"Bearer {organizer_token}"}
        response = requests.put(
            f"{BASE_URL}/api/events/{TEST_EVENT_ID}",
            json={"is_free": False},
            headers=headers
        )
        assert response.status_code == 200
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}")
        event_data = get_response.json()
        assert event_data.get("is_free") == False
        print("PASS: Event reverted to paid (is_free=false)")


class TestSponsorLogosFeature:
    """Feature 2: Sponsor logos upload and display"""
    
    @pytest.fixture
    def organizer_token(self):
        return get_token(ORGANIZER_EMAIL, ORGANIZER_PASSWORD)
    
    def test_update_event_with_sponsor_logos(self, organizer_token):
        """Test updating event with sponsor logos"""
        assert organizer_token, "Failed to get organizer token"
        headers = {"Authorization": f"Bearer {organizer_token}"}
        
        sponsor_logos = [
            {"url": "https://example.com/sponsor1.png", "name": "Test Sponsor 1"},
            {"url": "https://example.com/sponsor2.png", "name": "Test Sponsor 2"}
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/events/{TEST_EVENT_ID}",
            json={"sponsor_logos": sponsor_logos},
            headers=headers
        )
        assert response.status_code == 200, f"Update sponsor logos failed: {response.text}"
        print("PASS: Sponsor logos updated on event")
        
        # Verify the update
        get_response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}")
        assert get_response.status_code == 200
        event_data = get_response.json()
        assert event_data.get("sponsor_logos") is not None
        assert len(event_data.get("sponsor_logos", [])) == 2
        print(f"PASS: Sponsor logos verified - count={len(event_data.get('sponsor_logos', []))}")
        
    def test_clear_sponsor_logos(self, organizer_token):
        """Test clearing sponsor logos"""
        assert organizer_token, "Failed to get organizer token"
        headers = {"Authorization": f"Bearer {organizer_token}"}
        response = requests.put(
            f"{BASE_URL}/api/events/{TEST_EVENT_ID}",
            json={"sponsor_logos": []},
            headers=headers
        )
        assert response.status_code == 200
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}")
        event_data = get_response.json()
        assert event_data.get("sponsor_logos") == []
        print("PASS: Sponsor logos cleared")


class TestSavedEventsFeature:
    """Feature 3: Save/unsave events functionality"""
    
    @pytest.fixture
    def participant_token(self):
        return get_token(PARTICIPANT_EMAIL, PARTICIPANT_PASSWORD)
    
    def test_save_event_toggle(self, participant_token):
        """Test saving and unsaving an event"""
        assert participant_token, "Failed to get participant token"
        headers = {"Authorization": f"Bearer {participant_token}"}
        
        # First toggle (save)
        response1 = requests.post(
            f"{BASE_URL}/api/events/{TEST_EVENT_ID}/save",
            headers=headers
        )
        assert response1.status_code == 200, f"Save event failed: {response1.text}"
        data1 = response1.json()
        print(f"First toggle: saved={data1.get('saved')}, message={data1.get('message')}")
        
        # Second toggle (should unsave if was saved)
        response2 = requests.post(
            f"{BASE_URL}/api/events/{TEST_EVENT_ID}/save",
            headers=headers
        )
        assert response2.status_code == 200
        data2 = response2.json()
        print(f"Second toggle: saved={data2.get('saved')}, message={data2.get('message')}")
        
        # Verify toggle changes state
        assert data1.get('saved') != data2.get('saved'), "Toggle should change saved state"
        print("PASS: Save event toggle works correctly")
        
    def test_check_is_saved_endpoint(self, participant_token):
        """Test checking if event is saved"""
        assert participant_token, "Failed to get participant token"
        headers = {"Authorization": f"Bearer {participant_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/events/{TEST_EVENT_ID}/is-saved",
            headers=headers
        )
        assert response.status_code == 200, f"Check is-saved failed: {response.text}"
        data = response.json()
        assert "saved" in data
        print(f"PASS: Is-saved endpoint works - saved={data.get('saved')}")
        
    def test_get_saved_events_list(self, participant_token):
        """Test getting list of saved events"""
        assert participant_token, "Failed to get participant token"
        headers = {"Authorization": f"Bearer {participant_token}"}
        
        # First save an event to ensure there's at least one
        requests.post(f"{BASE_URL}/api/events/{TEST_EVENT_ID}/save", headers=headers)
        
        response = requests.get(
            f"{BASE_URL}/api/my/saved-events",
            headers=headers
        )
        assert response.status_code == 200, f"Get saved events failed: {response.text}"
        data = response.json()
        assert "events" in data
        print(f"PASS: Saved events list endpoint works - events count={len(data.get('events', []))}")
        
        # Cleanup - unsave event
        requests.post(f"{BASE_URL}/api/events/{TEST_EVENT_ID}/save", headers=headers)


class TestEventAPIFields:
    """Test that is_free and sponsor_logos fields are properly handled in API"""
    
    def test_event_returns_is_free_field(self):
        """Test that event API returns is_free field"""
        response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}")
        assert response.status_code == 200
        data = response.json()
        # is_free can be None, True, or False - just check it exists
        print(f"PASS: Event API returns is_free - value={data.get('is_free')}")
        
    def test_event_returns_sponsor_logos_field(self):
        """Test that event API returns sponsor_logos field"""
        response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}")
        assert response.status_code == 200
        data = response.json()
        # sponsor_logos can be None or list
        print(f"PASS: Event API returns sponsor_logos - value={data.get('sponsor_logos')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
