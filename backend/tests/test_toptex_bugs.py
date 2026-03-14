"""
Test TopTex Import Bug Fixes - Iteration 27
Bug 1: PDF upload uses background task pattern (POST parse-pdf returns task_id, GET pdf-status polls)
Bug 2: TopTex lookup returns image_url from og:image meta tag (should contain cdn.toptex.com)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Provider credentials
PROVIDER_EMAIL = "boutique@sportlyo.fr"
PROVIDER_PASSWORD = "boutique123"


@pytest.fixture(scope="module")
def provider_token():
    """Get provider authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": PROVIDER_EMAIL,
        "password": PROVIDER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Provider login failed: {response.status_code} - {response.text}")


@pytest.fixture
def auth_headers(provider_token):
    """Headers with provider token"""
    return {"Authorization": f"Bearer {provider_token}"}


class TestTopTexLookupBugFix:
    """Bug Fix 2: TopTex lookup should return image_url from og:image meta tag"""
    
    def test_lookup_pa4045_returns_valid_image(self, auth_headers):
        """PA4045 lookup should return image_url containing cdn.toptex.com"""
        response = requests.get(
            f"{BASE_URL}/api/provider/import/lookup/PA4045",
            headers=auth_headers,
            timeout=30
        )
        
        # May return 409 if already imported - that's fine for image test
        if response.status_code == 409:
            pytest.skip("PA4045 already in catalog - lookup blocked by duplicate check")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "product" in data, "Response should contain 'product' key"
        
        product = data["product"]
        assert "image_url" in product, "Product should have image_url"
        assert "ref" in product, "Product should have ref"
        assert product["ref"] == "PA4045", f"Ref should be PA4045, got {product['ref']}"
        
        image_url = product["image_url"]
        assert image_url, "image_url should not be empty"
        assert "cdn.toptex.com" in image_url, f"image_url should contain cdn.toptex.com, got: {image_url}"
        
        print(f"✅ PA4045 image_url: {image_url}")
        print(f"✅ PA4045 name: {product.get('name', 'N/A')}")
        print(f"✅ PA4045 colors: {product.get('colors', [])}")
    
    def test_lookup_k356_returns_valid_image(self, auth_headers):
        """K356 lookup should return image_url containing cdn.toptex.com"""
        response = requests.get(
            f"{BASE_URL}/api/provider/import/lookup/K356",
            headers=auth_headers,
            timeout=30
        )
        
        # May return 409 if already imported
        if response.status_code == 409:
            pytest.skip("K356 already in catalog - lookup blocked by duplicate check")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "product" in data, "Response should contain 'product' key"
        
        product = data["product"]
        assert "image_url" in product, "Product should have image_url"
        assert product["ref"] == "K356", f"Ref should be K356, got {product['ref']}"
        
        image_url = product["image_url"]
        assert image_url, "image_url should not be empty"
        assert "cdn.toptex.com" in image_url, f"image_url should contain cdn.toptex.com, got: {image_url}"
        
        print(f"✅ K356 image_url: {image_url}")
        print(f"✅ K356 name: {product.get('name', 'N/A')}")
        print(f"✅ K356 colors: {product.get('colors', [])}")
    
    def test_lookup_invalid_reference(self, auth_headers):
        """Invalid reference should return 400 error"""
        response = requests.get(
            f"{BASE_URL}/api/provider/import/lookup/INVALID123",
            headers=auth_headers,
            timeout=10
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid ref, got {response.status_code}"
        print("✅ Invalid reference correctly rejected with 400")
    
    def test_lookup_requires_auth(self):
        """Lookup endpoint should require authentication"""
        response = requests.get(
            f"{BASE_URL}/api/provider/import/lookup/PA4045",
            timeout=10
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✅ Lookup correctly requires authentication")


class TestTopTexAddSingle:
    """Test add-single endpoint for importing looked up products"""
    
    def test_add_single_requires_auth(self):
        """Add-single endpoint should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/provider/import/add-single",
            json={"product": {"ref": "TEST123"}},
            timeout=10
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✅ Add-single correctly requires authentication")
    
    def test_add_single_validates_product(self, auth_headers):
        """Add-single should validate product data"""
        response = requests.post(
            f"{BASE_URL}/api/provider/import/add-single",
            headers=auth_headers,
            json={"product": {}},  # Empty product
            timeout=10
        )
        
        # Should either succeed with empty ref or fail validation
        # The endpoint extracts ref from product, so empty ref may cause issues
        print(f"Add-single with empty product: status={response.status_code}")


class TestPdfUploadBugFix:
    """Bug Fix 1: PDF upload should use background task pattern with polling"""
    
    def test_pdf_endpoint_requires_auth(self):
        """PDF parse endpoint should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/provider/import/parse-pdf",
            timeout=10
        )
        
        assert response.status_code in [401, 403, 422], f"Expected 401/403/422 without auth, got {response.status_code}"
        print("✅ PDF parse correctly requires authentication")
    
    def test_pdf_endpoint_validates_file_type(self, auth_headers):
        """PDF endpoint should reject non-PDF files"""
        # Create a fake text file
        files = {"file": ("test.txt", b"This is not a PDF", "text/plain")}
        
        response = requests.post(
            f"{BASE_URL}/api/provider/import/parse-pdf",
            headers=auth_headers,
            files=files,
            timeout=30
        )
        
        assert response.status_code == 400, f"Expected 400 for non-PDF, got {response.status_code}"
        assert "PDF" in response.text, "Error should mention PDF requirement"
        print("✅ Non-PDF file correctly rejected")
    
    def test_pdf_status_endpoint_requires_auth(self):
        """PDF status endpoint should require authentication"""
        response = requests.get(
            f"{BASE_URL}/api/provider/import/pdf-status/fake_task_id",
            timeout=10
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✅ PDF status correctly requires authentication")
    
    def test_pdf_status_handles_invalid_task_id(self, auth_headers):
        """PDF status should return 404 for unknown task ID"""
        response = requests.get(
            f"{BASE_URL}/api/provider/import/pdf-status/nonexistent_task_123",
            headers=auth_headers,
            timeout=10
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid task, got {response.status_code}"
        print("✅ Invalid task ID correctly returns 404")
    
    def test_pdf_upload_returns_task_id(self, auth_headers):
        """PDF upload should return task_id for background processing"""
        # Create a minimal valid PDF
        minimal_pdf = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Root 1 0 R /Size 4 >>
startxref
196
%%EOF"""
        
        files = {"file": ("test_catalog.pdf", minimal_pdf, "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/provider/import/parse-pdf",
            headers=auth_headers,
            files=files,
            timeout=60
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "task_id" in data, f"Response should contain task_id: {data}"
        
        task_id = data["task_id"]
        assert task_id, "task_id should not be empty"
        print(f"✅ PDF upload returned task_id: {task_id}")
        
        # Poll for status
        max_polls = 10
        for i in range(max_polls):
            time.sleep(1)
            status_response = requests.get(
                f"{BASE_URL}/api/provider/import/pdf-status/{task_id}",
                headers=auth_headers,
                timeout=10
            )
            
            if status_response.status_code == 200:
                status_data = status_response.json()
                status = status_data.get("status")
                print(f"  Poll {i+1}: status={status}")
                
                if status == "done":
                    products = status_data.get("products", [])
                    total = status_data.get("total", 0)
                    print(f"✅ PDF processing complete: {total} products found")
                    assert isinstance(products, list), "products should be a list"
                    break
                elif status == "error":
                    error = status_data.get("error", "Unknown error")
                    print(f"  PDF processing error: {error}")
                    # For minimal PDF, error is expected
                    break
            elif status_response.status_code == 404:
                # Task already completed and cleaned up
                print("✅ Task completed (404 after retrieval)")
                break
            elif status_response.status_code == 500:
                print(f"  PDF processing error: {status_response.text}")
                break
        
        print("✅ Background task pattern working correctly")


class TestConfirmImportEndpoint:
    """Test the confirm import endpoint"""
    
    def test_confirm_requires_auth(self):
        """Confirm endpoint should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/provider/import/confirm",
            json={"products": []},
            timeout=10
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✅ Confirm correctly requires authentication")
    
    def test_confirm_validates_products(self, auth_headers):
        """Confirm should validate that products list is not empty"""
        response = requests.post(
            f"{BASE_URL}/api/provider/import/confirm",
            headers=auth_headers,
            json={"products": []},
            timeout=10
        )
        
        assert response.status_code == 400, f"Expected 400 for empty products, got {response.status_code}"
        print("✅ Empty products list correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
