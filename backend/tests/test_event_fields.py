"""
Test new event fields: route_url, exact_address, regulations
Test event detail page data and races with counters
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sportlyo-preview.preview.emergentagent.com')

class TestEventNewFields:
    """Test event creation and retrieval with new fields"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login as organizer and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "club@paris-sport.fr",
            "password": "club123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Return headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_test_event(self):
        """Test GET existing event with new fields (evt_db0c7b851cb9)"""
        response = requests.get(f"{BASE_URL}/api/events/evt_db0c7b851cb9")
        assert response.status_code == 200, f"Failed to get event: {response.text}"
        
        event = response.json()
        
        # Verify new fields exist and have correct values
        assert "route_url" in event, "Event should have route_url field"
        assert "exact_address" in event, "Event should have exact_address field"
        assert "regulations" in event, "Event should have regulations field"
        assert "organizer_name" in event, "Event should have organizer_name field"
        assert "races" in event, "Event should have races field"
        
        print(f"Event title: {event['title']}")
        print(f"Route URL: {event.get('route_url')}")
        print(f"Exact Address: {event.get('exact_address')}")
        print(f"Regulations length: {len(event.get('regulations', '')) if event.get('regulations') else 0} chars")
        print(f"Organizer Name: {event.get('organizer_name')}")
        print(f"Number of races: {len(event.get('races', []))}")
    
    def test_event_has_route_url(self):
        """Verify route_url is OpenRunner URL"""
        response = requests.get(f"{BASE_URL}/api/events/evt_db0c7b851cb9")
        assert response.status_code == 200
        
        event = response.json()
        route_url = event.get("route_url")
        
        assert route_url is not None, "route_url should not be None"
        assert "openrunner.com" in route_url.lower(), f"route_url should be OpenRunner link: {route_url}"
        print(f"Route URL verified: {route_url}")
    
    def test_event_has_exact_address(self):
        """Verify exact_address contains Chamonix"""
        response = requests.get(f"{BASE_URL}/api/events/evt_db0c7b851cb9")
        assert response.status_code == 200
        
        event = response.json()
        exact_address = event.get("exact_address")
        
        assert exact_address is not None, "exact_address should not be None"
        assert "Chamonix" in exact_address, f"exact_address should contain Chamonix: {exact_address}"
        print(f"Exact Address verified: {exact_address}")
    
    def test_event_has_regulations(self):
        """Verify regulations exist and have content"""
        response = requests.get(f"{BASE_URL}/api/events/evt_db0c7b851cb9")
        assert response.status_code == 200
        
        event = response.json()
        regulations = event.get("regulations")
        
        assert regulations is not None, "regulations should not be None"
        assert len(regulations) > 50, f"regulations should have substantial content: {len(regulations)} chars"
        print(f"Regulations verified: {len(regulations)} characters")
    
    def test_event_has_organizer_name(self):
        """Verify organizer_name is set"""
        response = requests.get(f"{BASE_URL}/api/events/evt_db0c7b851cb9")
        assert response.status_code == 200
        
        event = response.json()
        organizer_name = event.get("organizer_name")
        
        assert organizer_name is not None, "organizer_name should not be None"
        assert len(organizer_name) > 0, "organizer_name should not be empty"
        print(f"Organizer Name verified: {organizer_name}")
    
    def test_event_has_races_with_counters(self):
        """Verify races have participant counters"""
        response = requests.get(f"{BASE_URL}/api/events/evt_db0c7b851cb9")
        assert response.status_code == 200
        
        event = response.json()
        races = event.get("races", [])
        
        assert len(races) >= 3, f"Event should have at least 3 races, found {len(races)}"
        
        for race in races:
            assert "name" in race, "Race should have name"
            assert "price" in race, "Race should have price"
            assert "max_participants" in race, "Race should have max_participants"
            assert "current_participants" in race or race.get("current_participants", 0) >= 0, "Race should have current_participants"
            
            print(f"Race: {race['name']} - {race.get('current_participants', 0)}/{race['max_participants']} - {race['price']}€")
    
    def test_create_event_with_new_fields(self, auth_headers):
        """Test creating new event with route_url, exact_address, regulations"""
        unique_id = uuid.uuid4().hex[:8]
        
        event_data = {
            "title": f"TEST_Event_NewFields_{unique_id}",
            "description": "Test event with new fields",
            "sport_type": "running",
            "location": "Paris, France",
            "date": "2026-06-15T09:00:00Z",
            "max_participants": 100,
            "price": 50,
            "route_url": "https://www.openrunner.com/route/99999999",
            "exact_address": "Place de la Concorde, 75008 Paris",
            "regulations": "Test regulations:\n1. Rule one\n2. Rule two\n3. Rule three",
            "races": [
                {"name": "10km", "price": 30, "max_participants": 50},
                {"name": "21km", "price": 50, "max_participants": 50}
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create event: {response.text}"
        
        created_event = response.json()
        
        # Verify new fields were saved
        assert created_event.get("route_url") == event_data["route_url"], "route_url not saved correctly"
        assert created_event.get("exact_address") == event_data["exact_address"], "exact_address not saved correctly"
        assert created_event.get("regulations") == event_data["regulations"], "regulations not saved correctly"
        assert len(created_event.get("races", [])) == 2, "races not saved correctly"
        
        print(f"Created event: {created_event['event_id']}")
        print(f"Route URL saved: {created_event.get('route_url')}")
        print(f"Exact Address saved: {created_event.get('exact_address')}")
        print(f"Regulations saved: {len(created_event.get('regulations', ''))} chars")
        
        # Clean up - delete the test event
        event_id = created_event["event_id"]
        delete_response = requests.delete(f"{BASE_URL}/api/events/{event_id}", headers=auth_headers)
        assert delete_response.status_code == 200, f"Failed to delete test event: {delete_response.text}"
        print(f"Cleaned up test event: {event_id}")
    
    def test_update_event_with_new_fields(self, auth_headers):
        """Test updating event with new fields"""
        # First create an event
        unique_id = uuid.uuid4().hex[:8]
        
        event_data = {
            "title": f"TEST_Update_NewFields_{unique_id}",
            "description": "Test event for update",
            "sport_type": "cycling",
            "location": "Lyon, France",
            "date": "2026-07-20T08:00:00Z",
            "max_participants": 200,
            "price": 75
        }
        
        create_response = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=auth_headers)
        assert create_response.status_code == 200, f"Failed to create event: {create_response.text}"
        
        event_id = create_response.json()["event_id"]
        
        # Update with new fields
        update_data = {
            "route_url": "https://www.openrunner.com/route/88888888",
            "exact_address": "Place Bellecour, 69002 Lyon",
            "regulations": "Updated regulations for cycling event"
        }
        
        update_response = requests.put(f"{BASE_URL}/api/events/{event_id}", json=update_data, headers=auth_headers)
        assert update_response.status_code == 200, f"Failed to update event: {update_response.text}"
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_response.status_code == 200
        
        updated_event = get_response.json()
        assert updated_event.get("route_url") == update_data["route_url"], "route_url not updated"
        assert updated_event.get("exact_address") == update_data["exact_address"], "exact_address not updated"
        assert updated_event.get("regulations") == update_data["regulations"], "regulations not updated"
        
        print(f"Successfully updated event {event_id} with new fields")
        
        # Clean up
        delete_response = requests.delete(f"{BASE_URL}/api/events/{event_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        print(f"Cleaned up test event: {event_id}")


class TestEventDetailAPI:
    """Test event detail API returns all required data for the detail page"""
    
    def test_event_detail_has_all_sections(self):
        """Verify event detail API returns all data needed for UI sections"""
        response = requests.get(f"{BASE_URL}/api/events/evt_db0c7b851cb9")
        assert response.status_code == 200
        
        event = response.json()
        
        # Required fields for event detail page
        required_fields = [
            "event_id", "title", "description", "sport_type", "location", "date",
            "max_participants", "current_participants", "price", "organizer_name"
        ]
        
        for field in required_fields:
            assert field in event, f"Missing required field: {field}"
            print(f"✓ {field}: {event[field]}")
        
        # New fields for enhanced detail page
        new_fields = ["route_url", "exact_address", "regulations", "races"]
        
        for field in new_fields:
            assert field in event, f"Missing new field: {field}"
            value = event[field]
            if isinstance(value, list):
                print(f"✓ {field}: {len(value)} items")
            elif isinstance(value, str):
                print(f"✓ {field}: {len(value)} chars")
            else:
                print(f"✓ {field}: {value}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
