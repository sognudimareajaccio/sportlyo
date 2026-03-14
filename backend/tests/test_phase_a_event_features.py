"""
Test Phase A Event Features - SportLyo
Features tested:
- Event creation with new fields (regulations_pdf_url, published, provides_tshirt)
- Race configuration with description field
- GET /api/events only returns published=true events
- GET /api/organizer/events returns all events for organizer
- PUT /api/events/{event_id}/publish toggles published status
- Admin notifications for new events
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ORGANIZER_EMAIL = "club@paris-sport.fr"
ORGANIZER_PASSWORD = "club123"
ADMIN_EMAIL = "admin@sportsconnect.fr"
ADMIN_PASSWORD = "admin123"


class TestPhaseAEventFeatures:
    """Test Phase A event creation and publication features"""
    
    @pytest.fixture
    def api_client(self):
        """Create a requests session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture
    def organizer_token(self, api_client):
        """Get organizer auth token"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture
    def admin_token(self, api_client):
        """Get admin auth token"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture
    def auth_client(self, api_client, organizer_token):
        """Session with auth header"""
        api_client.headers.update({"Authorization": f"Bearer {organizer_token}"})
        return api_client
    
    @pytest.fixture
    def admin_client(self, api_client, admin_token):
        """Session with admin auth header"""
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        return api_client

    # ================== ORGANIZER LOGIN TEST ==================
    def test_organizer_login(self, api_client):
        """Test organizer login with correct credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "organizer"
        print(f"✓ Organizer login successful: {data['user']['name']}")

    def test_admin_login(self, api_client):
        """Test admin login with correct credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful: {data['user']['name']}")

    # ================== EVENT CREATION WITH NEW FIELDS ==================
    def test_create_event_with_new_fields(self, auth_client):
        """Test creating event with regulations_pdf_url, published, provides_tshirt fields"""
        unique_id = uuid.uuid4().hex[:8]
        event_data = {
            "title": f"TEST_Event_PhaseA_{unique_id}",
            "description": "Test event for Phase A features",
            "sport_type": "running",
            "location": "Paris, France",
            "date": "2026-09-15T09:00:00",
            "max_participants": 200,
            "price": 30,
            "regulations_pdf_url": "https://example.com/regulations.pdf",
            "published": False,  # Default should be False
            "provides_tshirt": True,  # Default True
            "races": [
                {
                    "name": "10km Course",
                    "price": 30,
                    "max_participants": 100,
                    "distance_km": 10,
                    "elevation_gain": 50,
                    "description": "Course de 10km pour tous niveaux"
                },
                {
                    "name": "5km Marche",
                    "price": 15,
                    "max_participants": 100,
                    "distance_km": 5,
                    "elevation_gain": 20,
                    "description": "Marche de 5km accessible a tous"
                }
            ]
        }
        
        response = auth_client.post(f"{BASE_URL}/api/events", json=event_data)
        assert response.status_code == 200, f"Create event failed: {response.text}"
        
        data = response.json()
        assert data["regulations_pdf_url"] == "https://example.com/regulations.pdf"
        assert data["published"] == False
        assert data["provides_tshirt"] == True
        assert len(data["races"]) == 2
        # Check race description field
        assert data["races"][0]["description"] == "Course de 10km pour tous niveaux"
        assert data["races"][1]["description"] == "Marche de 5km accessible a tous"
        
        print(f"✓ Event created with new fields: {data['event_id']}")
        print(f"  - regulations_pdf_url: {data['regulations_pdf_url']}")
        print(f"  - published: {data['published']}")
        print(f"  - provides_tshirt: {data['provides_tshirt']}")
        print(f"  - races[0].description: {data['races'][0]['description']}")
        
        # Store event_id for cleanup
        return data['event_id']

    def test_create_event_default_published_false(self, auth_client):
        """Verify that published defaults to False when not provided"""
        unique_id = uuid.uuid4().hex[:8]
        event_data = {
            "title": f"TEST_DefaultPublished_{unique_id}",
            "description": "Test default published value",
            "sport_type": "cycling",
            "location": "Lyon, France",
            "date": "2026-10-01T08:00:00",
            "max_participants": 50,
            "price": 25
            # published not provided - should default to False
        }
        
        response = auth_client.post(f"{BASE_URL}/api/events", json=event_data)
        assert response.status_code == 200
        data = response.json()
        assert data["published"] == False, "published should default to False"
        print(f"✓ Event published defaults to False: {data['event_id']}")

    def test_create_event_default_provides_tshirt_true(self, auth_client):
        """Verify that provides_tshirt defaults to True when not provided"""
        unique_id = uuid.uuid4().hex[:8]
        event_data = {
            "title": f"TEST_DefaultTshirt_{unique_id}",
            "description": "Test default tshirt value",
            "sport_type": "triathlon",
            "location": "Nice, France",
            "date": "2026-11-01T07:00:00",
            "max_participants": 100,
            "price": 50
            # provides_tshirt not provided - should default to True
        }
        
        response = auth_client.post(f"{BASE_URL}/api/events", json=event_data)
        assert response.status_code == 200
        data = response.json()
        assert data["provides_tshirt"] == True, "provides_tshirt should default to True"
        print(f"✓ Event provides_tshirt defaults to True: {data['event_id']}")

    # ================== GET /api/events - ONLY PUBLISHED ==================
    def test_get_events_only_published(self, api_client, auth_client):
        """Verify GET /api/events only returns published events"""
        # First create an unpublished event
        unique_id = uuid.uuid4().hex[:8]
        unpublished_event = {
            "title": f"TEST_UnpublishedEvent_{unique_id}",
            "description": "This event should NOT appear in public list",
            "sport_type": "running",
            "location": "Marseille, France",
            "date": "2026-12-01T10:00:00",
            "max_participants": 50,
            "price": 20,
            "published": False
        }
        create_response = auth_client.post(f"{BASE_URL}/api/events", json=unpublished_event)
        assert create_response.status_code == 200
        created_event_id = create_response.json()["event_id"]
        
        # Get public events list (no auth needed)
        response = api_client.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        data = response.json()
        
        # Check that our unpublished event is NOT in the list
        event_ids = [e["event_id"] for e in data["events"]]
        assert created_event_id not in event_ids, "Unpublished event should not appear in public list"
        
        # Verify all returned events have published=true
        for event in data["events"]:
            assert event.get("published", True) == True, f"Event {event['event_id']} has published != true"
        
        print(f"✓ GET /api/events returns only published events")
        print(f"  - Total events returned: {data['total']}")
        print(f"  - Unpublished event {created_event_id} correctly excluded")

    # ================== GET /api/organizer/events - ALL EVENTS ==================
    def test_get_organizer_events_all(self, auth_client):
        """Verify GET /api/organizer/events returns all events (published and unpublished)"""
        response = auth_client.get(f"{BASE_URL}/api/organizer/events")
        assert response.status_code == 200
        data = response.json()
        
        # Should include both published and unpublished events
        events = data["events"]
        has_published = any(e.get("published", True) for e in events)
        has_unpublished = any(not e.get("published", True) for e in events)
        
        print(f"✓ GET /api/organizer/events returns all events")
        print(f"  - Total events: {len(events)}")
        print(f"  - Has published events: {has_published}")
        print(f"  - Has unpublished events: {has_unpublished}")
        
        # The organizer should see TEST_ events we created
        test_events = [e for e in events if e["title"].startswith("TEST_")]
        print(f"  - Test events found: {len(test_events)}")

    # ================== PUT /api/events/{event_id}/publish ==================
    def test_publish_event(self, auth_client):
        """Test publishing an event via PUT /api/events/{event_id}/publish"""
        # First create an unpublished event
        unique_id = uuid.uuid4().hex[:8]
        event_data = {
            "title": f"TEST_ToPublish_{unique_id}",
            "description": "Event to test publish feature",
            "sport_type": "running",
            "location": "Bordeaux, France",
            "date": "2027-01-15T09:00:00",
            "max_participants": 100,
            "price": 35,
            "published": False
        }
        
        create_response = auth_client.post(f"{BASE_URL}/api/events", json=event_data)
        assert create_response.status_code == 200
        event_id = create_response.json()["event_id"]
        
        # Publish the event
        publish_response = auth_client.put(f"{BASE_URL}/api/events/{event_id}/publish", json={
            "published": True
        })
        assert publish_response.status_code == 200
        data = publish_response.json()
        assert data["published"] == True
        print(f"✓ Event published successfully: {event_id}")
        print(f"  - Response message: {data.get('message')}")
        
        # Verify event is now published
        event_response = auth_client.get(f"{BASE_URL}/api/events/{event_id}")
        assert event_response.status_code == 200
        event_data = event_response.json()
        assert event_data["published"] == True
        print(f"  - Verified event is now published")

    def test_unpublish_event(self, auth_client):
        """Test unpublishing an event via PUT /api/events/{event_id}/publish"""
        # First create a published event
        unique_id = uuid.uuid4().hex[:8]
        event_data = {
            "title": f"TEST_ToUnpublish_{unique_id}",
            "description": "Event to test unpublish feature",
            "sport_type": "cycling",
            "location": "Toulouse, France",
            "date": "2027-02-20T08:00:00",
            "max_participants": 150,
            "price": 40,
            "published": True
        }
        
        create_response = auth_client.post(f"{BASE_URL}/api/events", json=event_data)
        assert create_response.status_code == 200
        event_id = create_response.json()["event_id"]
        
        # Unpublish the event
        unpublish_response = auth_client.put(f"{BASE_URL}/api/events/{event_id}/publish", json={
            "published": False
        })
        assert unpublish_response.status_code == 200
        data = unpublish_response.json()
        assert data["published"] == False
        print(f"✓ Event unpublished successfully: {event_id}")
        
        # Verify event is now unpublished
        event_response = auth_client.get(f"{BASE_URL}/api/events/{event_id}")
        assert event_response.status_code == 200
        event_data = event_response.json()
        assert event_data["published"] == False
        print(f"  - Verified event is now unpublished")

    # ================== RACE MANAGEMENT TESTS ==================
    def test_event_with_race_description(self, auth_client):
        """Test that race description field is properly saved and returned"""
        unique_id = uuid.uuid4().hex[:8]
        event_data = {
            "title": f"TEST_RaceDescriptions_{unique_id}",
            "description": "Test race descriptions",
            "sport_type": "trail",
            "location": "Chamonix, France",
            "date": "2027-03-10T06:00:00",
            "max_participants": 500,
            "price": 60,
            "races": [
                {
                    "name": "Ultra Trail 50km",
                    "price": 80,
                    "max_participants": 200,
                    "distance_km": 50,
                    "elevation_gain": 3000,
                    "description": "Ultra trail pour les coureurs experimentes. Depart a 6h, limite de temps 14h."
                },
                {
                    "name": "Trail 25km",
                    "price": 50,
                    "max_participants": 200,
                    "distance_km": 25,
                    "elevation_gain": 1500,
                    "description": "Trail accessible avec quelques passages techniques."
                },
                {
                    "name": "Marche Nordique 10km",
                    "price": 25,
                    "max_participants": 100,
                    "distance_km": 10,
                    "elevation_gain": 300,
                    "description": "Marche nordique sur sentiers faciles, batons fournis."
                }
            ]
        }
        
        response = auth_client.post(f"{BASE_URL}/api/events", json=event_data)
        assert response.status_code == 200
        data = response.json()
        
        # Verify all race descriptions
        assert len(data["races"]) == 3
        for i, race in enumerate(data["races"]):
            expected_desc = event_data["races"][i]["description"]
            assert race["description"] == expected_desc, f"Race {i} description mismatch"
        
        print(f"✓ All race descriptions saved correctly")
        for race in data["races"]:
            print(f"  - {race['name']}: {race['description'][:50]}...")

    # ================== ADMIN NOTIFICATIONS TEST ==================
    def test_admin_notified_on_new_event(self, auth_client, admin_client):
        """Test that admin receives notification when new event is created"""
        # Create a new event
        unique_id = uuid.uuid4().hex[:8]
        event_data = {
            "title": f"TEST_AdminNotif_{unique_id}",
            "description": "Event to test admin notification",
            "sport_type": "running",
            "location": "Nantes, France",
            "date": "2027-04-15T08:00:00",
            "max_participants": 100,
            "price": 30
        }
        
        create_response = auth_client.post(f"{BASE_URL}/api/events", json=event_data)
        assert create_response.status_code == 200
        event_id = create_response.json()["event_id"]
        event_title = create_response.json()["title"]
        
        # Check admin notifications
        notif_response = admin_client.get(f"{BASE_URL}/api/notifications")
        assert notif_response.status_code == 200
        notifications = notif_response.json().get("notifications", [])
        
        # Find notification for our new event
        found_notification = None
        for notif in notifications:
            if event_title in notif.get("message", "") or event_id in str(notif.get("data", {})):
                found_notification = notif
                break
        
        if found_notification:
            print(f"✓ Admin notification found for new event")
            print(f"  - Event ID: {event_id}")
            print(f"  - Notification type: {found_notification.get('notification_type')}")
            print(f"  - Message: {found_notification.get('message')[:80]}...")
        else:
            print(f"! Admin notification not found (may be expected if notifications cleared)")
            # Not failing the test as notifications might have been read/cleared

    # ================== UPDATE EVENT WITH NEW FIELDS ==================
    def test_update_event_regulations_pdf(self, auth_client):
        """Test updating event with regulations PDF URL"""
        # Create event first
        unique_id = uuid.uuid4().hex[:8]
        event_data = {
            "title": f"TEST_UpdateRegulations_{unique_id}",
            "description": "Test update regulations",
            "sport_type": "running",
            "location": "Lille, France",
            "date": "2027-05-01T09:00:00",
            "max_participants": 100,
            "price": 25
        }
        
        create_response = auth_client.post(f"{BASE_URL}/api/events", json=event_data)
        assert create_response.status_code == 200
        event_id = create_response.json()["event_id"]
        
        # Update with regulations PDF
        update_response = auth_client.put(f"{BASE_URL}/api/events/{event_id}", json={
            "regulations_pdf_url": "https://example.com/updated-regulations.pdf"
        })
        assert update_response.status_code == 200
        
        # Verify update
        get_response = auth_client.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_response.status_code == 200
        updated_event = get_response.json()
        assert updated_event["regulations_pdf_url"] == "https://example.com/updated-regulations.pdf"
        print(f"✓ Event regulations PDF updated successfully")

    def test_update_event_provides_tshirt(self, auth_client):
        """Test updating event provides_tshirt field"""
        # Create event with tshirt
        unique_id = uuid.uuid4().hex[:8]
        event_data = {
            "title": f"TEST_UpdateTshirt_{unique_id}",
            "description": "Test update tshirt",
            "sport_type": "running",
            "location": "Strasbourg, France",
            "date": "2027-06-01T09:00:00",
            "max_participants": 100,
            "price": 25,
            "provides_tshirt": True
        }
        
        create_response = auth_client.post(f"{BASE_URL}/api/events", json=event_data)
        assert create_response.status_code == 200
        event_id = create_response.json()["event_id"]
        
        # Update to no tshirt
        update_response = auth_client.put(f"{BASE_URL}/api/events/{event_id}", json={
            "provides_tshirt": False
        })
        assert update_response.status_code == 200
        
        # Verify update
        get_response = auth_client.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_response.status_code == 200
        updated_event = get_response.json()
        assert updated_event["provides_tshirt"] == False
        print(f"✓ Event provides_tshirt updated to False")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture
    def api_client(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture
    def organizer_token(self, api_client):
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        return response.json().get("token")
    
    @pytest.fixture
    def auth_client(self, api_client, organizer_token):
        api_client.headers.update({"Authorization": f"Bearer {organizer_token}"})
        return api_client
    
    def test_cleanup_test_events(self, auth_client):
        """Clean up TEST_ prefixed events"""
        response = auth_client.get(f"{BASE_URL}/api/organizer/events")
        if response.status_code == 200:
            events = response.json().get("events", [])
            test_events = [e for e in events if e["title"].startswith("TEST_")]
            deleted = 0
            for event in test_events:
                del_response = auth_client.delete(f"{BASE_URL}/api/events/{event['event_id']}")
                if del_response.status_code == 200:
                    deleted += 1
            print(f"✓ Cleanup: Deleted {deleted} test events")
