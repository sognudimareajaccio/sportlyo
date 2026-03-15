"""
Test provided_items field for participant dotation functionality
Tests POST, PUT, GET for events with provided_items
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ORGANIZER_EMAIL = "club@paris-sport.fr"
ORGANIZER_PASSWORD = "club123"

@pytest.fixture(scope="module")
def api_session():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def organizer_token(api_session):
    """Get organizer authentication token"""
    response = api_session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ORGANIZER_EMAIL,
        "password": ORGANIZER_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")

@pytest.fixture(scope="module")
def auth_headers(organizer_token):
    """Authorization headers"""
    return {"Authorization": f"Bearer {organizer_token}"}


class TestProvidedItemsCreate:
    """Test POST /api/events with provided_items field"""
    
    def test_create_event_with_provided_items(self, api_session, auth_headers):
        """Create an event with provided_items array"""
        unique_id = uuid.uuid4().hex[:8]
        event_data = {
            "title": f"TEST_Event_ProvidedItems_{unique_id}",
            "description": "Test event for provided_items functionality",
            "sport_type": "running",
            "location": "Paris",
            "date": "2026-06-15T10:00:00Z",
            "max_participants": 100,
            "price": 25,
            "provided_items": ["tshirt", "medal", "bag", "food"],
            "published": False
        }
        
        response = api_session.post(
            f"{BASE_URL}/api/events",
            json=event_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create event failed: {response.text}"
        
        created_event = response.json()
        assert "event_id" in created_event
        assert "provided_items" in created_event
        assert created_event["provided_items"] == ["tshirt", "medal", "bag", "food"]
        
        print(f"✓ Created event with provided_items: {created_event['provided_items']}")
        return created_event["event_id"]
    
    def test_create_event_with_empty_provided_items(self, api_session, auth_headers):
        """Create event with empty provided_items (no dotation)"""
        unique_id = uuid.uuid4().hex[:8]
        event_data = {
            "title": f"TEST_Event_NoItems_{unique_id}",
            "description": "Test event without provided items",
            "sport_type": "cycling",
            "location": "Lyon",
            "date": "2026-07-20T09:00:00Z",
            "max_participants": 50,
            "price": 30,
            "provided_items": [],
            "published": False
        }
        
        response = api_session.post(
            f"{BASE_URL}/api/events",
            json=event_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create event failed: {response.text}"
        
        created_event = response.json()
        assert created_event["provided_items"] == []
        print(f"✓ Created event with empty provided_items")
    
    def test_create_event_with_custom_items(self, api_session, auth_headers):
        """Create event with custom provided items"""
        unique_id = uuid.uuid4().hex[:8]
        event_data = {
            "title": f"TEST_Event_CustomItems_{unique_id}",
            "description": "Test event with custom items",
            "sport_type": "triathlon",
            "location": "Marseille",
            "date": "2026-08-25T08:00:00Z",
            "max_participants": 200,
            "price": 50,
            "provided_items": ["tshirt", "medal", "Casquette personnalisée", "Kit nutrition"],
            "published": False
        }
        
        response = api_session.post(
            f"{BASE_URL}/api/events",
            json=event_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create event failed: {response.text}"
        
        created_event = response.json()
        assert "Casquette personnalisée" in created_event["provided_items"]
        assert "Kit nutrition" in created_event["provided_items"]
        print(f"✓ Created event with custom items: {created_event['provided_items']}")


class TestProvidedItemsGet:
    """Test GET /api/events/{event_id} returns provided_items"""
    
    def test_get_event_returns_provided_items(self, api_session, auth_headers):
        """Create and then GET event to verify provided_items is returned"""
        unique_id = uuid.uuid4().hex[:8]
        event_data = {
            "title": f"TEST_Event_GetItems_{unique_id}",
            "description": "Test event to GET provided items",
            "sport_type": "running",
            "location": "Nice",
            "date": "2026-09-10T10:00:00Z",
            "max_participants": 75,
            "price": 35,
            "provided_items": ["tshirt", "medal", "bottle", "photo"],
            "published": False
        }
        
        # Create
        create_response = api_session.post(
            f"{BASE_URL}/api/events",
            json=event_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        event_id = create_response.json()["event_id"]
        
        # GET
        get_response = api_session.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_response.status_code == 200, f"GET event failed: {get_response.text}"
        
        event = get_response.json()
        assert "provided_items" in event
        assert event["provided_items"] == ["tshirt", "medal", "bottle", "photo"]
        print(f"✓ GET event returned provided_items: {event['provided_items']}")


class TestProvidedItemsUpdate:
    """Test PUT /api/events/{event_id} with provided_items"""
    
    def test_update_event_provided_items(self, api_session, auth_headers):
        """Update event's provided_items array"""
        unique_id = uuid.uuid4().hex[:8]
        
        # Create event first
        event_data = {
            "title": f"TEST_Event_UpdateItems_{unique_id}",
            "description": "Test event to update provided items",
            "sport_type": "running",
            "location": "Bordeaux",
            "date": "2026-10-15T09:00:00Z",
            "max_participants": 100,
            "price": 40,
            "provided_items": ["tshirt"],
            "published": False
        }
        
        create_response = api_session.post(
            f"{BASE_URL}/api/events",
            json=event_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        event_id = create_response.json()["event_id"]
        
        # Update provided_items
        update_data = {
            "provided_items": ["tshirt", "medal", "bag", "cap", "towel"]
        }
        
        update_response = api_session.put(
            f"{BASE_URL}/api/events/{event_id}",
            json=update_data,
            headers=auth_headers
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify update via GET
        get_response = api_session.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_response.status_code == 200
        
        updated_event = get_response.json()
        assert updated_event["provided_items"] == ["tshirt", "medal", "bag", "cap", "towel"]
        print(f"✓ Updated provided_items to: {updated_event['provided_items']}")
    
    def test_update_event_remove_items(self, api_session, auth_headers):
        """Update event to remove provided_items"""
        unique_id = uuid.uuid4().hex[:8]
        
        # Create event with items
        event_data = {
            "title": f"TEST_Event_RemoveItems_{unique_id}",
            "description": "Test event to remove provided items",
            "sport_type": "cycling",
            "location": "Toulouse",
            "date": "2026-11-20T08:00:00Z",
            "max_participants": 50,
            "price": 45,
            "provided_items": ["tshirt", "medal", "bag"],
            "published": False
        }
        
        create_response = api_session.post(
            f"{BASE_URL}/api/events",
            json=event_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        event_id = create_response.json()["event_id"]
        
        # Update to remove items (empty array)
        update_response = api_session.put(
            f"{BASE_URL}/api/events/{event_id}",
            json={"provided_items": []},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        # Verify
        get_response = api_session.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_response.status_code == 200
        assert get_response.json()["provided_items"] == []
        print("✓ Removed all provided_items successfully")


class TestProvidedItemsWithTshirt:
    """Test provides_tshirt backward compatibility"""
    
    def test_provides_tshirt_set_when_tshirt_in_items(self, api_session, auth_headers):
        """When tshirt is in provided_items, provides_tshirt should be true"""
        unique_id = uuid.uuid4().hex[:8]
        event_data = {
            "title": f"TEST_Event_TshirtCheck_{unique_id}",
            "description": "Test provides_tshirt with provided_items",
            "sport_type": "running",
            "location": "Nantes",
            "date": "2026-12-05T10:00:00Z",
            "max_participants": 100,
            "price": 30,
            "provided_items": ["tshirt", "medal"],
            "provides_tshirt": True,  # Should match having 'tshirt' in provided_items
            "published": False
        }
        
        response = api_session.post(
            f"{BASE_URL}/api/events",
            json=event_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        created = response.json()
        assert created["provides_tshirt"] == True
        assert "tshirt" in created["provided_items"]
        print("✓ provides_tshirt=True when tshirt in provided_items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
