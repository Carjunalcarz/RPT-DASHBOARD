import requests
import sys
from datetime import datetime

class TaxAdminAPITester:
    def __init__(self, base_url="https://tax-assessment-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            print(f"   Response Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {response_data}")
                    return success, response_data
                except:
                    return success, {}
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text}")
                self.failed_tests.append({
                    "test": name,
                    "endpoint": endpoint,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text
                })
                return False, {}

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "endpoint": endpoint,
                "error": str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        success, response = self.run_test(
            "Dashboard Stats", 
            "GET", 
            "dashboard/stats", 
            200
        )
        
        if success:
            # Validate response structure
            required_fields = ["totalProperties", "collectedTax", "pendingPayments", "delinquentAccounts"]
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                print(f"⚠️  WARNING: Missing fields in response: {missing_fields}")
                return False
            else:
                print("✅ All required fields present in dashboard stats")
        
        return success

    def test_status_endpoints(self):
        """Test status check endpoints"""
        # Test POST /status
        test_data = {"client_name": f"test_client_{datetime.now().strftime('%H%M%S')}"}
        post_success, post_response = self.run_test(
            "Create Status Check",
            "POST",
            "status",
            200,
            data=test_data
        )
        
        # Test GET /status
        get_success, get_response = self.run_test(
            "Get Status Checks",
            "GET",
            "status",
            200
        )
        
        return post_success and get_success

def main():
    print("🚀 Starting Real Property Tax Administration System API Tests...")
    print("=" * 60)
    
    # Setup
    tester = TaxAdminAPITester()
    
    # Run individual tests
    tests = [
        ("Root Endpoint", tester.test_root_endpoint),
        ("Dashboard Stats", tester.test_dashboard_stats),
        ("Status Endpoints", tester.test_status_endpoints),
    ]
    
    # Execute tests
    for test_name, test_func in tests:
        print(f"\n📋 Running: {test_name}")
        try:
            test_func()
        except Exception as e:
            print(f"❌ Test {test_name} crashed: {str(e)}")
            tester.failed_tests.append({
                "test": test_name,
                "error": f"Test crashed: {str(e)}"
            })

    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Tests Failed: {len(tester.failed_tests)}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%" if tester.tests_run > 0 else "0%")
    
    if tester.failed_tests:
        print("\n❌ FAILED TESTS:")
        for failure in tester.failed_tests:
            print(f"   - {failure['test']}: {failure.get('error', 'Status code mismatch')}")
    
    print("=" * 60)
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())