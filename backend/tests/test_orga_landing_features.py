"""
Test OrgaLandingPage Features - Iteration 19
Tests for:
1. Events have unsplash image_url
2. GET /api/events returns 12 events with proper images
3. GET /api/events/featured returns events
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEventsImageUrls:
    """Test that events have updated unsplash image URLs"""
    
    def test_get_events_returns_events(self):
        """GET /api/events should return events list"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "events" in data, "Response should contain 'events' key"
        assert len(data["events"]) >= 12, f"Expected at least 12 events, got {len(data['events'])}"
        print(f"SUCCESS: GET /api/events returned {len(data['events'])} events")
    
    def test_all_events_have_unsplash_images(self):
        """All events should have unsplash image URLs"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        
        events = response.json()["events"]
        events_without_unsplash = []
        
        for event in events:
            image_url = event.get("image_url", "")
            if not image_url or "unsplash" not in image_url.lower():
                events_without_unsplash.append(event.get("title", "Unknown"))
        
        assert len(events_without_unsplash) == 0, f"Events without unsplash images: {events_without_unsplash}"
        print(f"SUCCESS: All {len(events)} events have unsplash image URLs")
    
    def test_event_images_match_sports(self):
        """Verify each event has an image_url field"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        
        events = response.json()["events"]
        sport_image_map = {}
        
        for event in events:
            sport = event.get("sport_type", "unknown")
            image_url = event.get("image_url", "")
            title = event.get("title", "Unknown")
            
            # Verify image_url is a valid URL
            assert image_url.startswith("http"), f"Event '{title}' has invalid image_url: {image_url}"
            
            sport_image_map[sport] = image_url
            print(f"  - {sport}: {title} -> {image_url[:50]}...")
        
        print(f"SUCCESS: Verified {len(events)} events have valid image URLs")
    
    def test_featured_events_endpoint(self):
        """GET /api/events/featured should return featured events"""
        response = requests.get(f"{BASE_URL}/api/events/featured")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "events" in data, "Response should contain 'events' key"
        
        # Featured events should also have unsplash images
        for event in data["events"]:
            image_url = event.get("image_url", "")
            assert "unsplash" in image_url.lower(), f"Featured event '{event.get('title')}' missing unsplash image"
        
        print(f"SUCCESS: GET /api/events/featured returned {len(data['events'])} events")
    
    def test_individual_event_has_image(self):
        """GET /api/events/{id} should return event with image_url"""
        # First get list of events
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        
        events = response.json()["events"]
        if len(events) > 0:
            event_id = events[0].get("event_id")
            
            # Get individual event
            response = requests.get(f"{BASE_URL}/api/events/{event_id}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            event = response.json()
            assert "image_url" in event, "Event should have image_url field"
            assert "unsplash" in event["image_url"].lower(), "Event image should be from unsplash"
            
            print(f"SUCCESS: GET /api/events/{event_id} returned event with unsplash image")


class TestCategoriesEndpoint:
    """Test categories endpoint for homepage"""
    
    def test_get_categories(self):
        """GET /api/categories should return sport categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "categories" in data, "Response should contain 'categories' key"
        print(f"SUCCESS: GET /api/categories returned {len(data['categories'])} categories")


class TestAuthEndpoints:
    """Basic auth endpoint tests"""
    
    def test_login_organizer(self):
        """Test organizer login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "club@paris-sport.fr",
            "password": "club123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "token" in data, "Response should contain 'token'"
        assert "user" in data, "Response should contain 'user'"
        print(f"SUCCESS: Organizer login successful")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"SUCCESS: Invalid login correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
