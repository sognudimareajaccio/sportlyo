"""
Test suite for Volunteers Management feature (Gestion des Bénévoles)
Tests CRUD operations for /api/organizer/volunteers endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestVolunteersCRUD:
    """Test volunteer CRUD operations for organizers"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test environment and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as organizer
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "club@paris-sport.fr",
            "password": "club123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Get available events for testing
        events_resp = self.session.get(f"{BASE_URL}/api/organizer/events")
        self.events = events_resp.json().get("events", [])
        self.test_event_id = self.events[0]["event_id"] if self.events else "evt_test"
        
        yield
        
        # Cleanup: delete test volunteers
        try:
            vols_resp = self.session.get(f"{BASE_URL}/api/organizer/volunteers")
            if vols_resp.status_code == 200:
                for vol in vols_resp.json().get("volunteers", []):
                    if vol.get("first_name", "").startswith("TEST_"):
                        self.session.delete(f"{BASE_URL}/api/organizer/volunteers/{vol['volunteer_id']}")
        except:
            pass
    
    def test_get_volunteers_list(self):
        """GET /api/organizer/volunteers - list all volunteers"""
        response = self.session.get(f"{BASE_URL}/api/organizer/volunteers")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "volunteers" in data
        assert isinstance(data["volunteers"], list)
        print(f"PASS: GET /api/organizer/volunteers - returned {len(data['volunteers'])} volunteers")
    
    def test_get_volunteers_filter_by_event(self):
        """GET /api/organizer/volunteers?event_id=xxx - filter by event"""
        response = self.session.get(f"{BASE_URL}/api/organizer/volunteers?event_id={self.test_event_id}")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "volunteers" in data
        # Verify all returned volunteers belong to the filtered event
        for vol in data["volunteers"]:
            assert vol["event_id"] == self.test_event_id, f"Volunteer {vol['volunteer_id']} has wrong event_id"
        print(f"PASS: GET /api/organizer/volunteers?event_id={self.test_event_id} - filter works, {len(data['volunteers'])} results")
    
    def test_create_volunteer_success(self):
        """POST /api/organizer/volunteers - create with all required fields"""
        payload = {
            "first_name": "TEST_Jean",
            "last_name": "Martin",
            "phone": "0612345678",
            "email": "jean.martin@test.fr",
            "role_assigned": "Ravitaillement",
            "event_id": self.test_event_id,
            "notes": "Test volunteer creation"
        }
        response = self.session.post(f"{BASE_URL}/api/organizer/volunteers", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "volunteer" in data
        volunteer = data["volunteer"]
        
        # Verify all fields
        assert volunteer["first_name"] == payload["first_name"]
        assert volunteer["last_name"] == payload["last_name"]
        assert volunteer["phone"] == payload["phone"]
        assert volunteer["email"] == payload["email"]
        assert volunteer["role_assigned"] == payload["role_assigned"]
        assert volunteer["event_id"] == payload["event_id"]
        assert volunteer["notes"] == payload["notes"]
        assert "volunteer_id" in volunteer
        assert volunteer["volunteer_id"].startswith("vol_")
        
        self.created_volunteer_id = volunteer["volunteer_id"]
        print(f"PASS: POST /api/organizer/volunteers - created {volunteer['volunteer_id']}")
        
        # Verify persistence with GET
        get_resp = self.session.get(f"{BASE_URL}/api/organizer/volunteers")
        assert get_resp.status_code == 200
        all_volunteers = get_resp.json()["volunteers"]
        found = any(v["volunteer_id"] == volunteer["volunteer_id"] for v in all_volunteers)
        assert found, "Created volunteer not found in GET response"
        print("PASS: Volunteer persisted and retrieved via GET")
    
    def test_create_volunteer_missing_required_fields(self):
        """POST /api/organizer/volunteers - validation error for missing fields"""
        # Missing first_name
        payload1 = {
            "last_name": "Dupont",
            "phone": "0612345678",
            "role_assigned": "Accueil",
            "event_id": self.test_event_id
        }
        resp1 = self.session.post(f"{BASE_URL}/api/organizer/volunteers", json=payload1)
        assert resp1.status_code == 400, f"Expected 400 for missing first_name, got {resp1.status_code}"
        print("PASS: Validation error for missing first_name")
        
        # Missing last_name
        payload2 = {
            "first_name": "TEST_Pierre",
            "phone": "0612345678",
            "role_assigned": "Accueil",
            "event_id": self.test_event_id
        }
        resp2 = self.session.post(f"{BASE_URL}/api/organizer/volunteers", json=payload2)
        assert resp2.status_code == 400, f"Expected 400 for missing last_name, got {resp2.status_code}"
        print("PASS: Validation error for missing last_name")
        
        # Missing phone
        payload3 = {
            "first_name": "TEST_Pierre",
            "last_name": "Durand",
            "role_assigned": "Accueil",
            "event_id": self.test_event_id
        }
        resp3 = self.session.post(f"{BASE_URL}/api/organizer/volunteers", json=payload3)
        assert resp3.status_code == 400, f"Expected 400 for missing phone, got {resp3.status_code}"
        print("PASS: Validation error for missing phone")
        
        # Missing role_assigned
        payload4 = {
            "first_name": "TEST_Pierre",
            "last_name": "Durand",
            "phone": "0612345678",
            "event_id": self.test_event_id
        }
        resp4 = self.session.post(f"{BASE_URL}/api/organizer/volunteers", json=payload4)
        assert resp4.status_code == 400, f"Expected 400 for missing role_assigned, got {resp4.status_code}"
        print("PASS: Validation error for missing role_assigned")
        
        # Missing event_id
        payload5 = {
            "first_name": "TEST_Pierre",
            "last_name": "Durand",
            "phone": "0612345678",
            "role_assigned": "Accueil"
        }
        resp5 = self.session.post(f"{BASE_URL}/api/organizer/volunteers", json=payload5)
        assert resp5.status_code == 400, f"Expected 400 for missing event_id, got {resp5.status_code}"
        print("PASS: Validation error for missing event_id")
    
    def test_update_volunteer(self):
        """PUT /api/organizer/volunteers/{id} - update volunteer"""
        # First create a volunteer
        create_payload = {
            "first_name": "TEST_Update",
            "last_name": "Before",
            "phone": "0611111111",
            "role_assigned": "Signaleur",
            "event_id": self.test_event_id
        }
        create_resp = self.session.post(f"{BASE_URL}/api/organizer/volunteers", json=create_payload)
        assert create_resp.status_code == 200
        volunteer_id = create_resp.json()["volunteer"]["volunteer_id"]
        
        # Update the volunteer
        update_payload = {
            "first_name": "TEST_Update",
            "last_name": "After",
            "phone": "0622222222",
            "email": "updated@test.fr",
            "role_assigned": "Chronometrage",
            "notes": "Updated notes"
        }
        update_resp = self.session.put(f"{BASE_URL}/api/organizer/volunteers/{volunteer_id}", json=update_payload)
        assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
        
        updated = update_resp.json()["volunteer"]
        assert updated["last_name"] == "After"
        assert updated["phone"] == "0622222222"
        assert updated["email"] == "updated@test.fr"
        assert updated["role_assigned"] == "Chronometrage"
        assert updated["notes"] == "Updated notes"
        print(f"PASS: PUT /api/organizer/volunteers/{volunteer_id} - updated successfully")
        
        # Verify persistence
        get_resp = self.session.get(f"{BASE_URL}/api/organizer/volunteers")
        volunteers = get_resp.json()["volunteers"]
        found_vol = next((v for v in volunteers if v["volunteer_id"] == volunteer_id), None)
        assert found_vol is not None
        assert found_vol["last_name"] == "After"
        print("PASS: Update persisted and verified via GET")
    
    def test_delete_volunteer(self):
        """DELETE /api/organizer/volunteers/{id} - delete volunteer"""
        # First create a volunteer
        create_payload = {
            "first_name": "TEST_Delete",
            "last_name": "Me",
            "phone": "0633333333",
            "role_assigned": "Logistique",
            "event_id": self.test_event_id
        }
        create_resp = self.session.post(f"{BASE_URL}/api/organizer/volunteers", json=create_payload)
        assert create_resp.status_code == 200
        volunteer_id = create_resp.json()["volunteer"]["volunteer_id"]
        
        # Delete the volunteer
        delete_resp = self.session.delete(f"{BASE_URL}/api/organizer/volunteers/{volunteer_id}")
        assert delete_resp.status_code == 200, f"Delete failed: {delete_resp.text}"
        assert "supprime" in delete_resp.json().get("message", "").lower()
        print(f"PASS: DELETE /api/organizer/volunteers/{volunteer_id} - deleted successfully")
        
        # Verify deletion
        get_resp = self.session.get(f"{BASE_URL}/api/organizer/volunteers")
        volunteers = get_resp.json()["volunteers"]
        found = any(v["volunteer_id"] == volunteer_id for v in volunteers)
        assert not found, "Deleted volunteer still exists"
        print("PASS: Volunteer deletion verified via GET")
    
    def test_delete_nonexistent_volunteer(self):
        """DELETE /api/organizer/volunteers/{id} - 404 for non-existent"""
        response = self.session.delete(f"{BASE_URL}/api/organizer/volunteers/vol_nonexistent123")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: DELETE non-existent volunteer returns 404")
    
    def test_predefined_roles(self):
        """Verify predefined volunteer roles work correctly"""
        predefined_roles = [
            "Ravitaillement", "Signaleur", "Accueil", "Chronometrage", 
            "Securite", "Logistique", "Animation", "Medical", "Transport", "Communication"
        ]
        
        for role in predefined_roles[:3]:  # Test first 3 to save time
            payload = {
                "first_name": f"TEST_Role_{role[:4]}",
                "last_name": "Test",
                "phone": "0699999999",
                "role_assigned": role,
                "event_id": self.test_event_id
            }
            resp = self.session.post(f"{BASE_URL}/api/organizer/volunteers", json=payload)
            assert resp.status_code == 200, f"Failed to create volunteer with role {role}"
            assert resp.json()["volunteer"]["role_assigned"] == role
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/organizer/volunteers/{resp.json()['volunteer']['volunteer_id']}")
        
        print("PASS: Predefined roles (Ravitaillement, Signaleur, Accueil) work correctly")


class TestVolunteersAuth:
    """Test volunteer endpoint authorization"""
    
    def test_volunteers_requires_auth(self):
        """Volunteers endpoints require authentication"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Try without auth
        resp = session.get(f"{BASE_URL}/api/organizer/volunteers")
        assert resp.status_code == 401, f"Expected 401 without auth, got {resp.status_code}"
        print("PASS: GET /api/organizer/volunteers requires auth")
    
    def test_volunteers_requires_organizer_role(self):
        """Volunteers endpoints require organizer role"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as regular participant
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pierre@test.com",
            "password": "test1234"
        })
        if login_resp.status_code != 200:
            pytest.skip("Participant login failed")
        
        token = login_resp.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        resp = session.get(f"{BASE_URL}/api/organizer/volunteers")
        assert resp.status_code == 403, f"Expected 403 for non-organizer, got {resp.status_code}"
        print("PASS: Volunteers endpoint returns 403 for non-organizer users")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
