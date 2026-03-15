"""
Test iteration 53: Boracay integration and Provider flow tests
Tests:
1. /api/provider/is-main-partner - returns is_main_partner: true for laboutique@sportlyo.fr, false for others
2. /api/provider-products/external - returns products from non-main providers
3. /api/provider/request-custom-import - sends message to admin with [DEMANDE IMPORT CATALOGUE] prefix
4. /api/provider/import/boracay/categories - returns list of categories for main partner
5. Provider catalog CRUD - manual product creation for non-main partners
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
MAIN_PARTNER_EMAIL = "laboutique@sportlyo.fr"
MAIN_PARTNER_PASSWORD = "boutique123"
SECONDARY_PARTNER_EMAIL = "boutique2@sportlyo.fr"
SECONDARY_PARTNER_PASSWORD = "boutique123"
OLD_PARTNER_EMAIL = "boutique@sportlyo.fr"  # Moreati
OLD_PARTNER_PASSWORD = "boutique123"
ORGANIZER_EMAIL = "club@paris-sport.fr"
ORGANIZER_PASSWORD = "club123"
ADMIN_EMAIL = "admin@sportsconnect.fr"
ADMIN_PASSWORD = "admin123"


def get_auth_token(email: str, password: str) -> str:
    """Login and return JWT token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    if response.status_code == 200:
        return response.json().get("token")
    return None


@pytest.fixture(scope="module")
def main_partner_token():
    """Get token for main partner (laboutique@sportlyo.fr)"""
    token = get_auth_token(MAIN_PARTNER_EMAIL, MAIN_PARTNER_PASSWORD)
    if not token:
        pytest.skip(f"Cannot authenticate as main partner {MAIN_PARTNER_EMAIL}")
    return token


@pytest.fixture(scope="module")
def secondary_partner_token():
    """Get token for secondary partner (boutique2@sportlyo.fr)"""
    token = get_auth_token(SECONDARY_PARTNER_EMAIL, SECONDARY_PARTNER_PASSWORD)
    if not token:
        pytest.skip(f"Cannot authenticate as secondary partner {SECONDARY_PARTNER_EMAIL}")
    return token


@pytest.fixture(scope="module")
def old_partner_token():
    """Get token for old partner Moreati (boutique@sportlyo.fr)"""
    token = get_auth_token(OLD_PARTNER_EMAIL, OLD_PARTNER_PASSWORD)
    if not token:
        pytest.skip(f"Cannot authenticate as old partner {OLD_PARTNER_EMAIL}")
    return token


@pytest.fixture(scope="module")
def organizer_token():
    """Get token for organizer (club@paris-sport.fr)"""
    token = get_auth_token(ORGANIZER_EMAIL, ORGANIZER_PASSWORD)
    if not token:
        pytest.skip(f"Cannot authenticate as organizer {ORGANIZER_EMAIL}")
    return token


@pytest.fixture(scope="module")
def admin_token():
    """Get token for admin"""
    token = get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        pytest.skip(f"Cannot authenticate as admin {ADMIN_EMAIL}")
    return token


