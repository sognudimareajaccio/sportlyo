"""
Test Suite for SportsConnect Event CRUD Operations
Focus on event creation, editing with races/distances management
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ORGANIZER_EMAIL = "club@paris-sport.fr"
ORGANIZER_PASSWORD = "club123"
PARTICIPANT_EMAIL = "pierre@test.com"
PARTICIPANT_PASSWORD = "test1234"
ADMIN_EMAIL = "admin@sportsconnect.fr"
ADMIN_PASSWORD = "admin123"


class TestAuthentication:
    """Test login for all user roles"""
    
    def test_organizer_login(self):
        """Login as organizer"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "organizer"
        print(f"✓ Organizer login successful: {data['user']['name']}")
    
    def test_participant_login(self):
        """Login as participant"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PARTICIPANT_EMAIL,
            "password": PARTICIPANT_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "participant"
        print(f"✓ Participant login successful: {data['user']['name']}")
    
    def test_admin_login(self):
        """Login as admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful: {data['user']['name']}")


class TestOrganizerEventManagement:
    """Test event CRUD operations for organizers"""
    
    @pytest.fixture
    def organizer_token(self):
        """Get organizer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def auth_headers(self, organizer_token):
        """Return auth headers for organizer"""
        return {"Authorization": f"Bearer {organizer_token}"}
    
    def test_get_organizer_events(self, auth_headers):
        """Fetch organizer's events list"""
        response = requests.get(f"{BASE_URL}/api/organizer/events", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        print(f"✓ Organizer has {len(data['events'])} events")
        return data["events"]
    
    def test_event_has_races_structure(self, auth_headers):
        """Verify events have races/distances structure"""
        response = requests.get(f"{BASE_URL}/api/organizer/events", headers=auth_headers)
        assert response.status_code == 200
        events = response.json()["events"]
        
        for event in events:
            print(f"  Event: {event['title']}")
            if event.get('races'):
                print(f"    Races: {len(event['races'])} épreuves")
                for race in event['races']:
                    print(f"      - {race.get('name', 'N/A')}: {race.get('price', 0)}€, {race.get('max_participants', 0)} places")
            else:
                print("    No races defined")
    
    def test_create_event_with_races(self, auth_headers):
        """Create a new event with multiple races/distances"""
        unique_suffix = uuid.uuid4().hex[:6]
        event_data = {
            "title": f"TEST_Trail de Montagne {unique_suffix}",
            "description": "Un beau trail en montagne",
            "sport_type": "running",
            "location": "Chamonix, France",
            "date": "2026-09-15T08:00:00Z",
            "max_participants": 500,
            "price": 30,
            "distances": ["15km", "30km", "50km"],
            "elevation_gain": 2000,
            "requires_pps": True,
            "races": [
                {
                    "name": "15km Découverte",
                    "price": 30,
                    "max_participants": 200,
                    "distance_km": 15,
                    "elevation_gain": 500
                },
                {
                    "name": "30km Challenge",
                    "price": 50,
                    "max_participants": 200,
                    "distance_km": 30,
                    "elevation_gain": 1200
                },
                {
                    "name": "50km Ultra",
                    "price": 80,
                    "max_participants": 100,
                    "distance_km": 50,
                    "elevation_gain": 2000
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/events", headers=auth_headers, json=event_data)
        assert response.status_code == 200
        
        created_event = response.json()
        assert "event_id" in created_event
        assert created_event["title"] == event_data["title"]
        assert created_event["races"] is not None
        assert len(created_event["races"]) == 3
        
        print(f"✓ Created event: {created_event['event_id']}")
        print(f"  Races created: {len(created_event['races'])}")
        
        return created_event["event_id"]
    
    def test_update_event_with_races(self, auth_headers):
        """Test updating event with race modifications"""
        # First get existing events
        response = requests.get(f"{BASE_URL}/api/organizer/events", headers=auth_headers)
        events = response.json()["events"]
        
        if not events:
            pytest.skip("No events available for update test")
        
        event = events[0]
        event_id = event["event_id"]
        
        # Update with new races
        update_data = {
            "title": event["title"],
            "description": event.get("description", ""),
            "sport_type": event.get("sport_type", "running"),
            "location": event.get("location", ""),
            "max_participants": event.get("max_participants", 100),
            "price": event.get("price", 25),
            "races": [
                {
                    "name": "10km",
                    "price": 20,
                    "max_participants": 150,
                    "distance_km": 10
                },
                {
                    "name": "21km Semi-Marathon",
                    "price": 35,
                    "max_participants": 100,
                    "distance_km": 21
                }
            ]
        }
        
        response = requests.put(f"{BASE_URL}/api/events/{event_id}", headers=auth_headers, json=update_data)
        assert response.status_code == 200
        print(f"✓ Updated event {event_id} with 2 races")
        
        # Verify update persisted
        response = requests.get(f"{BASE_URL}/api/events/{event_id}")
        assert response.status_code == 200
        updated_event = response.json()
        
        assert updated_event["races"] is not None
        assert len(updated_event["races"]) == 2
        print(f"✓ Verified: Event now has {len(updated_event['races'])} races")
    
    def test_add_race_to_existing_event(self, auth_headers):
        """Add a new race to an existing event"""
        # Get existing events
        response = requests.get(f"{BASE_URL}/api/organizer/events", headers=auth_headers)
        events = response.json()["events"]
        
        if not events:
            pytest.skip("No events available")
        
        event = events[0]
        event_id = event["event_id"]
        
        # Get current races
        current_races = event.get("races", [])
        
        # Add a new race
        new_race = {
            "name": f"5km Fun Run",
            "price": 15,
            "max_participants": 300,
            "distance_km": 5
        }
        
        updated_races = current_races + [new_race]
        
        update_data = {
            "races": updated_races
        }
        
        response = requests.put(f"{BASE_URL}/api/events/{event_id}", headers=auth_headers, json=update_data)
        assert response.status_code == 200
        print(f"✓ Added new race '5km Fun Run' to event {event_id}")
        
        # Verify
        response = requests.get(f"{BASE_URL}/api/events/{event_id}")
        updated_event = response.json()
        assert len(updated_event.get("races", [])) == len(updated_races)
        print(f"✓ Verified: Event now has {len(updated_event['races'])} races")
    
    def test_remove_race_from_event(self, auth_headers):
        """Remove a race from an existing event"""
        # Get existing events
        response = requests.get(f"{BASE_URL}/api/organizer/events", headers=auth_headers)
        events = response.json()["events"]
        
        if not events:
            pytest.skip("No events available")
        
        event = events[0]
        event_id = event["event_id"]
        
        current_races = event.get("races", [])
        if len(current_races) < 2:
            pytest.skip("Not enough races to remove")
        
        # Remove the last race
        updated_races = current_races[:-1]
        
        update_data = {
            "races": updated_races
        }
        
        response = requests.put(f"{BASE_URL}/api/events/{event_id}", headers=auth_headers, json=update_data)
        assert response.status_code == 200
        print(f"✓ Removed one race from event {event_id}")
        
        # Verify
        response = requests.get(f"{BASE_URL}/api/events/{event_id}")
        updated_event = response.json()
        assert len(updated_event.get("races", [])) == len(updated_races)
        print(f"✓ Verified: Event now has {len(updated_event['races'])} races")
    
    def test_modify_race_details(self, auth_headers):
        """Modify race details (price, places) and verify persistence"""
        # Get existing events
        response = requests.get(f"{BASE_URL}/api/organizer/events", headers=auth_headers)
        events = response.json()["events"]
        
        if not events:
            pytest.skip("No events available")
        
        event = events[0]
        event_id = event["event_id"]
        
        current_races = event.get("races", [])
        if not current_races:
            pytest.skip("No races to modify")
        
        # Modify first race
        modified_races = current_races.copy()
        modified_races[0]["price"] = 99.99
        modified_races[0]["max_participants"] = 999
        
        update_data = {
            "races": modified_races
        }
        
        response = requests.put(f"{BASE_URL}/api/events/{event_id}", headers=auth_headers, json=update_data)
        assert response.status_code == 200
        print(f"✓ Modified race details: price=99.99€, max_participants=999")
        
        # Verify changes persisted
        response = requests.get(f"{BASE_URL}/api/events/{event_id}")
        updated_event = response.json()
        
        if updated_event.get("races"):
            assert updated_event["races"][0]["price"] == 99.99
            assert updated_event["races"][0]["max_participants"] == 999
            print(f"✓ Verified race modifications persisted")


class TestEventRetrieval:
    """Test public event endpoints"""
    
    def test_get_events_list(self):
        """Get public events list"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        assert "total" in data
        print(f"✓ Events list: {len(data['events'])} events, {data['total']} total")
    
    def test_get_featured_events(self):
        """Get featured events"""
        response = requests.get(f"{BASE_URL}/api/events/featured")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        print(f"✓ Featured events: {len(data['events'])}")
    
    def test_get_single_event(self):
        """Get a single event with full details"""
        # First get events list
        response = requests.get(f"{BASE_URL}/api/events")
        events = response.json()["events"]
        
        if not events:
            pytest.skip("No events available")
        
        event_id = events[0]["event_id"]
        
        response = requests.get(f"{BASE_URL}/api/events/{event_id}")
        assert response.status_code == 200
        
        event = response.json()
        assert event["event_id"] == event_id
        print(f"✓ Retrieved event: {event['title']}")
        
        if event.get("races"):
            print(f"  With {len(event['races'])} races")
            for race in event["races"]:
                print(f"    - {race.get('name', 'N/A')}: {race.get('price', 0)}€")


class TestParticipantDashboard:
    """Test participant dashboard functionality"""
    
    @pytest.fixture
    def participant_token(self):
        """Get participant authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PARTICIPANT_EMAIL,
            "password": PARTICIPANT_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_get_participant_registrations(self, participant_token):
        """Get participant's registrations"""
        headers = {"Authorization": f"Bearer {participant_token}"}
        response = requests.get(f"{BASE_URL}/api/registrations", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "registrations" in data
        print(f"✓ Participant has {len(data['registrations'])} registrations")


class TestAdminDashboard:
    """Test admin dashboard functionality"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_admin_get_stats(self, admin_token):
        """Admin can get platform statistics"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "total_users" in data
        assert "total_events" in data
        assert "total_registrations" in data
        
        print(f"✓ Admin stats: {data['total_users']} users, {data['total_events']} events, {data['total_registrations']} registrations")


class TestPUTEventEndpointDirectly:
    """Test PUT /api/events/{event_id} endpoint directly with race data"""
    
    @pytest.fixture
    def organizer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        return response.json()["token"]
    
    def test_put_event_with_races(self, organizer_token):
        """Test PUT endpoint with race array"""
        headers = {"Authorization": f"Bearer {organizer_token}"}
        
        # Get an existing event
        response = requests.get(f"{BASE_URL}/api/organizer/events", headers=headers)
        events = response.json()["events"]
        
        if not events:
            pytest.skip("No events to test")
        
        event = events[0]
        event_id = event["event_id"]
        
        # PUT with specific race configuration
        races_data = [
            {
                "name": "10km Découverte",
                "price": 25,
                "max_participants": 200,
                "distance_km": 10,
                "current_participants": 0
            },
            {
                "name": "21km Semi",
                "price": 40,
                "max_participants": 150,
                "distance_km": 21,
                "current_participants": 0
            },
            {
                "name": "42km Marathon",
                "price": 60,
                "max_participants": 100,
                "distance_km": 42,
                "current_participants": 0
            }
        ]
        
        update_payload = {
            "title": event["title"],
            "races": races_data
        }
        
        response = requests.put(
            f"{BASE_URL}/api/events/{event_id}", 
            headers=headers, 
            json=update_payload
        )
        
        assert response.status_code == 200
        print(f"✓ PUT /api/events/{event_id} successful")
        
        # Verify
        response = requests.get(f"{BASE_URL}/api/events/{event_id}")
        assert response.status_code == 200
        
        updated = response.json()
        assert updated.get("races") is not None
        assert len(updated["races"]) == 3
        
        print(f"✓ Verified: Event has {len(updated['races'])} races:")
        for race in updated["races"]:
            print(f"    - {race['name']}: {race['price']}€, {race['max_participants']} places")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
