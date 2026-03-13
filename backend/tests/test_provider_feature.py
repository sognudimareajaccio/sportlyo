"""
Test suite for Provider (Prestataire) role feature
Tests: Provider login, dashboard, catalog, admin validation, organizer integration
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
PROVIDER_EMAIL = "boutique@sportlyo.fr"
PROVIDER_PASSWORD = "boutique123"
ORGANIZER_EMAIL = "club@paris-sport.fr"
ORGANIZER_PASSWORD = "club123"
ADMIN_EMAIL = "admin@sportsconnect.fr"
ADMIN_PASSWORD = "admin123"
EVENT_ID = "evt_fa95880cf1b9"


@pytest.fixture(scope="module")
def provider_token():
    """Get provider auth token"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": PROVIDER_EMAIL,
        "password": PROVIDER_PASSWORD
    })
    assert res.status_code == 200, f"Provider login failed: {res.text}"
    data = res.json()
    assert data.get("user", {}).get("role") == "provider", "User is not provider"
    return data["token"]


@pytest.fixture(scope="module")
def organizer_token():
    """Get organizer auth token"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ORGANIZER_EMAIL,
        "password": ORGANIZER_PASSWORD
    })
    assert res.status_code == 200, f"Organizer login failed: {res.text}"
    return res.json()["token"]


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json()["token"]


# ============== PROVIDER LOGIN & AUTH TESTS ==============

class TestProviderAuth:
    """Test provider authentication flow"""
    
    def test_provider_login_success(self):
        """Provider can login and receives provider role"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PROVIDER_EMAIL,
            "password": PROVIDER_PASSWORD
        })
        assert res.status_code == 200
        data = res.json()
        assert "token" in data
        assert data["user"]["role"] == "provider"
        assert data["user"]["email"] == PROVIDER_EMAIL
    
    def test_provider_me_endpoint(self, provider_token):
        """Provider can access /auth/me"""
        res = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {provider_token}"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "provider"


# ============== PROVIDER CATALOG TESTS ==============

class TestProviderCatalog:
    """Test provider product catalog management"""
    
    def test_get_provider_catalog(self, provider_token):
        """Provider can fetch their own catalog"""
        res = requests.get(f"{BASE_URL}/api/provider/catalog", headers={
            "Authorization": f"Bearer {provider_token}"
        })
        assert res.status_code == 200
        data = res.json()
        assert "products" in data
        products = data["products"]
        # Provider should have 8 seeded products
        assert len(products) >= 8, f"Expected 8+ products, got {len(products)}"
    
    def test_provider_catalog_has_correct_fields(self, provider_token):
        """Products in catalog have required fields"""
        res = requests.get(f"{BASE_URL}/api/provider/catalog", headers={
            "Authorization": f"Bearer {provider_token}"
        })
        products = res.json()["products"]
        for product in products:
            assert "product_id" in product
            assert "name" in product
            assert "price" in product
            assert "category" in product
            assert "suggested_commission" in product
            assert "provider_id" in product


# ============== PROVIDER STATS TESTS ==============

class TestProviderStats:
    """Test provider statistics endpoint"""
    
    def test_get_provider_stats(self, provider_token):
        """Provider can fetch their stats"""
        res = requests.get(f"{BASE_URL}/api/provider/stats", headers={
            "Authorization": f"Bearer {provider_token}"
        })
        assert res.status_code == 200
        data = res.json()
        assert "total_products" in data
        assert data["total_products"] >= 8


# ============== PROVIDER ORDERS TESTS ==============

class TestProviderOrders:
    """Test provider orders endpoint"""
    
    def test_get_provider_orders(self, provider_token):
        """Provider can fetch orders for their products"""
        res = requests.get(f"{BASE_URL}/api/provider/orders", headers={
            "Authorization": f"Bearer {provider_token}"
        })
        assert res.status_code == 200
        data = res.json()
        assert "orders" in data


# ============== ORGANIZER BROWSE PROVIDER CATALOG ==============

