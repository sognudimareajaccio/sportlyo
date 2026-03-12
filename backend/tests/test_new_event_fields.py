"""
Test new event fields: themes, circuit_type, has_timer, website_url, facebook_url, instagram_url, twitter_url, youtube_url
Iteration 17 - SportLyo new fields from sportsnconnect.com
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ORGANIZER_EMAIL = "club@paris-sport.fr"
ORGANIZER_PASSWORD = "club123"

# Test event with all new fields
TEST_EVENT_ID = "evt_a94ac9884e9a"


class TestNewEventFieldsBackend:
    """Test new event fields: themes, circuit_type, has_timer, social links"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for organizer"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Authentication failed: {response.status_code}")
    
    # ==================== GET EVENT TESTS ====================
    
    def test_get_event_returns_themes(self):
        """Verify GET /api/events/{id} returns themes array"""
        response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "themes" in data, "themes field missing from event response"
        assert isinstance(data["themes"], list), "themes should be a list"
        assert len(data["themes"]) > 0, "themes array should not be empty"
        print(f"✓ Event themes: {data['themes']}")
    
    def test_get_event_returns_circuit_type(self):
        """Verify GET /api/events/{id} returns circuit_type"""
        response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "circuit_type" in data, "circuit_type field missing from event response"
        assert data["circuit_type"] in ["boucle", "aller-retour", "point-a-point", "multi-boucles", "semi-boucle"], \
            f"Invalid circuit_type: {data['circuit_type']}"
        print(f"✓ Event circuit_type: {data['circuit_type']}")
    
    def test_get_event_returns_has_timer(self):
        """Verify GET /api/events/{id} returns has_timer boolean"""
        response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "has_timer" in data, "has_timer field missing from event response"
        assert isinstance(data["has_timer"], bool), "has_timer should be a boolean"
        print(f"✓ Event has_timer: {data['has_timer']}")
    
    def test_get_event_returns_website_url(self):
        """Verify GET /api/events/{id} returns website_url"""
        response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "website_url" in data, "website_url field missing from event response"
        assert data["website_url"] is not None, "website_url should be set for test event"
        print(f"✓ Event website_url: {data['website_url']}")
    
    def test_get_event_returns_facebook_url(self):
        """Verify GET /api/events/{id} returns facebook_url"""
        response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "facebook_url" in data, "facebook_url field missing from event response"
        assert data["facebook_url"] is not None, "facebook_url should be set for test event"
        print(f"✓ Event facebook_url: {data['facebook_url']}")
    
    def test_get_event_returns_instagram_url(self):
        """Verify GET /api/events/{id} returns instagram_url"""
        response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "instagram_url" in data, "instagram_url field missing from event response"
        assert data["instagram_url"] is not None, "instagram_url should be set for test event"
        print(f"✓ Event instagram_url: {data['instagram_url']}")
    
    def test_get_event_returns_twitter_url(self):
        """Verify GET /api/events/{id} returns twitter_url"""
        response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "twitter_url" in data, "twitter_url field missing from event response"
        assert data["twitter_url"] is not None, "twitter_url should be set for test event"
        print(f"✓ Event twitter_url: {data['twitter_url']}")
    
    def test_get_event_returns_youtube_url(self):
        """Verify GET /api/events/{id} returns youtube_url"""
        response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "youtube_url" in data, "youtube_url field missing from event response"
        assert data["youtube_url"] is not None, "youtube_url should be set for test event"
        print(f"✓ Event youtube_url: {data['youtube_url']}")
    
    def test_themes_contain_expected_values(self):
        """Verify themes array contains expected theme values"""
        response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        themes = data.get("themes", [])
        
        # Expected themes for test event: Trail, Ultra-trail, Course nature
        expected_themes = ["Trail", "Ultra-trail", "Course nature"]
        for theme in expected_themes:
            assert theme in themes, f"Expected theme '{theme}' not found in themes"
        print(f"✓ All expected themes present: {expected_themes}")
    
    # ==================== CREATE EVENT TESTS ====================
    
    def test_create_event_with_themes(self, auth_token):
        """Verify POST /api/events accepts themes array"""
        import uuid
        unique_suffix = uuid.uuid4().hex[:6]
        
        event_data = {
            "title": f"TEST_Themes_Event_{unique_suffix}",
            "description": "Test event with themes",
            "sport_type": "running",
            "location": "Paris, France",
            "date": "2026-06-15T09:00:00Z",
            "max_participants": 100,
            "price": 35,
            "themes": ["Trail", "Marathon", "Course nature"]
        }
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=headers)
        
        assert response.status_code == 200, f"Create event failed: {response.status_code} - {response.text}"
        
        created = response.json()
        assert "themes" in created, "themes missing from created event"
        assert created["themes"] == event_data["themes"], "themes not saved correctly"
        print(f"✓ Event created with themes: {created['themes']}")
        
        # Cleanup - soft delete
        event_id = created["event_id"]
        requests.delete(f"{BASE_URL}/api/events/{event_id}", headers=headers)
    
    def test_create_event_with_circuit_type(self, auth_token):
        """Verify POST /api/events accepts circuit_type"""
        import uuid
        unique_suffix = uuid.uuid4().hex[:6]
        
        event_data = {
            "title": f"TEST_Circuit_Event_{unique_suffix}",
            "description": "Test event with circuit type",
            "sport_type": "running",
            "location": "Lyon, France",
            "date": "2026-07-20T08:00:00Z",
            "max_participants": 200,
            "price": 45,
            "circuit_type": "aller-retour"
        }
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=headers)
        
        assert response.status_code == 200, f"Create event failed: {response.status_code}"
        
        created = response.json()
        assert "circuit_type" in created, "circuit_type missing from created event"
        assert created["circuit_type"] == "aller-retour", "circuit_type not saved correctly"
        print(f"✓ Event created with circuit_type: {created['circuit_type']}")
        
        # Cleanup
        event_id = created["event_id"]
        requests.delete(f"{BASE_URL}/api/events/{event_id}", headers=headers)
    
    def test_create_event_with_has_timer_true(self, auth_token):
        """Verify POST /api/events accepts has_timer=true"""
        import uuid
        unique_suffix = uuid.uuid4().hex[:6]
        
        event_data = {
            "title": f"TEST_Timer_Event_{unique_suffix}",
            "description": "Test event with timer",
            "sport_type": "running",
            "location": "Marseille, France",
            "date": "2026-08-10T07:00:00Z",
            "max_participants": 150,
            "price": 40,
            "has_timer": True
        }
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=headers)
        
        assert response.status_code == 200, f"Create event failed: {response.status_code}"
        
        created = response.json()
        assert "has_timer" in created, "has_timer missing from created event"
        assert created["has_timer"] == True, "has_timer not saved correctly"
        print(f"✓ Event created with has_timer: {created['has_timer']}")
        
        # Cleanup
        event_id = created["event_id"]
        requests.delete(f"{BASE_URL}/api/events/{event_id}", headers=headers)
    
    def test_create_event_with_has_timer_false(self, auth_token):
        """Verify POST /api/events accepts has_timer=false"""
        import uuid
        unique_suffix = uuid.uuid4().hex[:6]
        
        event_data = {
            "title": f"TEST_NoTimer_Event_{unique_suffix}",
            "description": "Test event without timer",
            "sport_type": "running",
            "location": "Bordeaux, France",
            "date": "2026-09-05T09:00:00Z",
            "max_participants": 80,
            "price": 30,
            "has_timer": False
        }
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=headers)
        
        assert response.status_code == 200, f"Create event failed: {response.status_code}"
        
        created = response.json()
        assert "has_timer" in created, "has_timer missing from created event"
        assert created["has_timer"] == False, "has_timer not saved correctly"
        print(f"✓ Event created with has_timer: {created['has_timer']}")
        
        # Cleanup
        event_id = created["event_id"]
        requests.delete(f"{BASE_URL}/api/events/{event_id}", headers=headers)
    
    def test_create_event_with_social_links(self, auth_token):
        """Verify POST /api/events accepts all social link fields"""
        import uuid
        unique_suffix = uuid.uuid4().hex[:6]
        
        event_data = {
            "title": f"TEST_Social_Event_{unique_suffix}",
            "description": "Test event with social links",
            "sport_type": "running",
            "location": "Nice, France",
            "date": "2026-10-15T08:00:00Z",
            "max_participants": 500,
            "price": 55,
            "website_url": "https://test-event.fr",
            "facebook_url": "https://facebook.com/test-event",
            "instagram_url": "https://instagram.com/test-event",
            "twitter_url": "https://x.com/test-event",
            "youtube_url": "https://youtube.com/@test-event"
        }
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=headers)
        
        assert response.status_code == 200, f"Create event failed: {response.status_code}"
        
        created = response.json()
        assert created["website_url"] == event_data["website_url"], "website_url not saved"
        assert created["facebook_url"] == event_data["facebook_url"], "facebook_url not saved"
        assert created["instagram_url"] == event_data["instagram_url"], "instagram_url not saved"
        assert created["twitter_url"] == event_data["twitter_url"], "twitter_url not saved"
        assert created["youtube_url"] == event_data["youtube_url"], "youtube_url not saved"
        print(f"✓ Event created with all social links")
        
        # Cleanup
        event_id = created["event_id"]
        requests.delete(f"{BASE_URL}/api/events/{event_id}", headers=headers)
    
    def test_create_event_with_all_new_fields(self, auth_token):
        """Verify POST /api/events accepts all new fields together"""
        import uuid
        unique_suffix = uuid.uuid4().hex[:6]
        
        event_data = {
            "title": f"TEST_AllFields_Event_{unique_suffix}",
            "description": "Complete test event with all new fields",
            "sport_type": "running",
            "location": "Grenoble, France",
            "date": "2026-11-01T07:30:00Z",
            "max_participants": 300,
            "price": 65,
            "themes": ["Trail", "Ultra-trail", "Course nature"],
            "circuit_type": "boucle",
            "has_timer": True,
            "website_url": "https://complete-event.fr",
            "facebook_url": "https://facebook.com/complete-event",
            "instagram_url": "https://instagram.com/complete-event",
            "twitter_url": "https://x.com/complete-event",
            "youtube_url": "https://youtube.com/@complete-event"
        }
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=headers)
        
        assert response.status_code == 200, f"Create event failed: {response.status_code}"
        
        created = response.json()
        
        # Verify all fields
        assert created["themes"] == event_data["themes"], "themes mismatch"
        assert created["circuit_type"] == event_data["circuit_type"], "circuit_type mismatch"
        assert created["has_timer"] == event_data["has_timer"], "has_timer mismatch"
        assert created["website_url"] == event_data["website_url"], "website_url mismatch"
        assert created["facebook_url"] == event_data["facebook_url"], "facebook_url mismatch"
        assert created["instagram_url"] == event_data["instagram_url"], "instagram_url mismatch"
        assert created["twitter_url"] == event_data["twitter_url"], "twitter_url mismatch"
        assert created["youtube_url"] == event_data["youtube_url"], "youtube_url mismatch"
        
        print(f"✓ Event created with ALL new fields successfully")
        
        # Verify via GET
        get_response = requests.get(f"{BASE_URL}/api/events/{created['event_id']}")
        assert get_response.status_code == 200
        
        fetched = get_response.json()
        assert fetched["themes"] == event_data["themes"], "GET themes mismatch"
        assert fetched["circuit_type"] == event_data["circuit_type"], "GET circuit_type mismatch"
        assert fetched["has_timer"] == event_data["has_timer"], "GET has_timer mismatch"
        print(f"✓ GET /api/events/{created['event_id']} returns all new fields correctly")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/events/{created['event_id']}", headers=headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
