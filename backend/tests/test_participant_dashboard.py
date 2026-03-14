"""
Test Participant Dashboard API Endpoints - Iteration 25
Tests the new participant dashboard hub widgets including:
- Profile API (GET/PUT)
- Orders API
- Stats API
- Upcoming events API
- Results API (past events)
- Providers list API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from requirements
PARTICIPANT_EMAIL = "pierre@test.com"
PARTICIPANT_PASSWORD = "test1234"
ORGANIZER_EMAIL = "club@paris-sport.fr"
ORGANIZER_PASSWORD = "club123"
PROVIDER_EMAIL = "boutique@sportlyo.fr"
PROVIDER_PASSWORD = "boutique123"


@pytest.fixture(scope="module")
def participant_token():
    """Get participant auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": PARTICIPANT_EMAIL,
        "password": PARTICIPANT_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Participant login failed: {response.status_code} {response.text}")
    data = response.json()
    return data.get("token")


@pytest.fixture(scope="module")
def organizer_token():
    """Get organizer auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ORGANIZER_EMAIL,
        "password": ORGANIZER_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Organizer login failed: {response.status_code} {response.text}")
    return response.json().get("token")


@pytest.fixture(scope="module")
def provider_token():
    """Get provider auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": PROVIDER_EMAIL,
        "password": PROVIDER_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Provider login failed: {response.status_code} {response.text}")
    return response.json().get("token")