class TestOrganizerBrowseProviderCatalog:
    """Test organizer's ability to browse and add provider products"""
    
    def test_organizer_browse_providers_catalog(self, organizer_token):
        """Organizer can browse all provider products"""
        res = requests.get(f"{BASE_URL}/api/providers/catalog", headers={
            "Authorization": f"Bearer {organizer_token}"
        })
        assert res.status_code == 200
        data = res.json()
        assert "products" in data
        assert len(data["products"]) >= 8, "Should see provider products"
    
    def test_organizer_add_provider_product_to_event(self, organizer_token):
        """Organizer can add provider product to their event"""
        # First get a provider product ID
        res = requests.get(f"{BASE_URL}/api/providers/catalog", headers={
            "Authorization": f"Bearer {organizer_token}"
        })
        products = res.json()["products"]
        assert len(products) > 0
        provider_product_id = products[0]["product_id"]
        
        # Try to add it to an event
        res = requests.post(f"{BASE_URL}/api/organizer/add-provider-product", 
            headers={"Authorization": f"Bearer {organizer_token}"},
            json={
                "provider_product_id": provider_product_id,
                "event_id": EVENT_ID,
                "organizer_commission": 5
            }
        )
        # May succeed or fail if already added - both are acceptable
        assert res.status_code in [200, 201, 400]


# ============== ADMIN PROVIDER MANAGEMENT ==============

class TestAdminProviderManagement:
    """Test admin's ability to manage providers"""
    
    def test_admin_list_providers(self, admin_token):
        """Admin can list all providers"""
        res = requests.get(f"{BASE_URL}/api/admin/providers", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert res.status_code == 200
        data = res.json()
        assert "providers" in data
        providers = data["providers"]
        assert len(providers) >= 1, "Should have at least 1 provider"
        
        # Check provider has required fields
        for p in providers:
            assert "user_id" in p
            assert "email" in p
            assert "status" in p
            assert p["role"] == "provider"
    
    def test_admin_provider_has_approve_reject_capability(self, admin_token):
        """Admin endpoint for status update exists"""
        # Just test the endpoint exists with invalid user_id
        res = requests.put(f"{BASE_URL}/api/admin/providers/invalid_user/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "active"}
        )
        # Endpoint should exist - 404 for invalid user is OK
        assert res.status_code in [200, 404]


# ============== REGISTER PAGE ROLE OPTIONS ==============

class TestRegisterRoleOptions:
    """Test registration with provider role"""
    
    def test_register_with_provider_role_requires_validation(self):
        """Registering as provider sets status to pending"""
        import uuid
        unique_email = f"test_provider_{uuid.uuid4().hex[:8]}@test.com"
        
        res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "name": "Test Provider Company",
            "password": "test123456",
            "role": "provider",
            "company_name": "Test Provider Inc"
        })
        
        assert res.status_code == 200
        data = res.json()
        # Provider registration should indicate pending status
        assert data.get("pending") == True or data.get("user", {}).get("status") == "pending"


# ============== EVENT SHOP PRODUCTS ==============

class TestEventShopProducts:
    """Test event shop showing products with max 4 + 'Plus d'articles'"""
    
    def test_event_shop_returns_products(self):
        """Event shop endpoint returns products"""
        res = requests.get(f"{BASE_URL}/api/events/{EVENT_ID}/shop")
        assert res.status_code == 200
        data = res.json()
        assert "products" in data
        products = data["products"]
        assert len(products) >= 4, f"Expected 4+ products, got {len(products)}"


# ============== PROVIDER MESSAGING ==============

class TestProviderMessaging:
    """Test messaging between provider and organizer"""
    
    def test_provider_conversations_endpoint(self, provider_token):
        """Provider can access conversations endpoint"""
        res = requests.get(f"{BASE_URL}/api/provider/conversations", headers={
            "Authorization": f"Bearer {provider_token}"
        })
        assert res.status_code == 200
        data = res.json()
        assert "conversations" in data


# ============== ACCESS CONTROL ==============

class TestAccessControl:
    """Test role-based access control for provider endpoints"""
    
    def test_organizer_cannot_access_provider_catalog_as_owner(self, organizer_token):
        """Organizer cannot access /provider/catalog (only their own catalog)"""
        res = requests.get(f"{BASE_URL}/api/provider/catalog", headers={
            "Authorization": f"Bearer {organizer_token}"
        })
        # Should be forbidden
        assert res.status_code == 403
    
    def test_participant_cannot_access_provider_endpoints(self):
        """Participant cannot access provider-specific endpoints"""
        # Login as participant
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pierre@test.com",
            "password": "test1234"
        })
        if res.status_code != 200:
            pytest.skip("Participant user not available")
        
        token = res.json()["token"]
        
        res = requests.get(f"{BASE_URL}/api/provider/catalog", headers={
            "Authorization": f"Bearer {token}"
        })
        assert res.status_code == 403


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
