"""
Test Phase C: Admin Commission System (1€ per provider product sold)
Tests for:
- GET /api/admin/commissions - returns commission data
- GET /api/provider/stats - includes total_admin_commission and net_revenue
- GET /api/provider/financial-breakdown - includes admin_commission per organizer
- POST /api/shop/order - correctly calculates admin_commission_total
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@sportsconnect.fr",
        "password": "admin123"
    })
    if res.status_code == 200:
        return res.json().get("token")
    pytest.skip("Admin login failed")

@pytest.fixture(scope="module")
def provider_token():
    """Get provider auth token"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "boutique@sportlyo.fr",
        "password": "boutique123"
    })
    if res.status_code == 200:
        return res.json().get("token")
    pytest.skip("Provider login failed")

@pytest.fixture(scope="module")
def participant_token():
    """Get participant auth token"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "pierre@test.com",
        "password": "test1234"
    })
    if res.status_code == 200:
        return res.json().get("token")
    pytest.skip("Participant login failed")


class TestAdminCommissionsEndpoint:
    """Test GET /api/admin/commissions"""
    
    def test_admin_commissions_requires_auth(self):
        """Commission endpoint requires authentication"""
        res = requests.get(f"{BASE_URL}/api/admin/commissions")
        assert res.status_code == 401
        print("PASS: /api/admin/commissions returns 401 without auth")
    
    def test_admin_commissions_requires_admin_role(self, provider_token):
        """Commission endpoint requires admin role"""
        headers = {"Authorization": f"Bearer {provider_token}"}
        res = requests.get(f"{BASE_URL}/api/admin/commissions", headers=headers)
        assert res.status_code == 403
        print("PASS: /api/admin/commissions returns 403 for non-admin")
    
    def test_admin_commissions_returns_expected_structure(self, admin_token):
        """Commission endpoint returns correct data structure"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        res = requests.get(f"{BASE_URL}/api/admin/commissions", headers=headers)
        assert res.status_code == 200
        data = res.json()
        
        # Check required fields exist
        assert "total_admin_commission" in data
        assert "total_provider_items_sold" in data
        assert "total_orders_with_provider" in data
        assert "by_provider" in data
        assert "recent_orders" in data
        
        # Validate data types
        assert isinstance(data["total_admin_commission"], (int, float))
        assert isinstance(data["total_provider_items_sold"], int)
        assert isinstance(data["total_orders_with_provider"], int)
        assert isinstance(data["by_provider"], list)
        assert isinstance(data["recent_orders"], list)
        
        print(f"PASS: /api/admin/commissions returns correct structure")
        print(f"  - total_admin_commission: {data['total_admin_commission']}€")
        print(f"  - total_provider_items_sold: {data['total_provider_items_sold']}")
        print(f"  - total_orders_with_provider: {data['total_orders_with_provider']}")
    
    def test_admin_commissions_by_provider_structure(self, admin_token):
        """by_provider breakdown has correct structure"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        res = requests.get(f"{BASE_URL}/api/admin/commissions", headers=headers)
        assert res.status_code == 200
        data = res.json()
        
        if len(data["by_provider"]) > 0:
            prov = data["by_provider"][0]
            assert "provider_id" in prov
            assert "name" in prov
            assert "items_sold" in prov
            assert "commission" in prov
            assert "orders_count" in prov
            print(f"PASS: by_provider[0] has correct structure: {prov['name']}, {prov['commission']}€")
        else:
            print("INFO: No providers with commissions yet")
    
    def test_admin_commissions_recent_orders_structure(self, admin_token):
        """recent_orders has correct structure"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        res = requests.get(f"{BASE_URL}/api/admin/commissions", headers=headers)
        assert res.status_code == 200
        data = res.json()
        
        if len(data["recent_orders"]) > 0:
            order = data["recent_orders"][0]
            assert "order_id" in order
            assert "admin_commission" in order
            assert "total" in order
            print(f"PASS: recent_orders[0] has correct structure: {order['order_id']}, commission: {order['admin_commission']}€")
        else:
            print("INFO: No recent orders with commission yet")


class TestProviderStatsEndpoint:
    """Test GET /api/provider/stats includes admin commission"""
    
    def test_provider_stats_requires_auth(self):
        """Provider stats requires authentication"""
        res = requests.get(f"{BASE_URL}/api/provider/stats")
        assert res.status_code == 401
        print("PASS: /api/provider/stats returns 401 without auth")
    
    def test_provider_stats_returns_admin_commission(self, provider_token):
        """Provider stats includes admin commission and net revenue"""
        headers = {"Authorization": f"Bearer {provider_token}"}
        res = requests.get(f"{BASE_URL}/api/provider/stats", headers=headers)
        assert res.status_code == 200
        data = res.json()
        
        # Check required fields for commission model
        assert "total_admin_commission" in data
        assert "net_revenue" in data
        assert "total_sales" in data
        assert "total_commission_given" in data
        
        # Validate admin commission is numeric
        assert isinstance(data["total_admin_commission"], (int, float))
        assert isinstance(data["net_revenue"], (int, float))
        
        # Verify net_revenue calculation: total_sales - commission_given - admin_commission
        expected_net = data["total_sales"] - data["total_commission_given"] - data["total_admin_commission"]
        actual_net = data["net_revenue"]
        # Allow small floating point variance
        assert abs(expected_net - actual_net) < 0.01
        
        print(f"PASS: /api/provider/stats includes admin commission fields")
        print(f"  - total_admin_commission: {data['total_admin_commission']}€")
        print(f"  - net_revenue: {data['net_revenue']}€")
        print(f"  - net_revenue formula verified: total_sales({data['total_sales']}) - org_commission({data['total_commission_given']}) - admin_commission({data['total_admin_commission']}) = {expected_net}")


