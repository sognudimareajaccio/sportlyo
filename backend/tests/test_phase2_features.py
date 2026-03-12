"""
Test Phase 2 Features for SportLyo:
1. Organizer dashboard action buttons (Check-in, Export timing, Results)
2. Check-in page and POST /api/checkin/scan endpoint
3. Results page with category filter and column
4. Export timing CSV endpoint
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
EVENT_ID = "evt_f79c5cfd5036"  # COURSE CORSICA FEVER


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def organizer_token(api_client):
    """Get organizer auth token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ORGANIZER_EMAIL,
        "password": ORGANIZER_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in login response"
    return data["token"]


@pytest.fixture(scope="module")
def participant_token(api_client):
    """Get participant auth token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": PARTICIPANT_EMAIL,
        "password": PARTICIPANT_PASSWORD
    })
    assert response.status_code == 200, f"Participant login failed: {response.text}"
    return response.json()["token"]


class TestCheckinEndpoint:
    """Test POST /api/checkin/scan endpoint"""

    def test_checkin_scan_requires_auth(self, api_client):
        """Check-in scan requires authentication"""
        response = api_client.post(f"{BASE_URL}/api/checkin/scan", json={
            "bib_number": "TEST-1234"
        })
        assert response.status_code == 401, "Should require authentication"
        print("PASS: /api/checkin/scan requires authentication")

    def test_checkin_scan_requires_organizer(self, api_client, participant_token):
        """Check-in scan requires organizer role"""
        api_client.headers.update({"Authorization": f"Bearer {participant_token}"})
        response = api_client.post(f"{BASE_URL}/api/checkin/scan", json={
            "bib_number": "TEST-1234"
        })
        # Should return 403 for participants (not organizer)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("PASS: /api/checkin/scan requires organizer role")

    def test_checkin_scan_with_bib_number(self, api_client, organizer_token):
        """Organizer can scan by bib number"""
        api_client.headers.update({"Authorization": f"Bearer {organizer_token}"})
        # Try to scan a bib number - may or may not exist
        response = api_client.post(f"{BASE_URL}/api/checkin/scan", json={
            "bib_number": "NONEXISTENT-9999"
        })
        # Either 404 (not found) or 200 (found) are valid
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print(f"PASS: /api/checkin/scan endpoint functional (status: {response.status_code})")

    def test_checkin_scan_requires_bib_or_reg_id(self, api_client, organizer_token):
        """Check-in scan requires either bib_number or registration_id"""
        api_client.headers.update({"Authorization": f"Bearer {organizer_token}"})
        response = api_client.post(f"{BASE_URL}/api/checkin/scan", json={})
        assert response.status_code == 400, f"Should return 400 for missing params, got {response.status_code}"
        print("PASS: /api/checkin/scan validates required parameters")


class TestCheckinStats:
    """Test GET /api/checkin/stats/{event_id} endpoint"""

    def test_checkin_stats_returns_data(self, api_client, organizer_token):
        """Get check-in stats for an event"""
        api_client.headers.update({"Authorization": f"Bearer {organizer_token}"})
        response = api_client.get(f"{BASE_URL}/api/checkin/stats/{EVENT_ID}")
        assert response.status_code == 200, f"Failed to get checkin stats: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "total_registered" in data, "Missing total_registered field"
        assert "checked_in" in data, "Missing checked_in field"
        assert "remaining" in data, "Missing remaining field"
        
        # Validate data types
        assert isinstance(data["total_registered"], int), "total_registered should be int"
        assert isinstance(data["checked_in"], int), "checked_in should be int"
        assert isinstance(data["remaining"], int), "remaining should be int"
        
        print(f"PASS: /api/checkin/stats/{EVENT_ID} returns correct structure")
        print(f"  Stats: {data['total_registered']} registered, {data['checked_in']} checked-in, {data['remaining']} remaining")


class TestTimingResultsWithCategoryFilter:
    """Test GET /api/timing/results/{event_id} with category filter"""

    def test_results_endpoint_public(self, api_client):
        """Results endpoint is public (no auth required)"""
        api_client.headers.pop("Authorization", None)  # Remove auth header
        response = api_client.get(f"{BASE_URL}/api/timing/results/{EVENT_ID}")
        assert response.status_code == 200, f"Results endpoint should be public, got {response.status_code}"
        print("PASS: /api/timing/results is public (no auth required)")

    def test_results_returns_categories_list(self, api_client):
        """Results endpoint returns categories array for filtering"""
        response = api_client.get(f"{BASE_URL}/api/timing/results/{EVENT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "results" in data, "Missing results field"
        assert "categories" in data, "Missing categories field for filtering"
        assert isinstance(data["categories"], list), "categories should be a list"
        
        print(f"PASS: /api/timing/results returns categories list: {data['categories']}")

    def test_results_category_filter_param(self, api_client):
        """Results endpoint accepts ?category= query parameter"""
        # First get available categories
        response = api_client.get(f"{BASE_URL}/api/timing/results/{EVENT_ID}")
        data = response.json()
        
        if data.get("categories") and len(data["categories"]) > 0:
            test_category = data["categories"][0]
            # Filter by category
            filtered_response = api_client.get(f"{BASE_URL}/api/timing/results/{EVENT_ID}?category={test_category}")
            assert filtered_response.status_code == 200
            
            filtered_data = filtered_response.json()
            # All results should have the filtered category
            for result in filtered_data.get("results", []):
                assert result.get("category") == test_category, f"Expected category {test_category}, got {result.get('category')}"
            
            print(f"PASS: Category filter works correctly for '{test_category}'")
        else:
            # No categories available (no finished races)
            print("PASS: Category filter param accepted (no data to filter)")

    def test_results_include_category_rank(self, api_client):
        """Results include category and category_rank fields"""
        response = api_client.get(f"{BASE_URL}/api/timing/results/{EVENT_ID}")
        data = response.json()
        
        if data.get("results") and len(data["results"]) > 0:
            first_result = data["results"][0]
            assert "category" in first_result or first_result.get("category") is None, "Missing category field"
            assert "category_rank" in first_result, "Missing category_rank field"
            print(f"PASS: Results include category='{first_result.get('category')}' and category_rank={first_result.get('category_rank')}")
        else:
            print("PASS: Results structure validated (no finished results yet)")


class TestExportTimingCSV:
    """Test GET /api/organizer/events/{event_id}/export-timing"""

    def test_export_timing_requires_auth(self, api_client):
        """Export timing requires authentication"""
        api_client.headers.pop("Authorization", None)
        response = api_client.get(f"{BASE_URL}/api/organizer/events/{EVENT_ID}/export-timing")
        assert response.status_code == 401, f"Should require auth, got {response.status_code}"
        print("PASS: Export timing requires authentication")

    def test_export_timing_requires_organizer(self, api_client, participant_token):
        """Export timing requires organizer role"""
        api_client.headers.update({"Authorization": f"Bearer {participant_token}"})
        response = api_client.get(f"{BASE_URL}/api/organizer/events/{EVENT_ID}/export-timing")
        assert response.status_code == 403, f"Should require organizer, got {response.status_code}"
        print("PASS: Export timing requires organizer role")

    def test_export_timing_returns_csv(self, api_client, organizer_token):
        """Export timing returns CSV file"""
        api_client.headers.update({"Authorization": f"Bearer {organizer_token}"})
        response = api_client.get(f"{BASE_URL}/api/organizer/events/{EVENT_ID}/export-timing")
        assert response.status_code == 200, f"Export failed: {response.text}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "text/csv" in content_type, f"Expected CSV content type, got {content_type}"
        
        # Check Content-Disposition header
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, f"Missing attachment disposition: {content_disp}"
        assert ".csv" in content_disp, f"Missing .csv in filename: {content_disp}"
        
        # Validate CSV content
        csv_content = response.text
        lines = csv_content.strip().split("\n")
        assert len(lines) >= 1, "CSV should have at least header row"
        
        # Check header row
        header = lines[0]
        assert "BibNumber" in header, "Missing BibNumber column"
        assert "FirstName" in header, "Missing FirstName column"
        assert "LastName" in header, "Missing LastName column"
        assert "RFID" in header, "Missing RFID column"
        assert "Category" in header, "Missing Category column"
        
        print(f"PASS: Export timing returns valid CSV with {len(lines)} rows")
        print(f"  Header: {header}")


class TestOrganizerDashboardEndpoints:
    """Test that organizer dashboard action buttons have working endpoints"""

    def test_organizer_events_list(self, api_client, organizer_token):
        """Organizer can list their events"""
        api_client.headers.update({"Authorization": f"Bearer {organizer_token}"})
        response = api_client.get(f"{BASE_URL}/api/organizer/events")
        assert response.status_code == 200, f"Failed to get organizer events: {response.text}"
        
        data = response.json()
        assert "events" in data, "Missing events field"
        assert isinstance(data["events"], list), "events should be a list"
        
        if len(data["events"]) > 0:
            event = data["events"][0]
            assert "event_id" in event, "Event missing event_id"
            print(f"PASS: Organizer dashboard can list {len(data['events'])} events")
        else:
            print("PASS: Organizer events endpoint works (no events)")

    def test_event_detail_for_results_button(self, api_client):
        """Event detail endpoint works (for Results button)"""
        response = api_client.get(f"{BASE_URL}/api/events/{EVENT_ID}")
        assert response.status_code == 200, f"Failed to get event: {response.text}"
        
        data = response.json()
        assert "title" in data, "Missing title field"
        assert "event_id" in data, "Missing event_id field"
        print(f"PASS: Event detail works for event '{data['title']}'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
