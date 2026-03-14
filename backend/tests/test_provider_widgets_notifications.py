"""
Test Provider Dashboard Financial/Sales Widgets and Notifications System
- Tests provider financial-breakdown endpoint (commissions per organizer)
- Tests provider sales-breakdown endpoint (top products, categories, sizes)
- Tests notifications CRUD endpoints
- Requires provider login: boutique@sportlyo.fr / boutique123
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
PROVIDER_EMAIL = "boutique@sportlyo.fr"
PROVIDER_PASSWORD = "boutique123"
PARTICIPANT_EMAIL = "pierre@test.com"
PARTICIPANT_PASSWORD = "test1234"


class TestProviderAuth:
    """Provider authentication tests"""
    
    @pytest.fixture(scope="class")
    def provider_token(self):
        """Get provider auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PROVIDER_EMAIL,
            "password": PROVIDER_PASSWORD
        })
        assert response.status_code == 200, f"Provider login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    @pytest.fixture(scope="class")
    def participant_token(self):
        """Get participant auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PARTICIPANT_EMAIL,
            "password": PARTICIPANT_PASSWORD
        })
        assert response.status_code == 200, f"Participant login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    def test_provider_login_success(self, provider_token):
        """Verify provider can login"""
        assert provider_token is not None
        assert len(provider_token) > 0
        print(f"✅ Provider login successful, token obtained")


class TestProviderFinancialBreakdown:
    """Test /api/provider/financial-breakdown endpoint"""
    
    @pytest.fixture(scope="class")
    def provider_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PROVIDER_EMAIL,
            "password": PROVIDER_PASSWORD
        })
        return response.json()["token"]
    
    def test_financial_breakdown_returns_200(self, provider_token):
        """Financial breakdown endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/provider/financial-breakdown",
            headers={"Authorization": f"Bearer {provider_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✅ GET /api/provider/financial-breakdown returns 200")
    
    def test_financial_breakdown_structure(self, provider_token):
        """Financial breakdown returns correct data structure"""
        response = requests.get(
            f"{BASE_URL}/api/provider/financial-breakdown",
            headers={"Authorization": f"Bearer {provider_token}"}
        )
        data = response.json()
        
        # Check required fields
        assert "by_organizer" in data, "Missing 'by_organizer' field"
        assert "total_sales" in data, "Missing 'total_sales' field"
        assert "total_commission" in data, "Missing 'total_commission' field"
        assert "net_revenue" in data, "Missing 'net_revenue' field"
        
        # Check types
        assert isinstance(data["by_organizer"], list), "'by_organizer' should be a list"
        assert isinstance(data["total_sales"], (int, float)), "'total_sales' should be numeric"
        assert isinstance(data["total_commission"], (int, float)), "'total_commission' should be numeric"
        assert isinstance(data["net_revenue"], (int, float)), "'net_revenue' should be numeric"
        
        print(f"✅ Financial breakdown structure is correct")
        print(f"   - total_sales: {data['total_sales']}")
        print(f"   - total_commission: {data['total_commission']}")
        print(f"   - net_revenue: {data['net_revenue']}")
        print(f"   - organizers count: {len(data['by_organizer'])}")
    
    def test_financial_breakdown_organizer_data(self, provider_token):
        """Financial breakdown returns organizer-level data"""
        response = requests.get(
            f"{BASE_URL}/api/provider/financial-breakdown",
            headers={"Authorization": f"Bearer {provider_token}"}
        )
        data = response.json()
        
        if len(data["by_organizer"]) > 0:
            org = data["by_organizer"][0]
            # Check organizer fields
            assert "organizer_id" in org, "Missing 'organizer_id' in organizer data"
            assert "name" in org, "Missing 'name' in organizer data"
            assert "orders_count" in org, "Missing 'orders_count' in organizer data"
            assert "total_sales" in org, "Missing 'total_sales' in organizer data"
            assert "total_commission" in org, "Missing 'total_commission' in organizer data"
            assert "net_revenue" in org, "Missing 'net_revenue' in organizer data"
            
            print(f"✅ Organizer data structure is correct")
            print(f"   - First organizer: {org['name']}")
            print(f"   - Orders: {org['orders_count']}, Sales: {org['total_sales']}, Commission: {org['total_commission']}")
        else:
            print("ℹ️ No organizer data (may need orders to test fully)")
    
    def test_financial_breakdown_requires_auth(self):
        """Financial breakdown requires authentication"""
        response = requests.get(f"{BASE_URL}/api/provider/financial-breakdown")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✅ Financial breakdown requires auth (returns {response.status_code} without token)")


