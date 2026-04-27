#!/usr/bin/env bash
BASE="http://localhost:8000"
COOKIE_JAR="/tmp/rukiai_test_cookies.txt"
rm -f $COOKIE_JAR

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

pass() { echo -e "${GREEN}✅ PASS${NC} — $1"; }
fail() { echo -e "${RED}❌ FAIL${NC} — $1 → $2"; }

check() {
  local label=$1
  local status=$2
  local expected=$3
  local body=$4
  if [ "$status" -eq "$expected" ]; then
    pass "$label (HTTP $status)"
  else
    fail "$label" "expected $expected, got $status — $body"
  fi
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  RukiAI API Test Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Index routes ────────────────────────────────
echo -e "\n[Index Routes]"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE/)
check "GET /" $STATUS 200

STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE/about)
check "GET /about" $STATUS 200

STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE/features)
check "GET /features" $STATUS 200

STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE/contact)
check "GET /contact" $STATUS 200

STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE/how-it-works)
check "GET /how-it-works" $STATUS 200

# ── Auth routes ──────────────────────────────────
echo -e "\n[Auth Routes]"

# Signup
BODY=$(curl -s -X POST $BASE/user/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@rukiai.com","password":"test1234","full_name":"Test User","currency":"INR","user_type":"student"}' \
  -c $COOKIE_JAR -w "\n%{http_code}")
STATUS=$(echo "$BODY" | tail -1)
RESP=$(echo "$BODY" | head -1)
check "POST /user/signup" $STATUS 200
USER_ID=$(echo $RESP | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user_id',''))" 2>/dev/null)
echo "   user_id: $USER_ID"

# Duplicate signup (should 400)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/user/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@rukiai.com","password":"test1234"}')
check "POST /user/signup (duplicate → 400)" $STATUS 400

# Login
BODY=$(curl -s -X POST $BASE/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@rukiai.com","password":"test1234"}' \
  -c $COOKIE_JAR -w "\n%{http_code}")
STATUS=$(echo "$BODY" | tail -1)
check "POST /user/login" $STATUS 200

# Wrong password (should 401)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@rukiai.com","password":"wrongpass"}')
check "POST /user/login (wrong password → 401)" $STATUS 401

# Guest
BODY=$(curl -s $BASE/user/guest -c $COOKIE_JAR -w "\n%{http_code}")
STATUS=$(echo "$BODY" | tail -1)
GUEST_ID=$(echo "$BODY" | head -1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user_id',''))" 2>/dev/null)
check "GET /user/guest" $STATUS 200
echo "   guest_id: $GUEST_ID"

# ── Protected routes (no cookie → 401) ──────────
echo -e "\n[Protected Routes — no auth → 401]"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE/dashboard/student)
check "GET /dashboard/student (no auth → 401)" $STATUS 401

STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE/dashboard/employed)
check "GET /dashboard/employed (no auth → 401)" $STATUS 401

STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE/dashboard/unemployed)
check "GET /dashboard/unemployed (no auth → 401)" $STATUS 401

STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE/dashboard/retired)
check "GET /dashboard/retired (no auth → 401)" $STATUS 401

# ── User type forms (with auth cookie) ──────────
echo -e "\n[User Type Forms — with auth]"

# Re-login to get fresh cookie
curl -s -X POST $BASE/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@rukiai.com","password":"test1234"}' \
  -c $COOKIE_JAR -o /dev/null

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/userType/student \
  -H "Content-Type: application/json" \
  -b $COOKIE_JAR \
  -d "{\"user_id\":\"$USER_ID\",\"education_level\":\"college\",\"living_situation\":\"hostel\",\"is_parent_funded\":\"yes\",\"monthly_allowance\":5000,\"summary_frequency\":\"weekly\"}")
check "POST /userType/student" $STATUS 200

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b $COOKIE_JAR $BASE/dashboard/student)
check "GET /dashboard/student (with auth)" $STATUS 200

# ── Feedback routes ──────────────────────────────
echo -e "\n[Feedback Routes]"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/submit-feedback \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","feedback":"Great app!","email":"test@test.com"}')
check "POST /submit-feedback" $STATUS 201

STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/feedback)
check "GET /api/feedback" $STATUS 200

# ── Logout ───────────────────────────────────────
echo -e "\n[Logout]"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b $COOKIE_JAR $BASE/user/logout)
check "GET /user/logout" $STATUS 200

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Done. Clean up test user manually if needed."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