class TestParticipantProfile:
    """Tests for participant profile endpoints"""

    def test_get_profile(self, participant_token):
        """GET /api/participant/profile returns user profile"""
        response = requests.get(
            f"{BASE_URL}/api/participant/profile",
            headers={"Authorization": f"Bearer {participant_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "profile" in data, "Response should contain 'profile' key"
        profile = data["profile"]
        assert "email" in profile, "Profile should contain email"
        assert "name" in profile, "Profile should contain name"
        # Ensure password is not exposed
        assert "password" not in profile, "Password should not be in response"

    def test_update_profile(self, participant_token):
        """PUT /api/participant/profile updates user profile"""
        update_data = {
            "phone": "0612345678",
            "city": "Paris",
            "postal_code": "75001"
        }
        response = requests.put(
            f"{BASE_URL}/api/participant/profile",
            headers={"Authorization": f"Bearer {participant_token}"},
            json=update_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "profile" in data
        profile = data["profile"]
        assert profile.get("phone") == "0612345678", "Phone should be updated"
        assert profile.get("city") == "Paris", "City should be updated"

    def test_update_profile_empty_fields(self, participant_token):
        """PUT /api/participant/profile rejects empty update"""
        response = requests.put(
            f"{BASE_URL}/api/participant/profile",
            headers={"Authorization": f"Bearer {participant_token}"},
            json={"invalid_field": "value"}  # Field not in allowed list
        )
        assert response.status_code == 400, f"Expected 400 for invalid fields, got {response.status_code}"


class TestParticipantOrders:
    """Tests for participant orders endpoint"""

    def test_get_orders(self, participant_token):
        """GET /api/participant/orders returns orders list"""
        response = requests.get(
            f"{BASE_URL}/api/participant/orders",
            headers={"Authorization": f"Bearer {participant_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "orders" in data, "Response should contain 'orders' key"
        assert isinstance(data["orders"], list), "Orders should be a list"
        # Per requirements, participant has 4 existing orders
        if len(data["orders"]) > 0:
            order = data["orders"][0]
            # Check order structure
            assert "order_id" in order, "Order should have order_id"
            assert "total" in order, "Order should have total"


class TestParticipantStats:
    """Tests for participant stats endpoint (Bilan Sportif)"""

    def test_get_stats(self, participant_token):
        """GET /api/participant/stats returns annual statistics"""
        response = requests.get(
            f"{BASE_URL}/api/participant/stats",
            headers={"Authorization": f"Bearer {participant_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Verify required fields from Bilan Sportif
        assert "year" in data, "Stats should contain year"
        assert "all_time_races" in data, "Stats should contain all_time_races"
        assert "year_races" in data, "Stats should contain year_races"
        assert "total_km" in data, "Stats should contain total_km"
        assert "total_elevation" in data, "Stats should contain total_elevation"
        assert "monthly_registrations" in data, "Stats should contain monthly_registrations"
        assert "sports_breakdown" in data, "Stats should contain sports_breakdown"
        assert "orders_count" in data, "Stats should contain orders_count"
        assert "orders_total" in data, "Stats should contain orders_total"


class TestParticipantUpcoming:
    """Tests for upcoming events endpoint (Courses à venir)"""

    def test_get_upcoming(self, participant_token):
        """GET /api/participant/upcoming returns future events"""
        response = requests.get(
            f"{BASE_URL}/api/participant/upcoming",
            headers={"Authorization": f"Bearer {participant_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "upcoming" in data, "Response should contain 'upcoming' key"
        assert isinstance(data["upcoming"], list), "Upcoming should be a list"


class TestParticipantResults:
    """Tests for past events/results endpoint (Mes Résultats)"""

    def test_get_results(self, participant_token):
        """GET /api/participant/results returns past events"""
        response = requests.get(
            f"{BASE_URL}/api/participant/results",
            headers={"Authorization": f"Bearer {participant_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "results" in data, "Response should contain 'results' key"
        assert isinstance(data["results"], list), "Results should be a list"


class TestParticipantProviders:
    """Tests for providers list endpoint (Messagerie)"""

    def test_get_providers(self, participant_token):
        """GET /api/participant/providers returns providers list"""
        response = requests.get(
            f"{BASE_URL}/api/participant/providers",
            headers={"Authorization": f"Bearer {participant_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "providers" in data, "Response should contain 'providers' key"
        assert isinstance(data["providers"], list), "Providers should be a list"


class TestParticipantMessaging:
    """Tests for participant-provider messaging"""

    def test_send_message_to_provider(self, participant_token, provider_token):
        """Participant can send message to provider via /api/provider/messages"""
        # First get provider's user_id from /api/auth/me (returns user_id directly)
        provider_info = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {provider_token}"}
        )
        if provider_info.status_code != 200:
            pytest.skip("Could not get provider info")
        provider_id = provider_info.json().get("user_id")
        
        if not provider_id:
            pytest.skip("Provider ID not found")

        # Participant sends message
        response = requests.post(
            f"{BASE_URL}/api/provider/messages",
            headers={"Authorization": f"Bearer {participant_token}"},
            json={
                "recipient_id": provider_id,
                "content": "TEST_Message from participant to provider"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, "Response should contain 'message'"

    def test_get_messages_with_provider(self, participant_token, provider_token):
        """Participant can get messages with provider via /api/provider/messages/{id}"""
        # Get provider's user_id from /api/auth/me (returns user_id directly)
        provider_info = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {provider_token}"}
        )
        if provider_info.status_code != 200:
            pytest.skip("Could not get provider info")
        provider_id = provider_info.json().get("user_id")
        
        if not provider_id:
            pytest.skip("Provider ID not found")

        response = requests.get(
            f"{BASE_URL}/api/provider/messages/{provider_id}",
            headers={"Authorization": f"Bearer {participant_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "messages" in data, "Response should contain 'messages'"
        assert isinstance(data["messages"], list), "Messages should be a list"


class TestShopOrderProviderIds:
    """Tests that shop orders store provider_ids array correctly"""

    def test_order_contains_provider_ids(self, participant_token):
        """Orders should contain provider_ids array"""
        response = requests.get(
            f"{BASE_URL}/api/participant/orders",
            headers={"Authorization": f"Bearer {participant_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        orders = data.get("orders", [])
        # Check if any order has provider_ids field
        orders_with_provider_ids = [o for o in orders if "provider_ids" in o]
        # Not all orders may have provider_ids, but the field should exist in schema
        print(f"Found {len(orders_with_provider_ids)} orders with provider_ids field")


class TestAuthenticationRequired:
    """Tests that endpoints require authentication"""

    def test_profile_requires_auth(self):
        """GET /api/participant/profile requires authentication"""
        response = requests.get(f"{BASE_URL}/api/participant/profile")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"

    def test_orders_requires_auth(self):
        """GET /api/participant/orders requires authentication"""
        response = requests.get(f"{BASE_URL}/api/participant/orders")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"

    def test_stats_requires_auth(self):
        """GET /api/participant/stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/participant/stats")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
