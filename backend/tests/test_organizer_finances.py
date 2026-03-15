"""
Test suite for Organizer Finances & Revenue Breakdown API
Tests: GET /api/organizer/revenue-breakdown
Features: 5 revenue sources (inscriptions, dons, sponsors, produits, reservations)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ORGANIZER_EMAIL = "club@paris-sport.fr"
ORGANIZER_PASSWORD = "club123"


@pytest.fixture(scope="module")
def organizer_token():
    """Authenticate as organizer and get token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ORGANIZER_EMAIL, "password": ORGANIZER_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Could not authenticate as organizer")


@pytest.fixture
def auth_headers(organizer_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {organizer_token}", "Content-Type": "application/json"}


class TestOrganizerRevenueBreakdown:
    """Test organizer revenue-breakdown endpoint"""
    
    def test_revenue_breakdown_requires_auth(self):
        """Endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/organizer/revenue-breakdown")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Revenue breakdown requires authentication")
    
    def test_revenue_breakdown_returns_200(self, auth_headers):
        """Endpoint should return 200 for authenticated organizer"""
        response = requests.get(
            f"{BASE_URL}/api/organizer/revenue-breakdown",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Revenue breakdown returns 200 for authenticated organizer")
    
    def test_response_has_sources_with_5_keys(self, auth_headers):
        """Sources should have exactly 5 revenue source keys"""
        response = requests.get(
            f"{BASE_URL}/api/organizer/revenue-breakdown",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "sources" in data, "Missing 'sources' in response"
        sources = data["sources"]
        
        expected_keys = {"inscriptions", "dons", "sponsors", "produits", "reservations"}
        actual_keys = set(sources.keys())
        
        assert actual_keys == expected_keys, f"Expected keys {expected_keys}, got {actual_keys}"
        print(f"PASS: sources has 5 keys: {list(sources.keys())}")
    
    def test_source_structure_has_required_fields(self, auth_headers):
        """Each source should have total, fees, net, count, label"""
        response = requests.get(
            f"{BASE_URL}/api/organizer/revenue-breakdown",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        sources = data["sources"]
        
        required_fields = {"total", "fees", "net", "count", "label"}
        
        for source_key, source_data in sources.items():
            for field in required_fields:
                assert field in source_data, f"Missing '{field}' in source '{source_key}'"
            print(f"  - {source_key}: total={source_data['total']}, fees={source_data['fees']}, net={source_data['net']}, count={source_data['count']}, label='{source_data['label']}'")
        
        print("PASS: All sources have required fields (total, fees, net, count, label)")
    
    def test_source_labels_are_correct(self, auth_headers):
        """Source labels should match expected French labels"""
        response = requests.get(
            f"{BASE_URL}/api/organizer/revenue-breakdown",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        sources = data["sources"]
        
        expected_labels = {
            "inscriptions": "Inscriptions evenements",
            "dons": "Dons",
            "sponsors": "Sponsors & Mecenes",
            "produits": "Produits derives",
            "reservations": "Reservations entreprises"
        }
        
        for key, expected_label in expected_labels.items():
            assert sources[key]["label"] == expected_label, f"Label mismatch for '{key}': expected '{expected_label}', got '{sources[key]['label']}'"
        
        print("PASS: All source labels are correct")
    
    def test_grand_totals_present(self, auth_headers):
        """Response should have grand_total, grand_fees, grand_net"""
        response = requests.get(
            f"{BASE_URL}/api/organizer/revenue-breakdown",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "grand_total" in data, "Missing grand_total"
        assert "grand_fees" in data, "Missing grand_fees"
        assert "grand_net" in data, "Missing grand_net"
        
        print(f"PASS: grand_total={data['grand_total']}€, grand_fees={data['grand_fees']}€, grand_net={data['grand_net']}€")
    
    def test_monthly_has_12_entries(self, auth_headers):
        """Monthly array should have exactly 12 entries"""
        response = requests.get(
            f"{BASE_URL}/api/organizer/revenue-breakdown",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "monthly" in data, "Missing 'monthly' in response"
        monthly = data["monthly"]
        
        assert len(monthly) == 12, f"Expected 12 monthly entries, got {len(monthly)}"
        print(f"PASS: monthly has 12 entries: {[m['month'] for m in monthly]}")
    
    def test_monthly_entry_structure(self, auth_headers):
        """Each monthly entry should have month and 5 revenue source fields + total"""
        response = requests.get(
            f"{BASE_URL}/api/organizer/revenue-breakdown",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        monthly = data["monthly"]
        
        required_fields = {"month", "inscriptions", "dons", "sponsors", "produits", "reservations", "total"}
        
        for entry in monthly:
            for field in required_fields:
                assert field in entry, f"Missing '{field}' in monthly entry"
        
        print("PASS: Monthly entries have correct structure (month, inscriptions, dons, sponsors, produits, reservations, total)")
    
    def test_events_breakdown_structure(self, auth_headers):
        """Events breakdown should have per-event data with inscriptions info"""
        response = requests.get(
            f"{BASE_URL}/api/organizer/revenue-breakdown",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "events_breakdown" in data, "Missing 'events_breakdown' in response"
        events = data["events_breakdown"]
        
        if len(events) > 0:
            required_fields = {"event_id", "title", "inscriptions_total", "inscriptions_fees", "inscriptions_count", "price", "current_participants", "max_participants"}
            
            for event in events:
                for field in required_fields:
                    assert field in event, f"Missing '{field}' in event breakdown"
            
            print(f"PASS: events_breakdown has {len(events)} events with required fields")
        else:
            print("PASS: events_breakdown is empty (organizer has no events)")
    
    def test_recent_transactions_structure(self, auth_headers):
        """Recent transactions should have type, label, amount, fee, date, status"""
        response = requests.get(
            f"{BASE_URL}/api/organizer/revenue-breakdown",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "recent_transactions" in data, "Missing 'recent_transactions' in response"
        transactions = data["recent_transactions"]
        
        if len(transactions) > 0:
            required_fields = {"type", "label", "amount", "fee", "date", "status"}
            
            for tx in transactions:
                for field in required_fields:
                    assert field in tx, f"Missing '{field}' in transaction"
            
            print(f"PASS: recent_transactions has {len(transactions)} entries with required fields")
            for tx in transactions[:3]:  # Print first 3
                print(f"  - {tx['type']}: {tx['label']} | {tx['amount']}€ | {tx['status']}")
        else:
            print("PASS: recent_transactions is empty (no transactions)")
    
    def test_data_consistency(self, auth_headers):
        """Grand total should equal sum of all sources totals"""
        response = requests.get(
            f"{BASE_URL}/api/organizer/revenue-breakdown",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        sources = data["sources"]
        calculated_total = sum(src["total"] for src in sources.values())
        
        assert abs(data["grand_total"] - calculated_total) < 0.01, f"Grand total mismatch: {data['grand_total']} vs calculated {calculated_total}"
        print(f"PASS: Data consistency verified (grand_total={data['grand_total']}€, sources sum={calculated_total}€)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