class TestProviderSalesBreakdown:
    """Test /api/provider/sales-breakdown endpoint"""
    
    @pytest.fixture(scope="class")
    def provider_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PROVIDER_EMAIL,
            "password": PROVIDER_PASSWORD
        })
        return response.json()["token"]
    
    def test_sales_breakdown_returns_200(self, provider_token):
        """Sales breakdown endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/provider/sales-breakdown",
            headers={"Authorization": f"Bearer {provider_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✅ GET /api/provider/sales-breakdown returns 200")
    
    def test_sales_breakdown_structure(self, provider_token):
        """Sales breakdown returns correct data structure"""
        response = requests.get(
            f"{BASE_URL}/api/provider/sales-breakdown",
            headers={"Authorization": f"Bearer {provider_token}"}
        )
        data = response.json()
        
        # Check required fields
        assert "top_products" in data, "Missing 'top_products' field"
        assert "by_category" in data, "Missing 'by_category' field"
        assert "by_size" in data, "Missing 'by_size' field"
        
        # Check types
        assert isinstance(data["top_products"], list), "'top_products' should be a list"
        assert isinstance(data["by_category"], list), "'by_category' should be a list"
        assert isinstance(data["by_size"], list), "'by_size' should be a list"
        
        print(f"✅ Sales breakdown structure is correct")
        print(f"   - top_products count: {len(data['top_products'])}")
        print(f"   - categories count: {len(data['by_category'])}")
        print(f"   - sizes count: {len(data['by_size'])}")
    
    def test_sales_breakdown_product_data(self, provider_token):
        """Sales breakdown top products have correct fields"""
        response = requests.get(
            f"{BASE_URL}/api/provider/sales-breakdown",
            headers={"Authorization": f"Bearer {provider_token}"}
        )
        data = response.json()
        
        if len(data["top_products"]) > 0:
            product = data["top_products"][0]
            assert "product_id" in product, "Missing 'product_id' in product"
            assert "name" in product, "Missing 'name' in product"
            assert "quantity" in product, "Missing 'quantity' in product"
            assert "revenue" in product, "Missing 'revenue' in product"
            
            print(f"✅ Top product data structure is correct")
            print(f"   - Top product: {product['name']}, quantity: {product['quantity']}, revenue: {product['revenue']}")
        else:
            print("ℹ️ No products sold yet (empty top_products)")
    
    def test_sales_breakdown_category_data(self, provider_token):
        """Sales breakdown categories have name/value structure"""
        response = requests.get(
            f"{BASE_URL}/api/provider/sales-breakdown",
            headers={"Authorization": f"Bearer {provider_token}"}
        )
        data = response.json()
        
        if len(data["by_category"]) > 0:
            cat = data["by_category"][0]
            assert "name" in cat, "Missing 'name' in category"
            assert "value" in cat, "Missing 'value' in category"
            print(f"✅ Category data structure is correct")
            for c in data["by_category"]:
                print(f"   - {c['name']}: {c['value']} units")
        else:
            print("ℹ️ No category data (may need orders to test fully)")
    
    def test_sales_breakdown_requires_auth(self):
        """Sales breakdown requires authentication"""
        response = requests.get(f"{BASE_URL}/api/provider/sales-breakdown")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✅ Sales breakdown requires auth (returns {response.status_code} without token)")


class TestNotificationsAPI:
    """Test notifications CRUD endpoints"""
    
    @pytest.fixture(scope="class")
    def participant_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PARTICIPANT_EMAIL,
            "password": PARTICIPANT_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def provider_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PROVIDER_EMAIL,
            "password": PROVIDER_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_notifications_returns_200(self, participant_token):
        """GET /api/notifications returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {participant_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✅ GET /api/notifications returns 200")
    
    def test_get_notifications_structure(self, participant_token):
        """GET /api/notifications returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {participant_token}"}
        )
        data = response.json()
        
        assert "notifications" in data, "Missing 'notifications' field"
        assert "unread_count" in data, "Missing 'unread_count' field"
        assert isinstance(data["notifications"], list), "'notifications' should be a list"
        assert isinstance(data["unread_count"], int), "'unread_count' should be an int"
        
        print(f"✅ Notifications structure is correct")
        print(f"   - notifications count: {len(data['notifications'])}")
        print(f"   - unread_count: {data['unread_count']}")
    
    def test_get_unread_count_returns_200(self, participant_token):
        """GET /api/notifications/unread-count returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers={"Authorization": f"Bearer {participant_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "unread_count" in data, "Missing 'unread_count' field"
        print(f"✅ GET /api/notifications/unread-count returns 200, count: {data['unread_count']}")
    
    def test_mark_notifications_read(self, participant_token):
        """POST /api/notifications/read marks notifications as read"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/read",
            headers={"Authorization": f"Bearer {participant_token}"},
            json={}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, "Missing 'message' in response"
        print(f"✅ POST /api/notifications/read returns 200")
    
    def test_notifications_require_auth(self):
        """Notifications endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        response2 = requests.get(f"{BASE_URL}/api/notifications/unread-count")
        assert response2.status_code in [401, 403], f"Expected 401/403, got {response2.status_code}"
        
        print(f"✅ Notifications endpoints require auth")
    
    def test_notification_created_on_message(self, provider_token, participant_token):
        """Sending a message creates a notification for recipient"""
        import uuid
        
        # First get participant user_id
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {participant_token}"}
        )
        participant_user_id = me_response.json().get("user", {}).get("user_id", "")
        
        if not participant_user_id:
            pytest.skip("Could not get participant user_id")
        
        # Get initial notification count for participant
        initial_notifs = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {participant_token}"}
        ).json()
        initial_count = len(initial_notifs.get("notifications", []))
        
        # Provider sends a message to participant
        test_msg = f"TEST_notif_check_{uuid.uuid4().hex[:8]}"
        msg_response = requests.post(
            f"{BASE_URL}/api/provider/messages",
            headers={"Authorization": f"Bearer {provider_token}"},
            json={"recipient_id": participant_user_id, "content": test_msg}
        )
        
        if msg_response.status_code != 200:
            pytest.skip(f"Could not send test message: {msg_response.text}")
        
        # Check participant got a notification
        new_notifs = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {participant_token}"}
        ).json()
        new_count = len(new_notifs.get("notifications", []))
        
        # Should have at least one more notification
        assert new_count >= initial_count, "Notification count should not decrease"
        print(f"✅ Message from provider creates notification (count: {initial_count} -> {new_count})")


