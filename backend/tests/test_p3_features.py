"""
P3 Features Backend Tests - Iteration 38
- Invoice PDF generation with organizer branding
- RFID Admin Management (equipment CRUD, rental management)
- SMS Templates and recipients count
- Check-in stats API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@sportsconnect.fr"
ADMIN_PASSWORD = "admin123"
ORGANIZER_EMAIL = "club@paris-sport.fr"
ORGANIZER_PASSWORD = "club123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin login failed: {response.status_code}")


@pytest.fixture(scope="module")
def organizer_token():
    """Get organizer authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ORGANIZER_EMAIL,
        "password": ORGANIZER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Organizer login failed: {response.status_code}")


class TestInvoicePDF:
    """Test invoice PDF generation with organizer branding"""
    
    def test_get_admin_invoices_list(self, admin_token):
        """Admin should see all invoices"""
        response = requests.get(
            f"{BASE_URL}/api/admin/invoices",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "invoices" in data
        assert "total_count" in data
        assert "total_amount" in data
        print(f"Found {data['total_count']} invoices, total amount: {data['total_amount']}€")
    
    def test_download_invoice_pdf(self, admin_token):
        """Test PDF download for first available invoice"""
        # First get list of invoices
        list_response = requests.get(
            f"{BASE_URL}/api/admin/invoices",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert list_response.status_code == 200
        invoices = list_response.json().get("invoices", [])
        
        if not invoices:
            pytest.skip("No invoices available for PDF test")
        
        invoice_id = invoices[0]["invoice_id"]
        
        # Download PDF
        pdf_response = requests.get(
            f"{BASE_URL}/api/invoices/{invoice_id}/pdf",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert pdf_response.status_code == 200, f"PDF download failed: {pdf_response.status_code}"
        assert pdf_response.headers.get("content-type") == "application/pdf"
        assert "attachment" in pdf_response.headers.get("content-disposition", "")
        print(f"Successfully downloaded PDF for invoice {invoice_id}")


class TestRFIDAdminManagement:
    """Test RFID equipment and rental management"""
    
    def test_get_rfid_equipment_list(self):
        """Public: List available RFID equipment"""
        response = requests.get(f"{BASE_URL}/api/rfid/equipment")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "equipment" in data
        print(f"Found {len(data['equipment'])} RFID equipment items")
    
    def test_get_rfid_stats_admin(self, admin_token):
        """Admin: Get RFID statistics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rfid/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "total_equipment" in data
        assert "total_rentals" in data
        assert "pending_rentals" in data
        assert "confirmed_rentals" in data
        assert "total_revenue" in data
        print(f"RFID Stats: {data['total_equipment']} equipment, {data['pending_rentals']} pending rentals")
    
    def test_get_rfid_rentals_admin(self, admin_token):
        """Admin: Get all rental requests"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rfid/rentals",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "rentals" in data
        print(f"Found {len(data['rentals'])} RFID rental requests")
    
    def test_create_rfid_equipment_admin(self, admin_token):
        """Admin: Create new RFID equipment"""
        new_equipment = {
            "name": "TEST_Lecteur RFID Portable",
            "description": "Lecteur portable pour verification sur le terrain",
            "category": "chronometrage",
            "daily_rate": 50,
            "quantity_total": 3,
            "image_url": ""
        }
        response = requests.post(
            f"{BASE_URL}/api/rfid/equipment",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=new_equipment
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "equipment" in data
        assert data["equipment"]["name"] == new_equipment["name"]
        assert data["equipment"]["daily_rate"] == new_equipment["daily_rate"]
        print(f"Created equipment: {data['equipment']['equipment_id']}")
        return data["equipment"]["equipment_id"]
    
    def test_update_rfid_equipment_admin(self, admin_token):
        """Admin: Update RFID equipment"""
        # First create one
        create_response = requests.post(
            f"{BASE_URL}/api/rfid/equipment",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "TEST_Update Equipment", "daily_rate": 25, "quantity_total": 1}
        )
        if create_response.status_code != 200:
            pytest.skip("Could not create equipment for update test")
        
        equip_id = create_response.json()["equipment"]["equipment_id"]
        
        # Update it
        update_response = requests.put(
            f"{BASE_URL}/api/rfid/equipment/{equip_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "TEST_Updated Equipment Name", "daily_rate": 35}
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.status_code}"
        data = update_response.json()
        assert data["equipment"]["daily_rate"] == 35
        print(f"Updated equipment {equip_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/rfid/equipment/{equip_id}", headers={"Authorization": f"Bearer {admin_token}"})
    
    def test_delete_rfid_equipment_admin(self, admin_token):
        """Admin: Delete RFID equipment"""
        # First create one
        create_response = requests.post(
            f"{BASE_URL}/api/rfid/equipment",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "TEST_Delete Equipment", "daily_rate": 10, "quantity_total": 1}
        )
        if create_response.status_code != 200:
            pytest.skip("Could not create equipment for delete test")
        
        equip_id = create_response.json()["equipment"]["equipment_id"]
        
        # Delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/rfid/equipment/{equip_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.status_code}"
        print(f"Deleted equipment {equip_id}")
    
    def test_process_rfid_rental_admin(self, admin_token):
        """Admin: Process (confirm/reject) a rental request"""
        # Get existing rentals
        rentals_response = requests.get(
            f"{BASE_URL}/api/admin/rfid/rentals",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        rentals = rentals_response.json().get("rentals", [])
        pending = [r for r in rentals if r.get("status") == "pending"]
        
        if not pending:
            pytest.skip("No pending rentals to process")
        
        rental_id = pending[0]["rental_id"]
        
        # Confirm it
        process_response = requests.put(
            f"{BASE_URL}/api/admin/rfid/rentals/{rental_id}/process",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "confirmed"}
        )
        assert process_response.status_code == 200, f"Process rental failed: {process_response.status_code}"
        print(f"Confirmed rental {rental_id}")


class TestSMSFeatures:
    """Test SMS templates and recipients count"""
    
    def test_get_sms_templates_organizer(self, organizer_token):
        """Organizer: Get predefined SMS templates"""
        response = requests.get(
            f"{BASE_URL}/api/sms/templates",
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "templates" in data
        assert len(data["templates"]) > 0, "Should have at least one template"
        
        # Verify template structure
        template = data["templates"][0]
        assert "id" in template
        assert "name" in template
        assert "message" in template
        print(f"Found {len(data['templates'])} SMS templates: {[t['name'] for t in data['templates']]}")
    
    def test_get_sms_recipients_count(self, organizer_token):
        """Organizer: Get recipients count for an event"""
        # First get organizer's events
        events_response = requests.get(
            f"{BASE_URL}/api/organizer/events",
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        events = events_response.json().get("events", [])
        
        if not events:
            pytest.skip("No events for SMS recipients test")
        
        event_id = events[0]["event_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/sms/recipients-count/{event_id}",
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "total" in data
        assert "with_phone" in data
        print(f"Event {event_id}: {data['total']} total participants, {data['with_phone']} with phone")
    
    def test_get_sms_history(self, organizer_token):
        """Organizer: Get SMS notification history"""
        response = requests.get(
            f"{BASE_URL}/api/sms/history",
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "history" in data
        print(f"Found {len(data['history'])} SMS history entries")


class TestCheckInFeatures:
    """Test check-in day-J features"""
    
    def test_get_checkin_stats(self, organizer_token):
        """Organizer: Get check-in statistics for an event"""
        # First get organizer's events
        events_response = requests.get(
            f"{BASE_URL}/api/organizer/events",
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        events = events_response.json().get("events", [])
        
        if not events:
            pytest.skip("No events for check-in stats test")
        
        event_id = events[0]["event_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/checkin/stats/{event_id}",
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "total" in data
        assert "checked_in" in data
        assert "remaining" in data
        assert "percentage" in data
        print(f"Check-in stats for {event_id}: {data['checked_in']}/{data['total']} ({data['percentage']}%)")
    
    def test_checkin_search(self, organizer_token):
        """Organizer: Search participants for check-in"""
        events_response = requests.get(
            f"{BASE_URL}/api/organizer/events",
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        events = events_response.json().get("events", [])
        
        if not events:
            pytest.skip("No events for check-in search test")
        
        event_id = events[0]["event_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/checkin/search/{event_id}?q=test",
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "results" in data
        print(f"Check-in search returned {len(data['results'])} results")


# Cleanup test data after all tests
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data(admin_token):
    """Cleanup TEST_ prefixed equipment after tests"""
    yield
    # Cleanup
    try:
        response = requests.get(f"{BASE_URL}/api/rfid/equipment")
        equipment = response.json().get("equipment", [])
        for eq in equipment:
            if eq.get("name", "").startswith("TEST_"):
                requests.delete(
                    f"{BASE_URL}/api/rfid/equipment/{eq['equipment_id']}",
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
    except:
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
