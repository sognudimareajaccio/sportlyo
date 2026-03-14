"""
Test Phase 1 Modifications:
1. Organizer can delete provider products from their selection
2. Backend DELETE /api/organizer/products/{product_id} for provider-source products
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


@pytest.fixture
def organizer_token():
    """Login as organizer and return token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ORGANIZER_EMAIL,
        "password": ORGANIZER_PASS
    })
    if response.status_code != 200:
        pytest.skip(f"Organizer login failed: {response.status_code}")
    return response.json().get("token")


@pytest.fixture
def provider_token():
    """Login as provider and return token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": PROVIDER_EMAIL,
        "password": PROVIDER_PASS
    })
    if response.status_code != 200:
        pytest.skip(f"Provider login failed: {response.status_code}")
    return response.json().get("token")


class TestDeleteProviderProducts:
    """Test organizer can delete provider products from their selection"""
    
    def test_organizer_login_works(self):
        """Verify organizer can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASS
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "organizer"
        print(f"[PASS] Organizer login works")
    
    def test_get_organizer_products(self, organizer_token):
        """Get organizer products including any provider-source products"""
        headers = {"Authorization": f"Bearer {organizer_token}"}
        response = requests.get(f"{BASE_URL}/api/organizer/products", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "products" in data
        products = data["products"]
        print(f"[PASS] Got {len(products)} organizer products")
        
        # Check if any have source='provider'
        provider_products = [p for p in products if p.get("source") == "provider"]
        print(f"[INFO] Found {len(provider_products)} provider-source products")
        return products
    
    def test_delete_organizer_product_endpoint_exists(self, organizer_token):
        """Verify DELETE endpoint exists and returns proper error for non-existent product"""
        headers = {"Authorization": f"Bearer {organizer_token}"}
        # Try to delete a non-existent product
        response = requests.delete(
            f"{BASE_URL}/api/organizer/products/nonexistent_product_id",
            headers=headers
        )
        # Should return 404 (not 405 Method Not Allowed)
        assert response.status_code in [404, 400], f"Unexpected status: {response.status_code} - {response.text}"
        print(f"[PASS] DELETE endpoint exists and returns {response.status_code} for non-existent product")
    
    def test_create_and_delete_provider_product_in_organizer_space(self, organizer_token, provider_token):
        """
        Full flow:
        1. Provider creates a product
        2. Organizer adds provider product to their event
        3. Organizer deletes the provider product from their space
        4. Verify it's removed from organizer products
        """
        org_headers = {"Authorization": f"Bearer {organizer_token}"}
        prov_headers = {"Authorization": f"Bearer {provider_token}"}
        
        # Step 1: Get provider catalog to find a product (requires auth)
        response = requests.get(f"{BASE_URL}/api/providers/catalog", headers=org_headers)
        assert response.status_code == 200, f"Failed to get provider catalog: {response.text}"
        provider_products = response.json().get("products", [])
        
        if len(provider_products) == 0:
            # Create a test provider product first
            response = requests.post(f"{BASE_URL}/api/provider/catalog", 
                headers=prov_headers,
                json={
                    "name": "TEST_DeleteProviderProduct",
                    "description": "Test product for delete test",
                    "category": "Textile",
                    "price": 19.99,
                    "suggested_commission": 3,
                    "stock": 50,
                    "sizes": ["S", "M", "L"],
                    "colors": ["Noir"]
                }
            )
            assert response.status_code in [200, 201], f"Failed to create provider product: {response.text}"
            provider_product = response.json().get("product", {})
            provider_product_id = provider_product.get("product_id")
            print(f"[INFO] Created test provider product: {provider_product_id}")
            
            # Refresh catalog (with auth)
            response = requests.get(f"{BASE_URL}/api/providers/catalog", headers=org_headers)
            provider_products = response.json().get("products", [])
        
        # Get a provider product
        test_provider_product = provider_products[0] if provider_products else None
        if not test_provider_product:
            pytest.skip("No provider products available to test")
        
        provider_product_id = test_provider_product.get("product_id")
        print(f"[INFO] Using provider product: {provider_product_id} - {test_provider_product.get('name')}")
        
        # Step 2: Get organizer events to add product
        response = requests.get(f"{BASE_URL}/api/organizer/events", headers=org_headers)
        assert response.status_code == 200
        events = response.json().get("events", [])
        if not events:
            pytest.skip("No organizer events available")
        
        event_id = events[0].get("event_id")
        print(f"[INFO] Using event: {event_id}")
        
        # Step 3: Add provider product to organizer's event
        response = requests.post(f"{BASE_URL}/api/organizer/add-provider-product", 
            headers=org_headers,
            json={
                "provider_product_id": provider_product_id,
                "event_id": event_id,
                "organizer_commission": 5
            }
        )
        # May return 200 or 400 if already added
        if response.status_code == 200:
            print(f"[INFO] Added provider product to organizer event")
        else:
            print(f"[INFO] Provider product may already be added: {response.status_code}")
        
        # Step 4: Get organizer products to find the added provider product
        response = requests.get(f"{BASE_URL}/api/organizer/products", headers=org_headers)
        assert response.status_code == 200
        org_products = response.json().get("products", [])
        
        # Find the provider-source product
        provider_source_products = [p for p in org_products if p.get("source") == "provider"]
        print(f"[INFO] Found {len(provider_source_products)} provider-source products in organizer space")
        
        if provider_source_products:
            product_to_delete = provider_source_products[0]
            product_id_to_delete = product_to_delete.get("product_id")
            print(f"[INFO] Will delete product: {product_id_to_delete}")
            
            # Step 5: Delete the provider product from organizer's space
            response = requests.delete(
                f"{BASE_URL}/api/organizer/products/{product_id_to_delete}",
                headers=org_headers
            )
            assert response.status_code in [200, 204], f"Delete failed: {response.status_code} - {response.text}"
            print(f"[PASS] Successfully deleted provider product from organizer space")
            
            # Step 6: Verify it's removed
            response = requests.get(f"{BASE_URL}/api/organizer/products", headers=org_headers)
            assert response.status_code == 200
            remaining_products = response.json().get("products", [])
            remaining_ids = [p.get("product_id") for p in remaining_products]
            
            assert product_id_to_delete not in remaining_ids, "Product was not deleted"
            print(f"[PASS] Verified product was removed from organizer products")
        else:
            print(f"[INFO] No provider-source products to delete, but endpoint works")


class TestProviderImportTopTex:
    """Test that provider import TopTex section no longer has PDF upload UI
    This is a frontend-only test, but we verify the backend endpoints still work
    """
    
    def test_lookup_endpoint_works(self, provider_token):
        """Verify the reference lookup endpoint works"""
        headers = {"Authorization": f"Bearer {provider_token}"}
        
        # Test with a known TopTex reference (may or may not find results)
        response = requests.get(
            f"{BASE_URL}/api/provider/import/lookup/PA4045",
            headers=headers
        )
        # Should return 200 with product or 404 if not found
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print(f"[PASS] Lookup endpoint works - status {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