class TestProviderFinancialBreakdownEndpoint:
    """Test GET /api/provider/financial-breakdown"""
    
    def test_financial_breakdown_requires_auth(self):
        """Financial breakdown requires authentication"""
        res = requests.get(f"{BASE_URL}/api/provider/financial-breakdown")
        assert res.status_code == 401
        print("PASS: /api/provider/financial-breakdown returns 401 without auth")
    
    def test_financial_breakdown_returns_admin_commission(self, provider_token):
        """Financial breakdown includes admin_commission per organizer"""
        headers = {"Authorization": f"Bearer {provider_token}"}
        res = requests.get(f"{BASE_URL}/api/provider/financial-breakdown", headers=headers)
        assert res.status_code == 200
        data = res.json()
        
        # Check top-level totals
        assert "total_admin_commission" in data
        assert "net_revenue" in data
        assert "by_organizer" in data
        
        print(f"PASS: /api/provider/financial-breakdown returns admin commission fields")
        print(f"  - total_admin_commission: {data['total_admin_commission']}€")
        print(f"  - net_revenue: {data['net_revenue']}€")
        
        # Check by_organizer breakdown
        if len(data["by_organizer"]) > 0:
            org = data["by_organizer"][0]
            assert "admin_commission" in org
            assert "net_revenue" in org
            assert "total_commission" in org
            print(f"  - by_organizer[0]: {org.get('name', 'unknown')}, admin_commission: {org['admin_commission']}€, net_revenue: {org['net_revenue']}€")
        else:
            print("  - No organizer breakdown available yet")


class TestShopOrderAdminCommission:
    """Test POST /api/shop/order calculates admin_commission_total"""
    
    def test_create_order_with_provider_product(self, participant_token, provider_token):
        """Creating order with provider product generates admin commission"""
        # First get a product with provider_id from an event shop
        headers = {"Authorization": f"Bearer {provider_token}"}
        
        # Get products from the shop (provider products linked to events)
        shop_res = requests.get(f"{BASE_URL}/api/events/evt_seed_marathon_lyon/shop")
        if shop_res.status_code != 200:
            pytest.skip("Could not get event shop")
        
        products = shop_res.json().get("products", [])
        provider_products = [p for p in products if p.get("provider_id")]
        
        if not provider_products:
            pytest.skip("No provider products in event shop")
        
        product = provider_products[0]
        
        # Create order as participant
        part_headers = {"Authorization": f"Bearer {participant_token}"}
        order_data = {
            "event_id": "evt_seed_marathon_lyon",
            "items": [{
                "product_id": product["product_id"],
                "quantity": 2,
                "size": "M"
            }],
            "delivery_method": "Retrait sur place"
        }
        
        res = requests.post(f"{BASE_URL}/api/shop/order", json=order_data, headers=part_headers)
        
        # Check order was created successfully
        assert res.status_code == 200
        data = res.json()
        
        # Check order has admin_commission_total
        order = data.get("order", {})
        assert "admin_commission_total" in order
        
        # Admin commission should be 1€ per item for provider products
        # We ordered 2 items, so admin_commission_total should be 2.0
        assert order["admin_commission_total"] == 2.0
        
        print(f"PASS: Order created with admin_commission_total = {order['admin_commission_total']}€")
        print(f"  - Order ID: {order['order_id']}")
        print(f"  - Product: {product['name']}")
        print(f"  - Quantity: 2, Admin Commission: 2.0€ (1€ per item)")


class TestExistingOrdersMigration:
    """Test that existing orders have admin_commission_total backfilled"""
    
    def test_admin_commission_totals_exist(self, admin_token):
        """Verify admin commission totals are present in the system"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        res = requests.get(f"{BASE_URL}/api/admin/commissions", headers=headers)
        assert res.status_code == 200
        data = res.json()
        
        # Based on context note: "Total admin commission should be 6€ (6 items at 1€ each)"
        total_commission = data["total_admin_commission"]
        total_items = data["total_provider_items_sold"]
        
        print(f"INFO: Current admin commission totals:")
        print(f"  - Total admin commission: {total_commission}€")
        print(f"  - Total provider items sold: {total_items}")
        print(f"  - Orders with provider products: {data['total_orders_with_provider']}")
        
        # Commission should equal items sold (1€ per item)
        # Allow for some variance due to test orders
        assert abs(total_commission - total_items) < 1.0
        print(f"PASS: Admin commission matches items sold (1€ per item model verified)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
