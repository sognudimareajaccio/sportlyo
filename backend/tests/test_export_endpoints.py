"""
Test suite for Export Endpoints (CSV/PDF)
Tests: Admin payments export, Organizer payments export, date filtering, auth requirements
"""

import pytest
import requests
import os
from io import BytesIO

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test Credentials
ADMIN_EMAIL = "admin@sportsconnect.fr"
ADMIN_PASSWORD = "admin123"
ORGANIZER_EMAIL = "club@paris-sport.fr"
ORGANIZER_PASSWORD = "club123"
PARTICIPANT_EMAIL = "sophie@test.com"
PARTICIPANT_PASSWORD = "test1234"


class TestExportEndpoints:
    """Test CSV and PDF export endpoints for admin and organizer"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    def get_auth_token(self, email, password):
        """Helper to get authentication token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            return response.json().get("token")
        return None

    # ============== ADMIN EXPORT TESTS ==============

    def test_admin_export_csv_success(self):
        """Test: Admin can export payments as CSV"""
        token = self.get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token, "Admin login failed"

        response = self.session.get(
            f"{BASE_URL}/api/admin/payments/export?format=csv",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "text/csv" in response.headers.get("Content-Type", ""), "Content-Type should be text/csv"
        assert "attachment" in response.headers.get("Content-Disposition", ""), "Should have attachment disposition"
        
        # Verify CSV content structure
        content = response.content.decode('utf-8-sig')
        assert "Participant" in content, "CSV should contain Participant column"
        assert "Email" in content, "CSV should contain Email column"
        assert "Événement" in content or "Evenement" in content, "CSV should contain Event column"
        assert "Prix base" in content, "CSV should contain Base price column"
        assert "Frais service 5%" in content, "CSV should contain Service fee column"
        assert "Total payé" in content or "Total paye" in content, "CSV should contain Total paid column"
        assert "Frais Stripe" in content, "CSV should contain Stripe fee column"
        assert "TOTAL" in content, "CSV should contain TOTAL row"
        print(f"✅ Admin CSV export successful - Content length: {len(content)} bytes")

    def test_admin_export_pdf_success(self):
        """Test: Admin can export payments as PDF"""
        token = self.get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token, "Admin login failed"

        response = self.session.get(
            f"{BASE_URL}/api/admin/payments/export?format=pdf",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "application/pdf" in response.headers.get("Content-Type", ""), "Content-Type should be application/pdf"
        
        # Verify PDF magic bytes (%PDF-)
        content = response.content
        assert content[:4] == b'%PDF', f"PDF should start with %PDF, got {content[:4]}"
        print(f"✅ Admin PDF export successful - File size: {len(content)} bytes")

    def test_admin_export_csv_with_date_filter(self):
        """Test: Admin CSV export with date filters"""
        token = self.get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token, "Admin login failed"

        # Use today's date for filter test
        response = self.session.get(
            f"{BASE_URL}/api/admin/payments/export?format=csv&start_date=2026-01-01&end_date=2026-12-31",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        content = response.content.decode('utf-8-sig')
        assert "SportsConnect" in content, "CSV should contain SportsConnect title"
        print("✅ Admin CSV export with date filter successful")

    def test_admin_export_pdf_with_date_filter(self):
        """Test: Admin PDF export with date filters"""
        token = self.get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token, "Admin login failed"

        response = self.session.get(
            f"{BASE_URL}/api/admin/payments/export?format=pdf&start_date=2026-03-01&end_date=2026-03-31",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.content[:4] == b'%PDF', "Should return valid PDF"
        print("✅ Admin PDF export with date filter successful")

    # ============== ORGANIZER EXPORT TESTS ==============

    def test_organizer_export_csv_success(self):
        """Test: Organizer can export their payments as CSV"""
        token = self.get_auth_token(ORGANIZER_EMAIL, ORGANIZER_PASSWORD)
        assert token, "Organizer login failed"

        response = self.session.get(
            f"{BASE_URL}/api/organizer/payments/export?format=csv",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Note: May return 404 if no completed payments for organizer
        if response.status_code == 404:
            assert "Aucun" in response.json().get("detail", ""), "Should indicate no events/payments found"
            print("✅ Organizer CSV export returns 404 when no payments (expected behavior)")
        else:
            assert response.status_code == 200, f"Expected 200 or 404, got {response.status_code}"
            assert "text/csv" in response.headers.get("Content-Type", "")
            print("✅ Organizer CSV export successful")

    def test_organizer_export_pdf_success(self):
        """Test: Organizer can export their payments as PDF"""
        token = self.get_auth_token(ORGANIZER_EMAIL, ORGANIZER_PASSWORD)
        assert token, "Organizer login failed"

        response = self.session.get(
            f"{BASE_URL}/api/organizer/payments/export?format=pdf",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 404:
            assert "Aucun" in response.json().get("detail", "")
            print("✅ Organizer PDF export returns 404 when no payments (expected behavior)")
        else:
            assert response.status_code == 200, f"Expected 200 or 404, got {response.status_code}"
            if response.status_code == 200:
                assert response.content[:4] == b'%PDF', "Should return valid PDF"
            print("✅ Organizer PDF export successful")

    def test_organizer_export_with_date_filter(self):
        """Test: Organizer CSV export with date filters"""
        token = self.get_auth_token(ORGANIZER_EMAIL, ORGANIZER_PASSWORD)
        assert token, "Organizer login failed"

        response = self.session.get(
            f"{BASE_URL}/api/organizer/payments/export?format=csv&start_date=2026-01-01&end_date=2026-12-31",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Accept both 200 (if payments exist) and 404 (if no payments)
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        print("✅ Organizer CSV export with date filter handled correctly")

    # ============== AUTHORIZATION TESTS ==============

    def test_admin_export_requires_admin_role(self):
        """Test: Non-admin cannot access admin export endpoint"""
        # Try with participant credentials
        token = self.get_auth_token(PARTICIPANT_EMAIL, PARTICIPANT_PASSWORD)
        assert token, "Participant login failed"

        response = self.session.get(
            f"{BASE_URL}/api/admin/payments/export?format=csv",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("✅ Admin export correctly rejects non-admin users (403)")

    def test_organizer_export_requires_organizer_role(self):
        """Test: Non-organizer cannot access organizer export endpoint"""
        token = self.get_auth_token(PARTICIPANT_EMAIL, PARTICIPANT_PASSWORD)
        assert token, "Participant login failed"

        response = self.session.get(
            f"{BASE_URL}/api/organizer/payments/export?format=csv",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403, f"Expected 403 for non-organizer, got {response.status_code}"
        print("✅ Organizer export correctly rejects non-organizer users (403)")

    def test_export_requires_authentication(self):
        """Test: Export endpoints require authentication"""
        # Test admin endpoint without auth
        response = self.session.get(f"{BASE_URL}/api/admin/payments/export?format=csv")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"

        # Test organizer endpoint without auth
        response = self.session.get(f"{BASE_URL}/api/organizer/payments/export?format=csv")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        
        print("✅ Export endpoints correctly require authentication (401)")

    # ============== CSV CONTENT VALIDATION ==============

    def test_csv_semicolon_delimiter(self):
        """Test: CSV uses semicolon delimiter (French format)"""
        token = self.get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token, "Admin login failed"

        response = self.session.get(
            f"{BASE_URL}/api/admin/payments/export?format=csv",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        content = response.content.decode('utf-8-sig')
        lines = content.strip().split('\n')
        
        # Check header row has semicolons
        if len(lines) >= 4:  # Title, date, empty line, headers
            header_line = lines[3]  # Headers should be on line 4
            assert ';' in header_line, f"CSV should use semicolon delimiter, got: {header_line[:100]}"
            print(f"✅ CSV correctly uses semicolon delimiter")

    def test_csv_utf8_bom_encoding(self):
        """Test: CSV uses UTF-8 BOM encoding"""
        token = self.get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token, "Admin login failed"

        response = self.session.get(
            f"{BASE_URL}/api/admin/payments/export?format=csv",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        raw_content = response.content
        
        # UTF-8 BOM is EF BB BF
        if len(raw_content) >= 3:
            has_bom = raw_content[0:3] == b'\xef\xbb\xbf'
            assert has_bom, "CSV should have UTF-8 BOM encoding"
            print("✅ CSV correctly uses UTF-8 BOM encoding")

    def test_csv_contains_completed_payments_only(self):
        """Test: CSV export only includes completed (PAYÉ) payments"""
        token = self.get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token, "Admin login failed"

        response = self.session.get(
            f"{BASE_URL}/api/admin/payments/export?format=csv",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        content = response.content.decode('utf-8-sig')
        
        # All data rows should have "Payé" status
        if "Payé" in content:
            # Verify no "En attente" or "pending" status in data
            assert "En attente" not in content.split("TOTAL")[0], "Should not contain pending payments"
            print("✅ CSV correctly contains only completed (Payé) payments")
        else:
            print("✅ CSV export valid (no completed payments found)")


class TestExportEdgeCases:
    """Test edge cases for export functionality"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    def get_auth_token(self, email, password):
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            return response.json().get("token")
        return None

    def test_invalid_format_parameter(self):
        """Test: Invalid format parameter returns error"""
        token = self.get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token, "Admin login failed"

        response = self.session.get(
            f"{BASE_URL}/api/admin/payments/export?format=xlsx",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # FastAPI should reject invalid format with 422
        assert response.status_code == 422, f"Expected 422 for invalid format, got {response.status_code}"
        print("✅ Invalid format parameter correctly rejected (422)")

    def test_empty_date_range(self):
        """Test: Empty date range still works (returns all)"""
        token = self.get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token, "Admin login failed"

        response = self.session.get(
            f"{BASE_URL}/api/admin/payments/export?format=csv&start_date=&end_date=",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200 with empty dates, got {response.status_code}"
        print("✅ Export with empty date parameters works correctly")

    def test_future_date_range(self):
        """Test: Future date range returns empty but valid CSV"""
        token = self.get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token, "Admin login failed"

        response = self.session.get(
            f"{BASE_URL}/api/admin/payments/export?format=csv&start_date=2030-01-01&end_date=2030-12-31",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        content = response.content.decode('utf-8-sig')
        # Should still have headers but 0 payments
        assert "0 paiement" in content or "TOTAL" in content, "Should have valid structure with 0 payments"
        print("✅ Future date range returns valid empty CSV")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
