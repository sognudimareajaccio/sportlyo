"""
Iteration 24: Testing new features
- Logo upload (POST/GET /api/organizer/logo)
- Corporate bookings CRUD (POST/GET/PUT/DELETE /api/organizer/bookings)
- Payment link generation (POST /api/payments/create-link)
- Provider organizer-logos endpoint (GET /api/provider/organizer-logos)
- Providers list endpoint (GET /api/providers/list)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ORGANIZER_EMAIL = "club@paris-sport.fr"
ORGANIZER_PASS = "club123"
PROVIDER_EMAIL = "boutique@sportlyo.fr"
PROVIDER_PASS = "boutique123"

class TestNewFeatures:
    """Test iteration 24 new features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_organizer_token(self):
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASS
        })
        if response.status_code != 200:
            pytest.skip(f"Organizer login failed: {response.text}")
        return response.json().get("token")
    
    def get_provider_token(self):
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": PROVIDER_EMAIL,
            "password": PROVIDER_PASS
        })
        if response.status_code != 200:
            pytest.skip(f"Provider login failed: {response.text}")
        return response.json().get("token")
    
    # ============ Logo Endpoints ============
    
    def test_organizer_logo_get(self):
        """GET /api/organizer/logo - should return logo_url (can be empty)"""
        token = self.get_organizer_token()
        response = self.session.get(f"{BASE_URL}/api/organizer/logo", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "logo_url" in data
        print(f"✅ GET /api/organizer/logo - Success. logo_url: {data.get('logo_url', '')[:50]}")
    
    def test_organizer_logo_post(self):
        """POST /api/organizer/logo - should save logo_url"""
        token = self.get_organizer_token()
        test_logo_url = "https://example.com/test-logo.png"
        response = self.session.post(f"{BASE_URL}/api/organizer/logo", headers={
            "Authorization": f"Bearer {token}"
        }, json={"logo_url": test_logo_url})
        assert response.status_code == 200
        data = response.json()
        assert "logo_url" in data
        assert data["logo_url"] == test_logo_url
        print(f"✅ POST /api/organizer/logo - Success. Logo saved.")
    
    def test_organizer_logo_post_requires_url(self):
        """POST /api/organizer/logo - should fail without logo_url"""
        token = self.get_organizer_token()
        response = self.session.post(f"{BASE_URL}/api/organizer/logo", headers={
            "Authorization": f"Bearer {token}"
        }, json={})
        assert response.status_code == 400
        print("✅ POST /api/organizer/logo - Correctly rejects empty logo_url")
    
    # ============ Provider Organizer Logos ============
    
    def test_provider_organizer_logos(self):
        """GET /api/provider/organizer-logos - provider sees organizer logos"""
        token = self.get_provider_token()
        response = self.session.get(f"{BASE_URL}/api/provider/organizer-logos", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "organizers" in data
        print(f"✅ GET /api/provider/organizer-logos - Success. Found {len(data['organizers'])} organizer(s) with logos")
    
    # ============ Providers List ============
    
    def test_providers_list(self):
        """GET /api/providers/list - organizer sees list of providers"""
        token = self.get_organizer_token()
        response = self.session.get(f"{BASE_URL}/api/providers/list", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "providers" in data
        print(f"✅ GET /api/providers/list - Success. Found {len(data['providers'])} provider(s)")
    
    # ============ Corporate Bookings CRUD ============
    
    def test_bookings_get_empty(self):
        """GET /api/organizer/bookings - should return bookings list"""
        token = self.get_organizer_token()
        response = self.session.get(f"{BASE_URL}/api/organizer/bookings", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "bookings" in data
        print(f"✅ GET /api/organizer/bookings - Success. Found {len(data['bookings'])} booking(s)")
    
    def test_bookings_create(self):
        """POST /api/organizer/bookings - create corporate booking"""
        token = self.get_organizer_token()
        booking_data = {
            "company_name": "TEST_Acme Corp",
            "contact_name": "John Doe",
            "email": "john@acme.com",
            "phone": "0123456789",
            "team_count": 3,
            "members_per_team": 5,
            "price_per_team": 150,
            "notes": "Test booking"
        }
        response = self.session.post(f"{BASE_URL}/api/organizer/bookings", headers={
            "Authorization": f"Bearer {token}"
        }, json=booking_data)
        assert response.status_code == 200
        data = response.json()
        assert "booking" in data
        assert data["booking"]["company_name"] == "TEST_Acme Corp"
        assert data["booking"]["team_count"] == 3
        assert data["booking"]["total_amount"] == 450  # 3 * 150
        print(f"✅ POST /api/organizer/bookings - Success. booking_id: {data['booking']['booking_id']}")
        return data["booking"]["booking_id"]
    
    def test_bookings_update(self):
        """PUT /api/organizer/bookings/{id} - update corporate booking"""
        token = self.get_organizer_token()
        # First create a booking
        booking_id = self.test_bookings_create()
        
        # Update it
        update_data = {
            "company_name": "TEST_Acme Corp Updated",
            "team_count": 5,
            "price_per_team": 200
        }
        response = self.session.put(f"{BASE_URL}/api/organizer/bookings/{booking_id}", headers={
            "Authorization": f"Bearer {token}"
        }, json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["booking"]["company_name"] == "TEST_Acme Corp Updated"
        assert data["booking"]["team_count"] == 5
        assert data["booking"]["total_amount"] == 1000  # 5 * 200
        print(f"✅ PUT /api/organizer/bookings/{booking_id} - Success. Updated booking.")
        return booking_id
    
    def test_bookings_delete(self):
        """DELETE /api/organizer/bookings/{id} - delete corporate booking"""
        token = self.get_organizer_token()
        # First create a booking
        create_resp = self.session.post(f"{BASE_URL}/api/organizer/bookings", headers={
            "Authorization": f"Bearer {token}"
        }, json={
            "company_name": "TEST_ToDelete Corp",
            "team_count": 1,
            "price_per_team": 100
        })
        booking_id = create_resp.json()["booking"]["booking_id"]
        
        # Delete it
        response = self.session.delete(f"{BASE_URL}/api/organizer/bookings/{booking_id}", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        print(f"✅ DELETE /api/organizer/bookings/{booking_id} - Success. Booking deleted.")
    
    # ============ Payment Link Generation ============
    
    def test_payment_link_create_booking(self):
        """POST /api/payments/create-link - generate payment link for booking"""
        token = self.get_organizer_token()
        # First create a booking
        create_resp = self.session.post(f"{BASE_URL}/api/organizer/bookings", headers={
            "Authorization": f"Bearer {token}"
        }, json={
            "company_name": "TEST_PayLink Corp",
            "team_count": 2,
            "price_per_team": 250
        })
        booking_id = create_resp.json()["booking"]["booking_id"]
        
        # Generate payment link
        response = self.session.post(f"{BASE_URL}/api/payments/create-link", headers={
            "Authorization": f"Bearer {token}"
        }, json={
            "type": "booking",
            "source_id": booking_id,
            "amount": 500,
            "description": "Test payment link"
        })
        assert response.status_code == 200
        data = response.json()
        assert "payment_url" in data
        assert "link_id" in data
        assert len(data["payment_url"]) > 0
        print(f"✅ POST /api/payments/create-link (booking) - Success. URL: {data['payment_url'][:60]}...")
        return booking_id
    
    def test_payment_link_create_sponsor(self):
        """POST /api/payments/create-link - generate payment link for sponsor"""
        token = self.get_organizer_token()
        
        # First create a sponsor
        sponsor_resp = self.session.post(f"{BASE_URL}/api/organizer/sponsors", headers={
            "Authorization": f"Bearer {token}"
        }, json={
            "name": "TEST_PayLink Sponsor",
            "sponsor_type": "Sponsor",
            "tier": "Gold",
            "amount": 1000
        })
        
        # Check if sponsor was created
        if sponsor_resp.status_code == 200:
            sponsor_id = sponsor_resp.json()["sponsor"]["sponsor_id"]
        else:
            # Use a fake sponsor_id for the test (won't update sponsor but will generate link)
            sponsor_id = "test_sponsor_123"
        
        # Generate payment link
        response = self.session.post(f"{BASE_URL}/api/payments/create-link", headers={
            "Authorization": f"Bearer {token}"
        }, json={
            "type": "sponsor",
            "source_id": sponsor_id,
            "amount": 1000,
            "description": "Test sponsor payment link"
        })
        assert response.status_code == 200
        data = response.json()
        assert "payment_url" in data
        assert "link_id" in data
        print(f"✅ POST /api/payments/create-link (sponsor) - Success. URL generated.")
    
    def test_payment_link_requires_amount(self):
        """POST /api/payments/create-link - should fail without amount"""
        token = self.get_organizer_token()
        response = self.session.post(f"{BASE_URL}/api/payments/create-link", headers={
            "Authorization": f"Bearer {token}"
        }, json={
            "type": "booking",
            "source_id": "test_123"
        })
        assert response.status_code == 400
        print("✅ POST /api/payments/create-link - Correctly rejects missing amount")


class TestCleanup:
    """Cleanup TEST_ prefixed data"""
    
    def test_cleanup_test_bookings(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as organizer
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASS
        })
        if login_resp.status_code != 200:
            pytest.skip("Cannot login for cleanup")
        token = login_resp.json().get("token")
        
        # Get all bookings
        bookings_resp = session.get(f"{BASE_URL}/api/organizer/bookings", headers={
            "Authorization": f"Bearer {token}"
        })
        if bookings_resp.status_code == 200:
            bookings = bookings_resp.json().get("bookings", [])
            for b in bookings:
                if b.get("company_name", "").startswith("TEST_"):
                    session.delete(f"{BASE_URL}/api/organizer/bookings/{b['booking_id']}", headers={
                        "Authorization": f"Bearer {token}"
                    })
                    print(f"Cleaned up booking: {b['booking_id']}")
        print("✅ Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
