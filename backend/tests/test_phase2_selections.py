"""
SportLyo Phase 2 - Selections Workflow Tests
Tests for the Prestataire ↔ Organisateur workflow:
1. POST /api/organizer/add-provider-product creates selection documents
2. GET /api/provider/selections returns selections grouped by organizer  
3. PUT /api/provider/selections/{id}/customize/{index} updates product images
4. PUT /api/provider/selections/{id}/status updates selection status
5. GET /api/provider/selections/stats returns counts by status
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://event-booking-34.preview.emergentagent.com"

# Test credentials
ORGANIZER_EMAIL = "club@paris-sport.fr"
ORGANIZER_PASSWORD = "club123"
PROVIDER_EMAIL = "boutique@sportlyo.fr"
PROVIDER_PASSWORD = "boutique123"


class TestSelectionWorkflow:
    """Test the complete selections workflow"""
    
    @pytest.fixture(scope="class")
    def organizer_token(self):
        """Get organizer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Organizer login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")  
    def provider_token(self):
        """Get provider auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PROVIDER_EMAIL,
            "password": PROVIDER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Provider login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def organizer_client(self, organizer_token):
        """Session with organizer auth"""
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {organizer_token}",
            "Content-Type": "application/json"
        })
        return session
    
    @pytest.fixture(scope="class")
    def provider_client(self, provider_token):
        """Session with provider auth"""
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {provider_token}",
            "Content-Type": "application/json"
        })
        return session

    # ========== PROVIDER SELECTIONS ENDPOINTS ==========
    
    def test_provider_get_selections(self, provider_client):
        """Provider: GET /api/provider/selections returns selections list"""
        response = provider_client.get(f"{BASE_URL}/api/provider/selections")
        assert response.status_code == 200
        data = response.json()
        assert "selections" in data
        print(f"Provider has {len(data['selections'])} selection(s)")
        
        # Verify selection structure if any exist
        if data['selections']:
            sel = data['selections'][0]
            assert "selection_id" in sel
            assert "organizer_id" in sel
            assert "organizer_name" in sel
            assert "products" in sel
            assert "status" in sel
            print(f"First selection: {sel['selection_id']} - Organizer: {sel['organizer_name']} - Status: {sel['status']}")
    
    def test_provider_selections_stats(self, provider_client):
        """Provider: GET /api/provider/selections/stats returns status counts"""
        response = provider_client.get(f"{BASE_URL}/api/provider/selections/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Verify stats structure
        assert "total" in data
        assert "pending" in data
        assert "in_progress" in data
        assert "ready" in data
        assert "total_products" in data
        assert "customized_products" in data
        
        print(f"Stats: Total={data['total']}, Pending={data['pending']}, In Progress={data['in_progress']}, Ready={data['ready']}")
        print(f"Products: {data['customized_products']}/{data['total_products']} customized")
    
    def test_get_existing_selection_detail(self, provider_client):
        """Provider: GET /api/provider/selections/{id} returns selection detail"""
        # First get all selections to find one
        response = provider_client.get(f"{BASE_URL}/api/provider/selections")
        assert response.status_code == 200
        selections = response.json().get("selections", [])
        
        if not selections:
            pytest.skip("No selections available to test detail endpoint")
        
        sel_id = selections[0]["selection_id"]
        detail_response = provider_client.get(f"{BASE_URL}/api/provider/selections/{sel_id}")
        assert detail_response.status_code == 200
        data = detail_response.json()
        assert "selection" in data
        assert data["selection"]["selection_id"] == sel_id
        print(f"Selection detail: {data['selection']['organizer_name']} - {len(data['selection'].get('products', []))} products")

    # ========== SELECTION CUSTOMIZATION ==========
    
    def test_selection_status_update(self, provider_client):
        """Provider: PUT /api/provider/selections/{id}/status updates status"""
        # Get selections first
        response = provider_client.get(f"{BASE_URL}/api/provider/selections")
        selections = response.json().get("selections", [])
        
        if not selections:
            pytest.skip("No selections available to test status update")
        
        # Find a non-ready selection to update
        sel = None
        for s in selections:
            if s.get("status") != "ready":
                sel = s
                break
        
        if not sel:
            # Use first selection even if ready - just verify the endpoint works
            sel = selections[0]
        
        sel_id = sel["selection_id"]
        current_status = sel.get("status", "pending")
        
        # Try to update to in_progress
        new_status = "in_progress" if current_status == "pending" else "pending"
        update_response = provider_client.put(
            f"{BASE_URL}/api/provider/selections/{sel_id}/status",
            json={"status": new_status}
        )
        
        # Should succeed or return appropriate error
        assert update_response.status_code in [200, 400]
        if update_response.status_code == 200:
            print(f"Status updated from {current_status} to {new_status}")
        else:
            print(f"Status update response: {update_response.json()}")

    def test_customize_selection_product(self, provider_client):
        """Provider: PUT /api/provider/selections/{id}/customize/{index} updates product images"""
        # Get selections first
        response = provider_client.get(f"{BASE_URL}/api/provider/selections")
        selections = response.json().get("selections", [])
        
        if not selections:
            pytest.skip("No selections available to test customization")
        
        # Find a selection with uncustomized products
        sel = None
        prod_idx = 0
        for s in selections:
            products = s.get("products", [])
            for i, p in enumerate(products):
                if not p.get("customized"):
                    sel = s
                    prod_idx = i
                    break
            if sel:
                break
        
        if not sel:
            # All products are customized, use first selection's first product for endpoint test
            sel = selections[0]
            prod_idx = 0
            if not sel.get("products"):
                pytest.skip("No products in selection to test customization")
        
        sel_id = sel["selection_id"]
        
        # Test customization with sample images
        test_images = [
            "https://event-booking-34.preview.emergentagent.com/uploads/test_custom_1.jpg",
            "https://event-booking-34.preview.emergentagent.com/uploads/test_custom_2.jpg"
        ]
        
        customize_response = provider_client.put(
            f"{BASE_URL}/api/provider/selections/{sel_id}/customize/{prod_idx}",
            json={"images": test_images}
        )
        
        # Should succeed
        assert customize_response.status_code == 200
        data = customize_response.json()
        assert "product" in data
        print(f"Product customization result: customized={data['product'].get('customized')}, all_customized={data.get('all_customized')}")

    # ========== ORGANIZER ADDS PROVIDER PRODUCT ==========
    
    def test_organizer_adds_provider_product_creates_selection(self, organizer_client):
        """Organizer: POST /api/organizer/add-provider-product creates selection"""
        # First get provider catalog
        catalog_response = organizer_client.get(f"{BASE_URL}/api/providers/catalog")
        assert catalog_response.status_code == 200
        products = catalog_response.json().get("products", [])
        
        if not products:
            pytest.skip("No provider products available in catalog")
        
        # Get organizer events
        events_response = organizer_client.get(f"{BASE_URL}/api/organizer/events")
        assert events_response.status_code == 200
        events = events_response.json().get("events", [])
        
        if not events:
            pytest.skip("No organizer events available")
        
        # Select first product and event
        provider_product = products[0]
        event = events[0]
        
        print(f"Adding provider product: {provider_product['name']} to event: {event['title']}")
        
        # Add provider product to event
        add_response = organizer_client.post(
            f"{BASE_URL}/api/organizer/add-provider-product",
            json={
                "provider_product_id": provider_product["product_id"],
                "event_id": event["event_id"],
                "organizer_commission": 5.0
            }
        )
        
        assert add_response.status_code == 200
        data = add_response.json()
        assert "product" in data
        
        # Verify product was created with customization_status
        created_product = data["product"]
        assert created_product.get("customization_status") == "pending"
        assert created_product.get("source") == "provider"
        print(f"Created product: {created_product['product_id']} with customization_status={created_product['customization_status']}")

    # ========== ORGANIZER SELECTIONS VIEW ==========
    
    def test_organizer_get_selections(self, organizer_client):
        """Organizer: GET /api/organizer/selections returns their selections"""
        response = organizer_client.get(f"{BASE_URL}/api/organizer/selections")
        assert response.status_code == 200
        data = response.json()
        assert "selections" in data
        print(f"Organizer has {len(data['selections'])} selection(s)")

    def test_organizer_products_have_customization_status(self, organizer_client):
        """Organizer: Products from provider have customization_status field"""
        response = organizer_client.get(f"{BASE_URL}/api/organizer/products")
        assert response.status_code == 200
        products = response.json().get("products", [])
        
        provider_products = [p for p in products if p.get("source") == "provider"]
        print(f"Found {len(provider_products)} provider-source products out of {len(products)} total")
        
        # Count products with customization_status (newer products should have it)
        products_with_status = 0
        for p in provider_products:
            status = p.get("customization_status", "N/A")
            if "customization_status" in p:
                products_with_status += 1
            print(f"Product: {p['name'][:30]}... - customization_status={status}")
        
        # At least some products should have customization_status 
        # (older products might not have it if created before this feature)
        assert products_with_status > 0, "No provider products have customization_status field"
        print(f"{products_with_status}/{len(provider_products)} products have customization_status")


class TestSelectionInvalidCases:
    """Test error handling for selections endpoints"""
    
    @pytest.fixture
    def provider_client(self):
        """Get provider auth"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PROVIDER_EMAIL,
            "password": PROVIDER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Provider login failed")
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {response.json()['token']}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_invalid_selection_id(self, provider_client):
        """Provider: GET /api/provider/selections/{invalid_id} returns 404"""
        response = provider_client.get(f"{BASE_URL}/api/provider/selections/invalid_id_12345")
        assert response.status_code == 404
    
    def test_invalid_status_value(self, provider_client):
        """Provider: PUT with invalid status returns 400"""
        # Get a selection first
        sel_response = provider_client.get(f"{BASE_URL}/api/provider/selections")
        selections = sel_response.json().get("selections", [])
        
        if not selections:
            pytest.skip("No selections to test")
        
        sel_id = selections[0]["selection_id"]
        response = provider_client.put(
            f"{BASE_URL}/api/provider/selections/{sel_id}/status",
            json={"status": "invalid_status"}
        )
        assert response.status_code == 400
    
    def test_invalid_product_index(self, provider_client):
        """Provider: PUT /customize with invalid index returns 400"""
        sel_response = provider_client.get(f"{BASE_URL}/api/provider/selections")
        selections = sel_response.json().get("selections", [])
        
        if not selections:
            pytest.skip("No selections to test")
        
        sel_id = selections[0]["selection_id"]
        response = provider_client.put(
            f"{BASE_URL}/api/provider/selections/{sel_id}/customize/999",
            json={"images": ["test.jpg"]}
        )
        assert response.status_code == 400


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
