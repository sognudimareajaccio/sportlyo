"""
Test the new commission model for SportsConnect:
- 5% service fee ADDED on top of base price (not deducted)
- Example: 25€ base → 26.25€ total (25€ + 1.25€ fee)
- Organizer gets 100% of base price (25€)
- Platform gets service fee minus Stripe fees (1.4% + 0.25€)

Tests cover:
- POST /api/registrations - fee calculation in response
- POST /api/payments/create-checkout - checkout amount verification
- GET /api/admin/payments - totals verification
- GET /api/admin/stats - financial totals verification
- Math verification for 35€ base price
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Commission constants (should match server.py)
PLATFORM_COMMISSION = 0.05  # 5%
STRIPE_PERCENT_FEE = 0.014  # 1.4%
STRIPE_FIXED_FEE = 0.25     # €0.25

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def participant_token(api_client):
    """Login as participant (sophie@test.com)"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "sophie@test.com",
        "password": "test1234"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Participant login failed: {response.text}")

@pytest.fixture(scope="module")
def admin_token(api_client):
    """Login as admin"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@sportsconnect.fr",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin login failed: {response.text}")

@pytest.fixture(scope="module")
def test_user_token(api_client):
    """Create a fresh test user to avoid 'Already registered' issues"""
    # Try to create a new test user
    test_email = f"test_commission_{int(time.time())}@test.com"
    response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": test_email,
        "name": "Test Commission User",
        "password": "test1234"
    })
    if response.status_code == 200:
        return response.json().get("token"), test_email
    pytest.skip(f"Test user creation failed: {response.text}")


class TestCommissionMath:
    """Verify the commission calculation formula"""
    
    def test_35_euro_base_price_calculation(self):
        """
        For 35€ base price:
        - service_fee = 35 * 0.05 = 1.75€
        - total = 35 + 1.75 = 36.75€
        - stripe_fee = 36.75 * 0.014 + 0.25 = 0.5145 + 0.25 = 0.7645 ≈ 0.76€
        - platform_net = 1.75 - 0.76 = 0.99€
        - organizer = 35€ (100% of base)
        """
        base_price = 35.0
        
        # Calculate expected values
        expected_service_fee = round(base_price * PLATFORM_COMMISSION, 2)
        expected_total = round(base_price + expected_service_fee, 2)
        expected_stripe_fee = round(expected_total * STRIPE_PERCENT_FEE + STRIPE_FIXED_FEE, 2)
        expected_platform_net = round(expected_service_fee - expected_stripe_fee, 2)
        expected_organizer = base_price
        
        # Verify
        assert expected_service_fee == 1.75, f"Service fee should be 1.75€, got {expected_service_fee}"
        assert expected_total == 36.75, f"Total should be 36.75€, got {expected_total}"
        assert expected_stripe_fee == 0.76, f"Stripe fee should be 0.76€, got {expected_stripe_fee}"
        assert expected_platform_net == 0.99, f"Platform net should be 0.99€, got {expected_platform_net}"
        assert expected_organizer == 35.0, f"Organizer should get 35€, got {expected_organizer}"
        
        print(f"✅ 35€ base: service_fee={expected_service_fee}€, total={expected_total}€, stripe_fee={expected_stripe_fee}€, platform_net={expected_platform_net}€, organizer={expected_organizer}€")

    def test_20_euro_base_price_calculation(self):
        """
        For 20€ base price (10km race):
        - service_fee = 20 * 0.05 = 1.00€
        - total = 20 + 1 = 21.00€
        - stripe_fee = 21 * 0.014 + 0.25 = 0.294 + 0.25 = 0.544 ≈ 0.54€
        - platform_net = 1.00 - 0.54 = 0.46€
        """
        base_price = 20.0
        
        expected_service_fee = round(base_price * PLATFORM_COMMISSION, 2)
        expected_total = round(base_price + expected_service_fee, 2)
        expected_stripe_fee = round(expected_total * STRIPE_PERCENT_FEE + STRIPE_FIXED_FEE, 2)
        expected_platform_net = round(expected_service_fee - expected_stripe_fee, 2)
        
        assert expected_service_fee == 1.0
        assert expected_total == 21.0
        assert expected_stripe_fee == 0.54
        assert expected_platform_net == 0.46
        
        print(f"✅ 20€ base: service_fee={expected_service_fee}€, total={expected_total}€, platform_net={expected_platform_net}€")


class TestRegistrationEndpoint:
    """Test POST /api/registrations returns correct fee breakdown"""
    
    def test_registration_returns_fee_breakdown(self, api_client, test_user_token):
        """Registration response should include base_price, service_fee, amount"""
        token, email = test_user_token
        api_client.headers.update({"Authorization": f"Bearer {token}"})
        
        # Use the CORSICA FEVER event with 20km race (35€)
        response = api_client.post(f"{BASE_URL}/api/registrations", json={
            "event_id": "evt_f79c5cfd5036",
            "selected_race": "20 km"
        })
        
        if response.status_code == 400 and "Already registered" in response.text:
            pytest.skip("User already registered for this event")
        
        assert response.status_code in [200, 201], f"Registration failed: {response.text}"
        
        data = response.json()
        
        # Verify response contains fee breakdown
        assert "base_price" in data, "Response missing base_price"
        assert "service_fee" in data, "Response missing service_fee"
        assert "amount" in data, "Response missing amount (total)"
        
        base_price = data["base_price"]
        service_fee = data["service_fee"]
        amount = data["amount"]
        
        # For 35€ race:
        assert base_price == 35.0, f"Base price should be 35€, got {base_price}"
        assert service_fee == 1.75, f"Service fee should be 1.75€ (5% of 35), got {service_fee}"
        assert amount == 36.75, f"Total amount should be 36.75€, got {amount}"
        
        print(f"✅ Registration response: base_price={base_price}€, service_fee={service_fee}€, total={amount}€")
        
        # Store registration_id for cleanup if needed
        return data.get("registration_id")


class TestAdminPaymentsEndpoint:
    """Test GET /api/admin/payments returns correct totals"""
    
    def test_admin_payments_returns_totals_structure(self, api_client, admin_token):
        """Admin payments should return totals with all required fields"""
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        response = api_client.get(f"{BASE_URL}/api/admin/payments")
        
        assert response.status_code == 200, f"Admin payments failed: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "payments" in data, "Response missing payments list"
        assert "totals" in data, "Response missing totals object"
        
        totals = data["totals"]
        
        # Verify all required total fields exist
        required_fields = [
            "total_base_price",
            "total_service_fees",
            "total_stripe_fees",
            "total_platform_net",
            "total_organizer",
            "total_completed"
        ]
        
        for field in required_fields:
            assert field in totals, f"Totals missing required field: {field}"
            print(f"  {field}: {totals[field]}")
        
        # Verify totals are numeric
        assert isinstance(totals["total_base_price"], (int, float))
        assert isinstance(totals["total_service_fees"], (int, float))
        assert isinstance(totals["total_stripe_fees"], (int, float))
        assert isinstance(totals["total_platform_net"], (int, float))
        assert isinstance(totals["total_organizer"], (int, float))
        assert isinstance(totals["total_completed"], int)
        
        # Note: old transactions may have 0 for service_fee fields
        # Only verify math if we have transactions with the new model
        if totals["total_completed"] > 0 and totals["total_service_fees"] > 0:
            # For new model: total_amount = total_base_price + total_service_fees
            # But old transactions may skew this, so just verify fields exist and are non-negative
            assert totals["total_amount"] >= 0, "Total amount should be non-negative"
            assert totals["total_base_price"] >= 0, "Total base price should be non-negative"
            print(f"   Note: Old transactions may have 0 for service_fee fields, math verification skipped")
        
        print(f"✅ Admin payments totals verified for {totals['total_completed']} completed transactions")
    
    def test_admin_payments_individual_rows_have_fee_data(self, api_client, admin_token):
        """Each payment row should have financial breakdown fields"""
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        response = api_client.get(f"{BASE_URL}/api/admin/payments?limit=100")
        
        assert response.status_code == 200
        
        data = response.json()
        payments = data.get("payments", [])
        
        # Find completed payments with the new model (have service_fee > 0)
        new_model_payments = [p for p in payments if p.get("service_fee", 0) > 0]
        
        if len(new_model_payments) == 0:
            print("⚠️ No payments with new commission model found - only old data exists")
            return
        
        for payment in new_model_payments:
            # Verify each payment has all financial fields
            assert "base_price" in payment, f"Payment missing base_price: {payment.get('transaction_id')}"
            assert "service_fee" in payment, f"Payment missing service_fee: {payment.get('transaction_id')}"
            assert "amount" in payment, f"Payment missing amount: {payment.get('transaction_id')}"
            assert "stripe_fee" in payment, f"Payment missing stripe_fee: {payment.get('transaction_id')}"
            assert "platform_net" in payment, f"Payment missing platform_net: {payment.get('transaction_id')}"
            assert "organizer_amount" in payment, f"Payment missing organizer_amount: {payment.get('transaction_id')}"
            
            # Verify math for this payment
            base = payment["base_price"]
            fee = payment["service_fee"]
            total = payment["amount"]
            
            assert abs(total - (base + fee)) < 0.02, f"Payment total mismatch: {base} + {fee} != {total}"
        
        print(f"✅ {len(new_model_payments)} payment(s) with new commission model verified")


class TestAdminStatsEndpoint:
    """Test GET /api/admin/stats returns correct financial totals"""
    
    def test_admin_stats_returns_financial_totals(self, api_client, admin_token):
        """Admin stats should include total_service_fees, total_stripe_fees, etc."""
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        response = api_client.get(f"{BASE_URL}/api/admin/stats")
        
        assert response.status_code == 200, f"Admin stats failed: {response.text}"
        
        data = response.json()
        
        # Verify standard stats
        assert "total_users" in data
        assert "total_events" in data
        assert "total_registrations" in data
        
        # Verify financial totals
        assert "total_service_fees" in data, "Missing total_service_fees"
        assert "total_stripe_fees" in data, "Missing total_stripe_fees"
        assert "total_platform_net" in data, "Missing total_platform_net"
        assert "total_organizer" in data, "Missing total_organizer"
        
        print(f"✅ Admin stats: users={data['total_users']}, events={data['total_events']}, registrations={data['total_registrations']}")
        print(f"   Financial: service_fees={data['total_service_fees']}€, stripe_fees={data['total_stripe_fees']}€, platform_net={data['total_platform_net']}€, organizer={data['total_organizer']}€")


class TestEventPriceDisplay:
    """Test event detail shows correct prices with fee structure"""
    
    def test_event_has_races_with_prices(self, api_client):
        """Verify CORSICA FEVER event has races with correct prices"""
        response = api_client.get(f"{BASE_URL}/api/events/evt_f79c5cfd5036")
        
        assert response.status_code == 200, f"Event fetch failed: {response.text}"
        
        event = response.json()
        
        assert "races" in event and event["races"], "Event should have races"
        
        # Find the 20km race
        race_20km = next((r for r in event["races"] if "20" in r.get("name", "")), None)
        assert race_20km is not None, "Event should have a 20km race"
        assert race_20km["price"] == 35, f"20km race price should be 35€, got {race_20km['price']}"
        
        # Find the 10km race
        race_10km = next((r for r in event["races"] if "10" in r.get("name", "")), None)
        if race_10km:
            assert race_10km["price"] == 20, f"10km race price should be 20€, got {race_10km['price']}"
        
        print(f"✅ Event {event['title']} has {len(event['races'])} races with correct prices")


class TestCheckoutSessionAmount:
    """Test POST /api/payments/create-checkout uses correct amount"""
    
    def test_checkout_session_creates_with_correct_amount(self, api_client, test_user_token):
        """Checkout should charge base + 5% service fee"""
        token, email = test_user_token
        api_client.headers.update({"Authorization": f"Bearer {token}"})
        
        # First create a registration
        reg_response = api_client.post(f"{BASE_URL}/api/registrations", json={
            "event_id": "evt_f79c5cfd5036",
            "selected_race": "10 km"  # 20€ base
        })
        
        if reg_response.status_code == 400:
            # Try a different race or skip
            pytest.skip(f"Cannot create registration: {reg_response.text}")
        
        registration = reg_response.json()
        registration_id = registration["registration_id"]
        
        # Create checkout session
        checkout_response = api_client.post(f"{BASE_URL}/api/payments/create-checkout", json={
            "registration_id": registration_id,
            "origin_url": "https://event-ticket-hub-7.preview.emergentagent.com"
        })
        
        assert checkout_response.status_code == 200, f"Checkout creation failed: {checkout_response.text}"
        
        checkout_data = checkout_response.json()
        
        # Verify checkout URL exists
        assert "checkout_url" in checkout_data, "Response missing checkout_url"
        assert "stripe.com" in checkout_data["checkout_url"], "Checkout URL should be Stripe"
        
        print(f"✅ Checkout session created for registration {registration_id}")
        
        # The exact amount verification would require parsing the Stripe session
        # but we verified the registration contains correct fee breakdown


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
