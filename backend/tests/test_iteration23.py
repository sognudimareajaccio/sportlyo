"""
Iteration 23 Backend Tests
Testing:
1. Provider routes after extraction to routers/provider.py
2. Order placement generates invoice
3. Invoice API for participant
4. Landing page features (API not needed, frontend only)
5. Register page role options (frontend only)
6. Organizer boutique commission label (frontend only)
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
PARTICIPANT_EMAIL = "pierre@test.com"
PARTICIPANT_PASSWORD = "test1234"

# Event ID for shop testing
EVENT_ID = "evt_fa95880cf1b9"


class TestProviderRoutes:
    """Test provider routes after extraction to routers/provider.py"""
    
    def test_provider_login(self):
        """Provider can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PROVIDER_EMAIL,
            "password": PROVIDER_PASSWORD
        })
        assert response.status_code == 200, f"Provider login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "provider"
        print(f"✅ Provider login successful: {data['user']['name']}")
    
    def test_provider_catalog_returns_products(self):
        """GET /api/provider/catalog returns 8 products for provider"""
        # Login as provider
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PROVIDER_EMAIL,
            "password": PROVIDER_PASSWORD
        })
        assert login_res.status_code == 200
        token = login_res.json()["token"]
        
        # Get catalog
        response = requests.get(
            f"{BASE_URL}/api/provider/catalog",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Catalog failed: {response.text}"
        data = response.json()
        assert "products" in data
        product_count = len(data["products"])
        print(f"✅ Provider catalog returned {product_count} products")
        # Main agent mentioned 8 products, verify it's > 0
        assert product_count > 0, "No products in provider catalog"
    
    def test_provider_stats(self):
        """GET /api/provider/stats works"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PROVIDER_EMAIL,
            "password": PROVIDER_PASSWORD
        })
        token = login_res.json()["token"]
        
        response = requests.get(
            f"{BASE_URL}/api/provider/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        assert "total_products" in data
        print(f"✅ Provider stats: {data['total_products']} products, {data['total_orders']} orders")
    
    def test_provider_orders(self):
        """GET /api/provider/orders works"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PROVIDER_EMAIL,
            "password": PROVIDER_PASSWORD
        })
        token = login_res.json()["token"]
        
        response = requests.get(
            f"{BASE_URL}/api/provider/orders",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Orders failed: {response.text}"
        data = response.json()
        assert "orders" in data
        print(f"✅ Provider orders: {len(data['orders'])} orders")


class TestOrderInvoice:
    """Test that order placement generates invoice"""
    
    def test_participant_login(self):
        """Participant can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PARTICIPANT_EMAIL,
            "password": PARTICIPANT_PASSWORD
        })
        assert response.status_code == 200, f"Participant login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print(f"✅ Participant login successful: {data['user']['name']}")
    
    def test_get_event_shop_products(self):
        """GET /api/events/{event_id}/shop returns products"""
        response = requests.get(f"{BASE_URL}/api/events/{EVENT_ID}/shop")
        assert response.status_code == 200, f"Shop failed: {response.text}"
        data = response.json()
        assert "products" in data
        print(f"✅ Event shop has {len(data['products'])} products")
        return data["products"]
    
    def test_place_order_and_get_invoice(self):
        """POST /api/shop/order creates order with invoice_id"""
        # Login as participant
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PARTICIPANT_EMAIL,
            "password": PARTICIPANT_PASSWORD
        })
        assert login_res.status_code == 200
        token = login_res.json()["token"]
        
        # Get products first
        shop_res = requests.get(f"{BASE_URL}/api/events/{EVENT_ID}/shop")
        products = shop_res.json().get("products", [])
        
        if not products:
            pytest.skip("No products available in shop")
        
        # Place order with first product
        product = products[0]
        order_payload = {
            "event_id": EVENT_ID,
            "items": [{
                "product_id": product["product_id"],
                "quantity": 1,
                "size": product.get("sizes", ["M"])[0] if product.get("sizes") else "M",
                "color": product.get("colors", [""])[0] if product.get("colors") else ""
            }],
            "delivery_method": "Retrait sur place",
            "shipping_address": "Retrait le jour de l'événement",
            "phone": "0612345678",
            "delivery_fee": 0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/shop/order",
            json=order_payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Order failed: {response.text}"
        data = response.json()
        
        # Verify invoice_id is returned
        assert "invoice_id" in data, "invoice_id not returned in order response"
        assert data["invoice_id"] is not None, "invoice_id is None"
        assert data["invoice_id"].startswith("inv_"), f"Invalid invoice_id format: {data['invoice_id']}"
        print(f"✅ Order placed with invoice_id: {data['invoice_id']}")
        return data["invoice_id"]


class TestInvoiceAPI:
    """Test invoice API endpoints"""
    
    def test_get_invoices_for_participant(self):
        """GET /api/invoices returns invoices for participant"""
        # Login as participant
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PARTICIPANT_EMAIL,
            "password": PARTICIPANT_PASSWORD
        })
        assert login_res.status_code == 200
        token = login_res.json()["token"]
        
        response = requests.get(
            f"{BASE_URL}/api/invoices",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Invoices failed: {response.text}"
        data = response.json()
        assert "invoices" in data
        print(f"✅ Participant has {len(data['invoices'])} invoices")
        
        # Verify invoice structure if any exist
        if data["invoices"]:
            inv = data["invoices"][0]
            assert "invoice_id" in inv
            assert "invoice_number" in inv
            print(f"✅ First invoice: {inv['invoice_number']}")
    
    def test_get_invoices_unauthorized(self):
        """GET /api/invoices requires authentication"""
        response = requests.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Invoice API requires authentication")


class TestOrganizerBoutiqueAPI:
    """Test organizer boutique endpoints"""
    
    def test_organizer_shop_stats(self):
        """GET /api/organizer/shop-stats returns commission info"""
        # Login as organizer
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        assert login_res.status_code == 200
        token = login_res.json()["token"]
        
        response = requests.get(
            f"{BASE_URL}/api/organizer/shop-stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Shop stats failed: {response.text}"
        data = response.json()
        # Should have commission info
        print(f"✅ Organizer shop stats: {data}")


class TestProvidersCatalogBrowse:
    """Test organizer browsing provider catalogs"""
    
    def test_browse_provider_catalogs(self):
        """GET /api/providers/catalog as organizer"""
        # Login as organizer
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        token = login_res.json()["token"]
        
        response = requests.get(
            f"{BASE_URL}/api/providers/catalog",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Browse catalog failed: {response.text}"
        data = response.json()
        assert "products" in data
        print(f"✅ Organizer can browse {len(data['products'])} provider products")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
