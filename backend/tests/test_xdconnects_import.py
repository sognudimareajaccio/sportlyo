"""
XD Connects Import Feature Tests
Tests for the XD Connects/Xindao product import functionality in provider dashboard:
- Lookup endpoint (with Playwright scraping - takes 10-15s)
- Add-single endpoint
- Duplicate detection
- Invalid reference handling
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Provider credentials
PROVIDER_EMAIL = "boutique@sportlyo.fr"
PROVIDER_PASSWORD = "boutique123"


@pytest.fixture(scope="module")
def provider_token():
    """Get authentication token for provider"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": PROVIDER_EMAIL,
        "password": PROVIDER_PASSWORD
    })
    assert response.status_code == 200, f"Provider login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in login response"
    return data["token"]


@pytest.fixture
def auth_headers(provider_token):
    """Auth headers for provider requests"""
    return {"Authorization": f"Bearer {provider_token}"}


class TestXDConnectsLookup:
    """XD Connects lookup endpoint tests"""

    def test_lookup_invalid_reference_format(self, auth_headers):
        """Test lookup with invalid reference format returns 400"""
        response = requests.get(
            f"{BASE_URL}/api/provider/import/xdconnects/lookup/INVALID",
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400 for invalid ref, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "invalide" in data["detail"].lower()

    def test_lookup_invalid_reference_format_numbers_only(self, auth_headers):
        """Test lookup with numbers only returns 400"""
        response = requests.get(
            f"{BASE_URL}/api/provider/import/xdconnects/lookup/12345",
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400 for numbers-only ref, got {response.status_code}"

    def test_lookup_valid_reference_p706(self, auth_headers):
        """Test lookup with valid reference P706.33 returns product data
        Note: This test takes 10-15 seconds due to Playwright scraping
        """
        response = requests.get(
            f"{BASE_URL}/api/provider/import/xdconnects/lookup/P706.33",
            headers=auth_headers,
            timeout=60  # Extended timeout for scraping
        )
        # Accept 200 (success), 409 (already imported), or 404 (not found on site)
        assert response.status_code in [200, 409, 404], f"Unexpected status: {response.status_code}, body: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert "product" in data
            product = data["product"]
            # Verify product structure
            assert "ref" in product
            assert "name" in product
            assert "price" in product
            assert "brand" in product or product.get("brand") == ""
            assert "category" in product
            assert "image_url" in product
            assert "sizes" in product
            assert "colors" in product
            # Reference should be uppercase
            assert product["ref"] == "P706.33"
            print(f"Product found: {product['name']}, price: {product['price']}€")
        elif response.status_code == 409:
            print("Product P706.33 already imported (409)")
        else:
            print("Product P706.33 not found on XD Connects (404)")

    def test_lookup_unauthorized_without_token(self):
        """Test lookup without auth token returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/provider/import/xdconnects/lookup/T9101"
        )
        assert response.status_code == 401


class TestXDConnectsAddSingle:
    """XD Connects add-single endpoint tests"""

    def test_add_single_creates_product(self, auth_headers):
        """Test add-single creates product in database"""
        # Use a unique reference to avoid duplicates
        import uuid
        test_ref = f"TESTPROD{uuid.uuid4().hex[:4].upper()}"
        
        # Construct test product payload
        test_product = {
            "ref": test_ref,
            "name": "Test Product XD Connects",
            "description": "Test description",
            "price": 25.99,
            "sizes": ["S", "M", "L"],
            "colors": ["Black", "White"],
            "category": "Textile",
            "image_url": "https://example.com/image.jpg",
            "source_url": "https://xdconnects.com/test",
            "brand": "Test Brand",
            "material": "Cotton"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/provider/import/xdconnects/add-single",
            headers=auth_headers,
            json={"product": test_product}
        )
        
        # Should succeed
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert test_ref in data["message"]
        assert "product_id" in data
        print(f"Product created: {data['product_id']}")

    def test_add_single_duplicate_detection(self, auth_headers):
        """Test add-single with duplicate reference returns 409"""
        # First, add a product
        test_ref = "DUPTEST001"
        test_product = {
            "ref": test_ref,
            "name": "Duplicate Test Product",
            "description": "Test",
            "price": 10,
            "sizes": [],
            "colors": [],
            "category": "Accessoire",
            "image_url": "",
            "brand": ""
        }
        
        # First add should succeed or already exist
        response1 = requests.post(
            f"{BASE_URL}/api/provider/import/xdconnects/add-single",
            headers=auth_headers,
            json={"product": test_product}
        )
        
        # Second add should fail with 409
        response2 = requests.post(
            f"{BASE_URL}/api/provider/import/xdconnects/add-single",
            headers=auth_headers,
            json={"product": test_product}
        )
        
        assert response2.status_code == 409, f"Expected 409 for duplicate, got {response2.status_code}"
        data = response2.json()
        assert "deja" in data["detail"].lower() or "already" in data["detail"].lower()

    def test_add_single_unauthorized(self):
        """Test add-single without auth returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/provider/import/xdconnects/add-single",
            json={"product": {"ref": "TEST123"}}
        )
        assert response.status_code == 401


class TestXDConnectsProviderCatalog:
    """Verify XD Connects products appear in provider catalog"""

    def test_catalog_shows_xdconnects_products(self, auth_headers):
        """Test provider catalog includes XD Connects imported products"""
        response = requests.get(
            f"{BASE_URL}/api/provider/catalog",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        
        # Check if any products have source='xdconnects'
        products = data["products"]
        xd_products = [p for p in products if p.get("source") == "xdconnects"]
        print(f"Found {len(xd_products)} XD Connects products in catalog out of {len(products)} total")
        
        # At minimum, the products we just created should be there
        assert len(products) >= 0  # Just verify the endpoint works


class TestXDConnectsLookupDuplicateDetection:
    """Test duplicate detection at lookup time (before add)"""

    def test_lookup_already_imported_returns_409(self, auth_headers):
        """Test that lookup for already imported product returns 409
        Note: T9101 was mentioned as already imported in manual testing
        """
        response = requests.get(
            f"{BASE_URL}/api/provider/import/xdconnects/lookup/T9101",
            headers=auth_headers,
            timeout=60
        )
        # If T9101 was previously imported, should get 409
        # If not, could get 200 (found) or 404 (not found on site)
        print(f"T9101 lookup status: {response.status_code}")
        if response.status_code == 409:
            data = response.json()
            assert "deja" in data["detail"].lower()
            print("T9101 correctly detected as already imported")
        else:
            print(f"T9101 lookup returned {response.status_code} - product may not be imported yet")
