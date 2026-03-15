#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta

class SportsConnectAPITester:
    def __init__(self, base_url="https://sportlyo-preview-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.organizer_token = None

    def run_test(self, name, method, endpoint, expected_status, data=None, auth_required=False, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/api{endpoint}" if not endpoint.startswith('/api') else f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Use provided token or default token
        auth_token = token or self.token
        if auth_required and auth_token:
            headers['Authorization'] = f'Bearer {auth_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                
                # Try to parse JSON response
                try:
                    json_response = response.json()
                    print(f"   Response keys: {list(json_response.keys()) if isinstance(json_response, dict) else 'Non-dict response'}")
                    return True, json_response
                except:
                    return True, response.text
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except requests.exceptions.RequestException as e:
            print(f"❌ FAILED - Network Error: {str(e)}")
            return False, {}
        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n" + "="*50)
        print("TESTING HEALTH ENDPOINTS")
        print("="*50)
        
        self.run_test("API Root", "GET", "/", 200)
        self.run_test("Health Check", "GET", "/health", 200)

    def test_public_endpoints(self):
        """Test public endpoints that don't require auth"""
        print("\n" + "="*50)
        print("TESTING PUBLIC ENDPOINTS")
        print("="*50)
        
        self.run_test("Get Categories", "GET", "/categories", 200)
        self.run_test("Get Events", "GET", "/events", 200)
        self.run_test("Get Featured Events", "GET", "/events/featured", 200)

    def test_authentication(self):
        """Test authentication with provided credentials"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION")
        print("="*50)
        
        # Test admin login
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "/auth/login",
            200,
            data={"email": "admin@sportsconnect.fr", "password": "admin123"}
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            self.token = self.admin_token  # Set as default token
            print(f"✅ Admin token obtained: {self.admin_token[:20]}...")
        else:
            print("❌ Failed to get admin token")
            
        # Test organizer login
        success, response = self.run_test(
            "Organizer Login",
            "POST", 
            "/auth/login",
            200,
            data={"email": "club@paris-sport.fr", "password": "club123"}
        )
        
        if success and 'token' in response:
            self.organizer_token = response['token']
            print(f"✅ Organizer token obtained: {self.organizer_token[:20]}...")
        else:
            print("❌ Failed to get organizer token")

        # Test invalid login
        self.run_test(
            "Invalid Login",
            "POST",
            "/auth/login", 
            401,
            data={"email": "invalid@test.com", "password": "wrong"}
        )

    def test_authenticated_endpoints(self):
        """Test endpoints that require authentication"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATED ENDPOINTS")
        print("="*50)
        
        if not self.token:
            print("❌ No auth token available - skipping authenticated tests")
            return

        # Test /auth/me
        self.run_test("Get Current User", "GET", "/auth/me", 200, auth_required=True)
        
        # Test recommendations
        self.run_test("Get Recommendations", "GET", "/recommendations", 200, auth_required=True)
        
        # Test user registrations
        self.run_test("Get User Registrations", "GET", "/registrations", 200, auth_required=True)

    def test_organizer_endpoints(self):
        """Test organizer-specific endpoints"""
        print("\n" + "="*50)
        print("TESTING ORGANIZER ENDPOINTS")
        print("="*50)
        
        if not self.organizer_token:
            print("❌ No organizer token available - skipping organizer tests")
            return

        # Test get organizer events
        self.run_test(
            "Get Organizer Events", 
            "GET", 
            "/organizer/events", 
            200, 
            auth_required=True,
            token=self.organizer_token
        )

    def test_admin_endpoints(self):
        """Test admin-specific endpoints"""
        print("\n" + "="*50)
        print("TESTING ADMIN ENDPOINTS") 
        print("="*50)
        
        if not self.admin_token:
            print("❌ No admin token available - skipping admin tests")
            return

        # Test admin stats
        self.run_test(
            "Get Admin Stats",
            "GET",
            "/admin/stats",
            200,
            auth_required=True,
            token=self.admin_token
        )
        
        # Test get all users (with pagination)
        self.run_test(
            "Get All Users",
            "GET", 
            "/admin/users?page=1&limit=5",
            200,
            auth_required=True,
            token=self.admin_token
        )
        
        # Test get payments
        self.run_test(
            "Get All Payments",
            "GET",
            "/admin/payments?page=1&limit=5", 
            200,
            auth_required=True,
            token=self.admin_token
        )

    def test_event_details(self):
        """Test event detail endpoints"""
        print("\n" + "="*50)
        print("TESTING EVENT DETAILS")
        print("="*50)
        
        # First get some events to test with
        success, events_response = self.run_test("Get Events for Detail Test", "GET", "/events", 200)
        
        if success and 'events' in events_response and events_response['events']:
            event_id = events_response['events'][0]['event_id']
            
            # Test getting specific event
            self.run_test(
                f"Get Event Detail",
                "GET", 
                f"/events/{event_id}",
                200
            )
        else:
            print("❌ No events available to test event details")

    def test_chatbot_integration(self):
        """Test AI chatbot functionality"""
        print("\n" + "="*50)
        print("TESTING CHATBOT INTEGRATION")
        print("="*50)
        
        if not self.token:
            print("❌ No auth token available - skipping chatbot tests")
            return

        # Test chat endpoint
        success, response = self.run_test(
            "AI Chat",
            "POST",
            "/chat",
            200,
            data={
                "message": "Bonjour! Quels événements de course à pied recommandez-vous?",
                "session_id": "test_session_123"
            },
            auth_required=True
        )
        
        if success and 'response' in response:
            print(f"✅ Chat response received: {response['response'][:100]}...")
        
    def test_pps_verification(self):
        """Test PPS verification system"""
        print("\n" + "="*50)
        print("TESTING PPS VERIFICATION SYSTEM")
        print("="*50)
        
        if not self.token:
            print("❌ No auth token available - skipping PPS tests")
            return

        # Test PPS verification (this will be MOCKED to return success)
        success, response = self.run_test(
            "PPS Verification",
            "POST",
            "/pps/verify",
            200,
            data={"pps_number": "P9F28C586EB"},
            auth_required=True
        )
        
        if success and 'verified' in response:
            print(f"✅ PPS verification response: {response.get('message', 'No message')}")

        # Test PPS status check
        self.run_test(
            "PPS Status Check",
            "GET",
            "/pps/status",
            200,
            auth_required=True
        )

        # Test invalid PPS format
        self.run_test(
            "Invalid PPS Format",
            "POST",
            "/pps/verify",
            400,
            data={"pps_number": "INVALID"},
            auth_required=True
        )

    def test_promo_codes(self):
        """Test promo code system"""
        print("\n" + "="*50)
        print("TESTING PROMO CODE SYSTEM")
        print("="*50)
        
        # Get an event ID for testing
        success, events_response = self.run_test("Get Events for Promo Test", "GET", "/events", 200)
        
        if success and 'events' in events_response and events_response['events']:
            event_id = events_response['events'][0]['event_id']
            
            # Test promo code validation with non-existent code (should fail)
            self.run_test(
                "Invalid Promo Code",
                "POST",
                "/promo-codes/validate",
                404,
                data={"code": "NONEXISTENT2026", "event_id": event_id}
            )
            
            # If we have organizer token, try to create a promo code first
            if self.organizer_token:
                success, promo_response = self.run_test(
                    "Create Promo Code",
                    "POST",
                    "/promo-codes",
                    200,
                    data={
                        "code": "TEST2026",
                        "discount_type": "percentage",
                        "discount_value": 10,
                        "event_id": event_id
                    },
                    auth_required=True,
                    token=self.organizer_token
                )
                
                if success:
                    # Now test validation of the created promo code
                    self.run_test(
                        "Valid Promo Code",
                        "POST",
                        "/promo-codes/validate",
                        200,
                        data={"code": "TEST2026", "event_id": event_id}
                    )

    def test_timing_system(self):
        """Test chronometer/timing system"""
        print("\n" + "="*50)
        print("TESTING TIMING/CHRONOMETER SYSTEM")
        print("="*50)
        
        if not self.token:
            print("❌ No auth token available - skipping timing tests")
            return

        # First create a registration to test timing with
        success, events_response = self.run_test("Get Events for Timing Test", "GET", "/events", 200)
        
        if success and 'events' in events_response and events_response['events']:
            event = events_response['events'][0]
            event_id = event['event_id']
            
            # Create registration
            registration_data = {
                "event_id": event_id,
                "emergency_contact": "Test Contact",
                "emergency_phone": "+33123456789"
            }
            
            success, reg_response = self.run_test(
                "Create Registration for Timing",
                "POST",
                "/registrations",
                200,
                data=registration_data,
                auth_required=True
            )
            
            if success and 'registration_id' in reg_response:
                reg_id = reg_response['registration_id']
                
                # Test start timer
                success, start_response = self.run_test(
                    "Start Race Timer",
                    "POST",
                    "/timing/start",
                    200,
                    data={"registration_id": reg_id},
                    auth_required=True
                )
                
                if success:
                    print("⏱️ Timer started successfully")
                    
                    # Test stop timer
                    success, stop_response = self.run_test(
                        "Stop Race Timer",
                        "POST",
                        "/timing/stop",
                        200,
                        data={"registration_id": reg_id},
                        auth_required=True
                    )
                    
                    if success and 'formatted_time' in stop_response:
                        print(f"🏁 Timer stopped - Time: {stop_response['formatted_time']}")
                    
                    # Test results endpoint
                    self.run_test(
                        "Get Race Results",
                        "GET",
                        f"/timing/results/{event_id}",
                        200
                    )
                    
                    # Test personal results
                    self.run_test(
                        "Get My Results",
                        "GET",
                        "/timing/my-results",
                        200,
                        auth_required=True
                    )

    def test_event_registration_flow(self):
        """Test the complete event registration flow with advanced features"""
        print("\n" + "="*50)
        print("TESTING ADVANCED EVENT REGISTRATION FLOW")
        print("="*50)
        
        if not self.token:
            print("❌ No auth token available - skipping registration tests")
            return

        # Get available events
        success, events_response = self.run_test("Get Events for Registration", "GET", "/events", 200)
        
        if success and 'events' in events_response and events_response['events']:
            event = events_response['events'][0]
            event_id = event['event_id']
            
            # Test advanced event registration with races/waves
            registration_data = {
                "event_id": event_id,
                "selected_race": event.get('races', [{}])[0].get('name') if event.get('races') else None,
                "selected_wave": event.get('waves', [{}])[0].get('wave_id') if event.get('waves') else None,
                "emergency_contact": "Test Contact",
                "emergency_phone": "+33123456789"
            }
            
            success, reg_response = self.run_test(
                "Create Advanced Registration",
                "POST",
                "/registrations",
                200,
                data=registration_data,
                auth_required=True
            )
            
            if success and 'registration_id' in reg_response:
                reg_id = reg_response['registration_id']
                print(f"✅ Registration created: {reg_id}")
                print(f"   Bib Number: {reg_response.get('bib_number', 'N/A')}")
                
                # Test digital ticket generation
                self.run_test(
                    "Get Digital Ticket",
                    "GET",
                    f"/registrations/{reg_id}/ticket",
                    200,
                    auth_required=True
                )
                    
                # Test get registration details
                self.run_test(
                    "Get Registration Details", 
                    "GET",
                    f"/registrations/{reg_id}",
                    200,
                    auth_required=True
                )
        else:
            print("❌ No events available for registration testing")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting SportsConnect API Testing")
        print(f"🌐 Base URL: {self.base_url}")
        print(f"⏰ Started at: {datetime.now().isoformat()}")
        
        # Run test suites in order
        self.test_health_check()
        self.test_public_endpoints()
        self.test_authentication()
        self.test_authenticated_endpoints()
        self.test_organizer_endpoints()
        self.test_admin_endpoints()
        self.test_event_details()
        self.test_chatbot_integration()
        self.test_pps_verification()
        self.test_promo_codes()
        self.test_timing_system()
        self.test_event_registration_flow()
        
        # Print final results
        print("\n" + "="*50)
        print("FINAL RESULTS")
        print("="*50)
        print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"📈 Success rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "No tests run")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed!")
            return 1

def main():
    """Main function"""
    tester = SportsConnectAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())