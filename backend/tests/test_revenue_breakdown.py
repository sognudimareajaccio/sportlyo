"""
Tests for /api/admin/revenue-breakdown endpoint
New Revenus section feature - Admin Dashboard revenue breakdown by 5 sources
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRevenueBreakdownEndpoint:
    """Tests for GET /api/admin/revenue-breakdown endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sportsconnect.fr",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture(scope="class")
    def non_admin_token(self):
        """Get non-admin token to test authorization"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "alice@test.com",
            "password": "alice123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None

    def test_revenue_breakdown_returns_200(self, admin_token):
        """Test that endpoint returns 200 for admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/revenue-breakdown",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: GET /api/admin/revenue-breakdown returns 200")
    
    def test_revenue_breakdown_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/revenue-breakdown")
        assert response.status_code in [401, 422], f"Expected 401/422, got {response.status_code}"
        print("PASS: Endpoint requires authentication")
    
    def test_revenue_breakdown_requires_admin_role(self, non_admin_token):
        """Test that endpoint requires admin role"""
        if non_admin_token is None:
            pytest.skip("No non-admin user available for test")
        response = requests.get(
            f"{BASE_URL}/api/admin/revenue-breakdown",
            headers={"Authorization": f"Bearer {non_admin_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: Endpoint requires admin role")

    def test_sources_structure(self, admin_token):
        """Test that sources contains 5 keys with correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/revenue-breakdown",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        # Verify sources exists
        assert "sources" in data, "Missing 'sources' key"
        sources = data["sources"]
        
        # Verify all 5 source keys exist
        expected_keys = ["inscriptions", "dons", "sponsors", "produits", "abonnements"]
        for key in expected_keys:
            assert key in sources, f"Missing source key: {key}"
        
        print(f"PASS: sources contains all 5 required keys: {expected_keys}")
    
    def test_source_fields_structure(self, admin_token):
        """Test each source has total, fees, count, label fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/revenue-breakdown",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        sources = data["sources"]
        
        required_fields = ["total", "fees", "count", "label"]
        for source_key, source_data in sources.items():
            for field in required_fields:
                assert field in source_data, f"Source '{source_key}' missing field: {field}"
        
        print("PASS: All sources have required fields (total, fees, count, label)")
    
    def test_source_labels_correct(self, admin_token):
        """Test that source labels are correct"""
        response = requests.get(
            f"{BASE_URL}/api/admin/revenue-breakdown",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        sources = data["sources"]
        
        expected_labels = {
            "inscriptions": "Inscriptions evenements",
            "dons": "Dons",
            "sponsors": "Sponsors & Mecenes",
            "produits": "Produits derives",
            "abonnements": "Abonnements partenaires"
        }
        
        for key, expected_label in expected_labels.items():
            actual_label = sources[key]["label"]
            assert actual_label == expected_label, f"Source '{key}' has wrong label: {actual_label}"
        
        print("PASS: All source labels are correct")
    
    def test_grand_total_and_fees(self, admin_token):
        """Test grand_total and grand_fees are present and numeric"""
        response = requests.get(
            f"{BASE_URL}/api/admin/revenue-breakdown",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        assert "grand_total" in data, "Missing grand_total"
        assert "grand_fees" in data, "Missing grand_fees"
        assert isinstance(data["grand_total"], (int, float)), "grand_total must be numeric"
        assert isinstance(data["grand_fees"], (int, float)), "grand_fees must be numeric"
        
        print(f"PASS: grand_total={data['grand_total']}, grand_fees={data['grand_fees']}")
    
    def test_monthly_array_has_12_entries(self, admin_token):
        """Test monthly array has 12 entries"""
        response = requests.get(
            f"{BASE_URL}/api/admin/revenue-breakdown",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        assert "monthly" in data, "Missing 'monthly' key"
        assert isinstance(data["monthly"], list), "monthly must be an array"
        assert len(data["monthly"]) == 12, f"monthly should have 12 entries, got {len(data['monthly'])}"
        
        print("PASS: monthly array has 12 entries")
    
    def test_monthly_entry_structure(self, admin_token):
        """Test each monthly entry has required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/revenue-breakdown",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        monthly = data["monthly"]
        
        required_fields = ["month", "inscriptions", "dons", "sponsors", "produits", "frais_plateforme", "total"]
        for i, entry in enumerate(monthly):
            for field in required_fields:
                assert field in entry, f"Monthly entry {i} missing field: {field}"
        
        print("PASS: All monthly entries have required fields")
    
    def test_recent_transactions_structure(self, admin_token):
        """Test recent_transactions array with correct entry structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/revenue-breakdown",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        assert "recent_transactions" in data, "Missing 'recent_transactions' key"
        assert isinstance(data["recent_transactions"], list), "recent_transactions must be an array"
        
        # Check structure of entries if any exist
        if len(data["recent_transactions"]) > 0:
            required_fields = ["type", "label", "amount", "fee", "date", "status"]
            for i, tx in enumerate(data["recent_transactions"]):
                for field in required_fields:
                    assert field in tx, f"Transaction {i} missing field: {field}"
            
            # Check type values are valid
            valid_types = ["inscription", "don", "sponsor", "produit"]
            for tx in data["recent_transactions"]:
                assert tx["type"] in valid_types, f"Invalid transaction type: {tx['type']}"
        
        print(f"PASS: recent_transactions has {len(data['recent_transactions'])} entries with correct structure")
    
    def test_data_consistency(self, admin_token):
        """Test that grand_total equals sum of source totals"""
        response = requests.get(
            f"{BASE_URL}/api/admin/revenue-breakdown",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        sources_sum = sum(src["total"] for src in data["sources"].values())
        grand_total = data["grand_total"]
        
        # Allow small floating point difference
        assert abs(sources_sum - grand_total) < 0.01, \
            f"grand_total ({grand_total}) != sum of sources ({sources_sum})"
        
        print(f"PASS: Data consistent - sources sum ({sources_sum}) matches grand_total ({grand_total})")
    
    def test_actual_data_values(self, admin_token):
        """Test that actual data values are reasonable"""
        response = requests.get(
            f"{BASE_URL}/api/admin/revenue-breakdown",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        # Based on agent context: inscriptions 103.85€, sponsors 5000€
        inscriptions = data["sources"]["inscriptions"]["total"]
        sponsors = data["sources"]["sponsors"]["total"]
        
        print(f"Current data - inscriptions: {inscriptions}€, sponsors: {sponsors}€")
        assert inscriptions >= 0, "inscriptions should be >= 0"
        assert sponsors >= 0, "sponsors should be >= 0"
        
        print("PASS: Actual data values are reasonable")
