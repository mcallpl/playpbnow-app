#!/bin/bash
set -e

# Smoke tests for PlayPBNow deployment validation

TARGET=${1:-staging}
DOMAIN="peoplestar.com"

if [ "$TARGET" = "staging" ]; then
  BASE_URL="https://staging.playpbnow.com"
  echo "🧪 Running smoke tests against STAGING: $BASE_URL"
else
  BASE_URL="https://$DOMAIN/PlayPBNow"
  echo "🧪 Running smoke tests against PRODUCTION: $BASE_URL"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

FAILED=0
PASSED=0

# Test function
run_test() {
  local test_name=$1
  local url=$2
  local expected_status=${3:-200}

  echo -n "  Testing $test_name... "

  status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

  if [ "$status" -eq "$expected_status" ] || [ "$status" -eq "200" ]; then
    echo -e "${GREEN}✅ Pass${NC} (HTTP $status)"
    ((PASSED++))
  else
    echo -e "${RED}❌ Fail${NC} (HTTP $status, expected $expected_status)"
    ((FAILED++))
  fi
}

echo ""
echo "Testing connectivity..."

# Test 1: Landing page loads
run_test "Landing page" "$BASE_URL/"

# Test 2: SPA app page loads
run_test "SPA app.html" "$BASE_URL/app.html"

# Test 3: Static assets load (check JS)
run_test "Static assets" "$BASE_URL/_expo/static/js/bundle.js" "200"

# Test 4: Favicon loads
run_test "Favicon" "$BASE_URL/favicon.ico"

# Test 5: Manifest loads
run_test "Web manifest" "$BASE_URL/manifest.json"

# Test 6: API health check (if available)
if [ "$TARGET" = "production" ]; then
  run_test "API health" "$BASE_URL/api/health.php"
fi

echo ""
echo "======================================"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All smoke tests passed ($PASSED/$((PASSED + FAILED)))${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed ($FAILED failures, $PASSED passes)${NC}"
  exit 1
fi