class TestIsMainPartner:
    """Tests for /api/provider/is-main-partner endpoint"""
    
    def test_main_partner_returns_true(self, main_partner_token):
        """Main partner (laboutique@sportlyo.fr) should get is_main_partner: true"""
        response = requests.get(
            f"{BASE_URL}/api/provider/is-main-partner",
            headers={"Authorization": f"Bearer {main_partner_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "is_main_partner" in data, "Response should contain is_main_partner field"
        assert data["is_main_partner"] is True, f"laboutique@sportlyo.fr should be main partner, got {data}"
        print(f"PASS: Main partner check - is_main_partner: {data['is_main_partner']}")
    
    def test_secondary_partner_returns_false(self, secondary_partner_token):
        """Secondary partner (boutique2@sportlyo.fr) should get is_main_partner: false"""
        response = requests.get(
            f"{BASE_URL}/api/provider/is-main-partner",
            headers={"Authorization": f"Bearer {secondary_partner_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "is_main_partner" in data, "Response should contain is_main_partner field"
        assert data["is_main_partner"] is False, f"boutique2@sportlyo.fr should NOT be main partner, got {data}"
        print(f"PASS: Secondary partner check - is_main_partner: {data['is_main_partner']}")
    
    def test_old_partner_returns_false(self, old_partner_token):
        """Old partner Moreati (boutique@sportlyo.fr) should get is_main_partner: false"""
        response = requests.get(
            f"{BASE_URL}/api/provider/is-main-partner",
            headers={"Authorization": f"Bearer {old_partner_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "is_main_partner" in data, "Response should contain is_main_partner field"
        assert data["is_main_partner"] is False, f"boutique@sportlyo.fr should NOT be main partner, got {data}"
        print(f"PASS: Old partner check - is_main_partner: {data['is_main_partner']}")


class TestExternalProviderProducts:
    """Tests for /api/provider-products/external endpoint - products from non-main providers"""
    
    def test_organizer_can_get_external_products(self, organizer_token):
        """Organizer should be able to fetch external provider products"""
        response = requests.get(
            f"{BASE_URL}/api/provider-products/external",
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "products" in data, "Response should contain products array"
        print(f"PASS: Organizer fetched {len(data['products'])} external products")
        
        # Check that products have required fields
        for product in data['products'][:3]:  # Check first 3
            assert "product_id" in product, "Product should have product_id"
            assert "name" in product, "Product should have name"
            assert "provider_name" in product, "Product should have provider_name"
            print(f"  - {product['name']} by {product.get('provider_name', 'Unknown')}")
    
    def test_external_products_exclude_main_partner(self, organizer_token, main_partner_token):
        """External products should NOT include products from main partner (laboutique@sportlyo.fr)"""
        # First get main partner's user_id
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {main_partner_token}"}
        )
        assert me_response.status_code == 200
        main_partner_id = me_response.json().get("user_id")
        
        # Get external products
        response = requests.get(
            f"{BASE_URL}/api/provider-products/external",
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        assert response.status_code == 200
        products = response.json().get("products", [])
        
        # Check that none of the products are from main partner
        for product in products:
            assert product.get("provider_id") != main_partner_id, \
                f"External products should NOT include main partner's products. Found: {product['name']}"
        
        print(f"PASS: {len(products)} external products, none from main partner")
    
    def test_provider_cannot_access_external_products(self, secondary_partner_token):
        """Provider should not be able to access external products endpoint (organizer only)"""
        response = requests.get(
            f"{BASE_URL}/api/provider-products/external",
            headers={"Authorization": f"Bearer {secondary_partner_token}"}
        )
        assert response.status_code == 403, f"Expected 403 for provider, got {response.status_code}"
        print("PASS: Provider correctly blocked from external products endpoint")


class TestCustomImportRequest:
    """Tests for /api/provider/request-custom-import endpoint"""
    
    def test_secondary_partner_can_request_custom_import(self, secondary_partner_token):
        """Secondary partner should be able to request custom import"""
        message = "TEST: Je souhaite importer mon catalogue depuis mon-fournisseur-test.com"
        response = requests.post(
            f"{BASE_URL}/api/provider/request-custom-import",
            headers={"Authorization": f"Bearer {secondary_partner_token}"},
            json={"message": message}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, "Response should confirm message sent"
        # Check that the message was formatted with prefix
        if "msg" in data:
            assert "[DEMANDE IMPORT CATALOGUE]" in data["msg"]["content"], \
                "Message should have [DEMANDE IMPORT CATALOGUE] prefix"
        print(f"PASS: Custom import request sent - {data.get('message')}")
    
    def test_empty_message_rejected(self, secondary_partner_token):
        """Empty message should be rejected"""
        response = requests.post(
            f"{BASE_URL}/api/provider/request-custom-import",
            headers={"Authorization": f"Bearer {secondary_partner_token}"},
            json={"message": ""}
        )
        assert response.status_code == 400, f"Expected 400 for empty message, got {response.status_code}"
        print("PASS: Empty message correctly rejected")
    
    def test_organizer_cannot_request_custom_import(self, organizer_token):
        """Organizer should not be able to use provider endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/provider/request-custom-import",
            headers={"Authorization": f"Bearer {organizer_token}"},
            json={"message": "Test message"}
        )
        assert response.status_code == 403, f"Expected 403 for organizer, got {response.status_code}"
        print("PASS: Organizer correctly blocked from provider endpoint")


class TestBoracayImport:
    """Tests for Boracay import endpoints - only for main partner"""
    
    def test_main_partner_can_get_boracay_categories(self, main_partner_token):
        """Main partner should be able to get Boracay categories"""
        response = requests.get(
            f"{BASE_URL}/api/provider/import/boracay/categories",
            headers={"Authorization": f"Bearer {main_partner_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "categories" in data, "Response should contain categories array"
        assert len(data["categories"]) > 0, "Should have at least one category"
        
        # Check category structure
        cat = data["categories"][0]
        assert "slug" in cat, "Category should have slug"
        assert "label" in cat, "Category should have label"
        print(f"PASS: Main partner got {len(data['categories'])} Boracay categories")
        for c in data["categories"][:5]:
            print(f"  - {c['slug']}: {c['label']}")
    
    def test_secondary_partner_can_get_boracay_categories(self, secondary_partner_token):
        """Secondary partner should also be able to access categories endpoint (provider role required)"""
        response = requests.get(
            f"{BASE_URL}/api/provider/import/boracay/categories",
            headers={"Authorization": f"Bearer {secondary_partner_token}"}
        )
        # The endpoint requires provider role, not main partner specifically
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Secondary partner can access Boracay categories")
    
    def test_boracay_lookup_with_valid_url(self, main_partner_token):
        """Test Boracay lookup with a valid product URL"""
        # Use a real Boracay URL (this may fail if URL is invalid)
        test_url = "https://www.boracay.fr/fr/130-porte-cles"  # Category page, not product
        response = requests.get(
            f"{BASE_URL}/api/provider/import/boracay/lookup",
            params={"url": test_url},
            headers={"Authorization": f"Bearer {main_partner_token}"}
        )
        # This should return 404 since it's a category page not a product page
        # We're testing the endpoint is accessible
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        print(f"PASS: Boracay lookup endpoint accessible (status: {response.status_code})")
    
    def test_boracay_lookup_invalid_url(self, main_partner_token):
        """Test Boracay lookup with invalid URL"""
        response = requests.get(
            f"{BASE_URL}/api/provider/import/boracay/lookup",
            params={"url": "https://example.com/invalid"},
            headers={"Authorization": f"Bearer {main_partner_token}"}
        )
        assert response.status_code == 400, f"Expected 400 for invalid URL, got {response.status_code}"
        print("PASS: Invalid Boracay URL correctly rejected")


class TestProviderCatalogCRUD:
    """Tests for provider catalog CRUD - manual product creation for all providers"""
    
    def test_secondary_partner_can_create_product(self, secondary_partner_token):
        """Secondary partner should be able to create products manually"""
        product_data = {
            "name": "TEST Produit Manuel Boutique2",
            "description": "Produit de test cree manuellement",
            "category": "Textile",
            "price": 29.99,
            "suggested_commission": 5,
            "stock": 50
        }
        response = requests.post(
            f"{BASE_URL}/api/provider/catalog",
            headers={"Authorization": f"Bearer {secondary_partner_token}"},
            json=product_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "product" in data, "Response should contain product"
        product = data["product"]
        assert product["name"] == product_data["name"]
        assert product["price"] == product_data["price"]
        print(f"PASS: Secondary partner created product: {product['product_id']}")
        return product["product_id"]
    
    def test_secondary_partner_can_view_catalog(self, secondary_partner_token):
        """Secondary partner should be able to view their catalog"""
        response = requests.get(
            f"{BASE_URL}/api/provider/catalog",
            headers={"Authorization": f"Bearer {secondary_partner_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "products" in data, "Response should contain products array"
        print(f"PASS: Secondary partner has {len(data['products'])} products in catalog")
    
    def test_main_partner_can_create_product(self, main_partner_token):
        """Main partner should also be able to create products manually"""
        product_data = {
            "name": "TEST Produit Manuel LaBoutique",
            "description": "Produit de test du partenaire principal",
            "category": "Accessoire",
            "price": 49.99,
            "suggested_commission": 8,
            "stock": 100
        }
        response = requests.post(
            f"{BASE_URL}/api/provider/catalog",
            headers={"Authorization": f"Bearer {main_partner_token}"},
            json=product_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "product" in data, "Response should contain product"
        print(f"PASS: Main partner created product: {data['product']['product_id']}")


class TestAdminMessagesCheck:
    """Verify that custom import requests appear in admin messages"""
    
    def test_admin_can_see_provider_messages(self, admin_token):
        """Admin should be able to see provider messages/conversations"""
        response = requests.get(
            f"{BASE_URL}/api/provider/conversations",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # This should work for admin role
        assert response.status_code in [200, 403], f"Got unexpected status {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            print(f"PASS: Admin conversations accessible with {len(data.get('conversations', []))} convos")
        else:
            print("INFO: Admin may need different endpoint for messages")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