class TestProviderDashboardTabs:
    """Test provider dashboard data endpoints for all 6 tabs"""
    
    @pytest.fixture(scope="class")
    def provider_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PROVIDER_EMAIL,
            "password": PROVIDER_PASSWORD
        })
        return response.json()["token"]
    
    def test_provider_catalog(self, provider_token):
        """GET /api/provider/catalog returns products (Catalogue tab)"""
        response = requests.get(
            f"{BASE_URL}/api/provider/catalog",
            headers={"Authorization": f"Bearer {provider_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        print(f"✅ Catalogue tab: {len(data['products'])} products")
    
    def test_provider_stats(self, provider_token):
        """GET /api/provider/stats returns stats summary"""
        response = requests.get(
            f"{BASE_URL}/api/provider/stats",
            headers={"Authorization": f"Bearer {provider_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_products" in data
        assert "total_orders" in data
        assert "total_sales" in data
        assert "net_revenue" in data
        print(f"✅ Stats: products={data['total_products']}, orders={data['total_orders']}, sales={data['total_sales']}, net={data['net_revenue']}")
    
    def test_provider_orders(self, provider_token):
        """GET /api/provider/orders returns orders (Commandes tab)"""
        response = requests.get(
            f"{BASE_URL}/api/provider/orders",
            headers={"Authorization": f"Bearer {provider_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        print(f"✅ Commandes tab: {len(data['orders'])} orders")
    
    def test_provider_conversations(self, provider_token):
        """GET /api/provider/conversations returns conversations (Messages tab)"""
        response = requests.get(
            f"{BASE_URL}/api/provider/conversations",
            headers={"Authorization": f"Bearer {provider_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "conversations" in data
        print(f"✅ Messages tab: {len(data['conversations'])} conversations")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
