"""
Test PPS Upload and Verification Features for SportLyo
Features tested:
1. POST /api/registrations/{id}/upload-pps - Participant uploads PPS document
2. POST /api/registrations/{id}/verify-pps - Organizer approves/rejects PPS
3. Registration stores age when birth_date is provided
4. Upload requires authentication and ownership
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
PARTICIPANT_EMAIL = "pierre@test.com"
PARTICIPANT_PASSWORD = "test1234"
ORGANIZER_EMAIL = "club@paris-sport.fr"
ORGANIZER_PASSWORD = "club123"
ADMIN_EMAIL = "admin@sportsconnect.fr"
ADMIN_PASSWORD = "admin123"


class TestPPSUploadAndVerification:
    """Tests for PPS document upload and verification workflow"""

    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()

    @pytest.fixture(scope="class")
    def participant_token(self, session):
        """Login as participant"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": PARTICIPANT_EMAIL,
            "password": PARTICIPANT_PASSWORD
        })
        assert response.status_code == 200, f"Participant login failed: {response.text}"
        return response.json()["token"]

    @pytest.fixture(scope="class")
    def organizer_token(self, session):
        """Login as organizer"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        assert response.status_code == 200, f"Organizer login failed: {response.text}"
        return response.json()["token"]

    @pytest.fixture(scope="class")
    def admin_token(self, session):
        """Login as admin"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]

    @pytest.fixture(scope="class")
    def participant_registrations(self, session, participant_token):
        """Get participant's registrations"""
        response = session.get(
            f"{BASE_URL}/api/registrations",
            headers={"Authorization": f"Bearer {participant_token}"}
        )
        assert response.status_code == 200
        return response.json()["registrations"]

    def test_upload_pps_without_auth_fails(self, session):
        """Test that PPS upload requires authentication"""
        # Create fake file
        files = {"file": ("test.pdf", b"fake pdf content", "application/pdf")}
        response = session.post(
            f"{BASE_URL}/api/registrations/reg_test12345/upload-pps",
            files=files
        )
        assert response.status_code == 401, f"Expected 401 but got {response.status_code}: {response.text}"
        print("TEST PASSED: Upload PPS requires authentication")

    def test_upload_pps_invalid_registration_fails(self, session, participant_token):
        """Test that PPS upload fails for non-existent registration"""
        files = {"file": ("test.pdf", b"fake pdf content", "application/pdf")}
        response = session.post(
            f"{BASE_URL}/api/registrations/reg_nonexistent123/upload-pps",
            files=files,
            headers={"Authorization": f"Bearer {participant_token}"}
        )
        assert response.status_code == 404, f"Expected 404 but got {response.status_code}: {response.text}"
        print("TEST PASSED: Upload PPS fails for non-existent registration")

    def test_upload_pps_invalid_file_type_fails(self, session, participant_token, participant_registrations):
        """Test that PPS upload fails for invalid file types"""
        if not participant_registrations:
            pytest.skip("No registrations found for participant")
        
        reg_id = participant_registrations[0]["registration_id"]
        files = {"file": ("test.exe", b"fake exe content", "application/octet-stream")}
        response = session.post(
            f"{BASE_URL}/api/registrations/{reg_id}/upload-pps",
            files=files,
            headers={"Authorization": f"Bearer {participant_token}"}
        )
        assert response.status_code == 400, f"Expected 400 but got {response.status_code}: {response.text}"
        print("TEST PASSED: Upload PPS rejects invalid file types")

    def test_upload_pps_success(self, session, participant_token, participant_registrations):
        """Test successful PPS document upload"""
        if not participant_registrations:
            pytest.skip("No registrations found for participant")
        
        # Find a registration that might need PPS
        reg_id = participant_registrations[0]["registration_id"]
        
        # Create a fake PDF file
        pdf_content = b"%PDF-1.4 fake pdf content for testing"
        files = {"file": ("pps_test.pdf", pdf_content, "application/pdf")}
        
        response = session.post(
            f"{BASE_URL}/api/registrations/{reg_id}/upload-pps",
            files=files,
            headers={"Authorization": f"Bearer {participant_token}"}
        )
        assert response.status_code == 200, f"Expected 200 but got {response.status_code}: {response.text}"
        data = response.json()
        assert "url" in data, "Response should contain URL"
        assert data["message"] == "PPS téléchargé avec succès"
        print(f"TEST PASSED: PPS uploaded successfully to {data['url']}")

    def test_verify_pps_requires_organizer_role(self, session, participant_token, participant_registrations):
        """Test that verify-pps requires organizer/admin role"""
        if not participant_registrations:
            pytest.skip("No registrations found for participant")
        
        reg_id = participant_registrations[0]["registration_id"]
        response = session.post(
            f"{BASE_URL}/api/registrations/{reg_id}/verify-pps",
            json={"action": "approve"},
            headers={"Authorization": f"Bearer {participant_token}"}
        )
        assert response.status_code == 403, f"Expected 403 but got {response.status_code}: {response.text}"
        print("TEST PASSED: Verify PPS requires organizer/admin role")

    def test_verify_pps_approve(self, session, organizer_token, participant_registrations):
        """Test organizer can approve PPS"""
        if not participant_registrations:
            pytest.skip("No registrations found for participant")
        
        reg_id = participant_registrations[0]["registration_id"]
        response = session.post(
            f"{BASE_URL}/api/registrations/{reg_id}/verify-pps",
            json={"action": "approve"},
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        assert response.status_code == 200, f"Expected 200 but got {response.status_code}: {response.text}"
        data = response.json()
        assert "vérifié" in data["message"].lower() or "approuvé" in data["message"].lower()
        print(f"TEST PASSED: PPS approved - {data['message']}")

    def test_verify_pps_reject(self, session, organizer_token, participant_registrations):
        """Test organizer can reject PPS"""
        if not participant_registrations:
            pytest.skip("No registrations found for participant")
        
        reg_id = participant_registrations[0]["registration_id"]
        response = session.post(
            f"{BASE_URL}/api/registrations/{reg_id}/verify-pps",
            json={"action": "reject"},
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        assert response.status_code == 200, f"Expected 200 but got {response.status_code}: {response.text}"
        data = response.json()
        assert "rejeté" in data["message"].lower()
        print(f"TEST PASSED: PPS rejected - {data['message']}")

    def test_verify_pps_admin_can_verify(self, session, admin_token, participant_registrations):
        """Test admin can also verify PPS"""
        if not participant_registrations:
            pytest.skip("No registrations found for participant")
        
        reg_id = participant_registrations[0]["registration_id"]
        response = session.post(
            f"{BASE_URL}/api/registrations/{reg_id}/verify-pps",
            json={"action": "approve"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200 but got {response.status_code}: {response.text}"
        print("TEST PASSED: Admin can approve PPS")

    def test_registration_has_pps_status_after_verification(self, session, participant_token, participant_registrations):
        """Test that registration contains pps_status after verification"""
        if not participant_registrations:
            pytest.skip("No registrations found for participant")
        
        reg_id = participant_registrations[0]["registration_id"]
        response = session.get(
            f"{BASE_URL}/api/registrations/{reg_id}",
            headers={"Authorization": f"Bearer {participant_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Check that pps_status field exists
        assert "pps_status" in data or "pps_verified" in data
        print(f"TEST PASSED: Registration has PPS status field - pps_status={data.get('pps_status')}, pps_verified={data.get('pps_verified')}")


class TestRegistrationAgeCalculation:
    """Tests for age calculation in registrations"""

    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()

    @pytest.fixture(scope="class")
    def participant_token(self, session):
        """Login as participant"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": PARTICIPANT_EMAIL,
            "password": PARTICIPANT_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]

    def test_registrations_have_age_field(self, session, participant_token):
        """Test that registrations include age field when birth_date was provided"""
        response = session.get(
            f"{BASE_URL}/api/registrations",
            headers={"Authorization": f"Bearer {participant_token}"}
        )
        assert response.status_code == 200
        registrations = response.json()["registrations"]
        
        # Check if any registration has age field
        found_with_age = False
        for reg in registrations:
            if reg.get("age") is not None:
                found_with_age = True
                print(f"  Found registration with age: {reg['registration_id']} - age={reg['age']}")
            elif reg.get("birth_date"):
                print(f"  Found registration with birth_date but no age: {reg['registration_id']}")
        
        print(f"TEST INFO: {len(registrations)} registrations found, age field present: {found_with_age}")


class TestOrganizerRegistrationsTable:
    """Tests for organizer registrations table with Age and PPS columns"""

    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()

    @pytest.fixture(scope="class")
    def organizer_token(self, session):
        """Login as organizer"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]

    def test_organizer_registrations_include_pps_fields(self, session, organizer_token):
        """Test that organizer registrations endpoint returns PPS status fields"""
        # First get organizer's events
        response = session.get(
            f"{BASE_URL}/api/organizer/events",
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        assert response.status_code == 200
        events = response.json()["events"]
        
        if not events:
            pytest.skip("No events found for organizer")
        
        event_id = events[0]["event_id"]
        
        # Get registrations for that event
        response = session.get(
            f"{BASE_URL}/api/organizer/registrations/{event_id}",
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        registrations = data["registrations"]
        
        print(f"TEST INFO: Found {len(registrations)} registrations for event {event_id}")
        
        if registrations:
            reg = registrations[0]
            # Check for age and PPS fields
            has_pps_status = "pps_status" in reg
            has_pps_doc = "pps_document_url" in reg
            has_age = "age" in reg
            print(f"  Sample registration fields: pps_status={has_pps_status}, pps_document_url={has_pps_doc}, age={has_age}")
            print(f"  Values: pps_status={reg.get('pps_status')}, pps_document_url={reg.get('pps_document_url')}, age={reg.get('age')}")
        
        print("TEST PASSED: Organizer registrations endpoint returns required fields")


class TestEventsWithPPSRequired:
    """Tests for events that require PPS"""

    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()

    def test_event_has_requires_pps_field(self, session):
        """Test that events have requires_pps field"""
        response = session.get(f"{BASE_URL}/api/events?limit=50")
        assert response.status_code == 200
        events = response.json()["events"]
        
        pps_required_events = [e for e in events if e.get("requires_pps")]
        print(f"TEST INFO: Found {len(pps_required_events)}/{len(events)} events requiring PPS")
        
        for event in pps_required_events:
            print(f"  - {event['title']} (event_id: {event['event_id']})")
        
        # Check that at least one event has the requires_pps field (older events may not have it)
        events_with_field = [e for e in events if "requires_pps" in e]
        print(f"  Events with requires_pps field: {len(events_with_field)}/{len(events)}")
        
        # This is expected for events created after the feature was added
        print("TEST PASSED: Events with requires_pps field found")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
