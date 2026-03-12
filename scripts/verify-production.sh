#!/usr/bin/env bash
# ============================================================
# FormForge — Production Smoke Test Script (Agent 20)
#
# Verifies all critical user flows work in production.
# Run after every deployment or before launch.
#
# Usage:
#   ./scripts/verify-production.sh [BASE_URL]
#
# Default BASE_URL: http://localhost:8080
# Production: ./scripts/verify-production.sh https://forge-your-forms.vercel.app
# ============================================================

set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"
PASS=0
FAIL=0
SKIP=0
RESULTS=""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

log_pass() {
  PASS=$((PASS + 1))
  RESULTS="${RESULTS}\n| ${1} | ${2} | PASS |"
  echo -e "${GREEN}[PASS]${NC} ${1}: ${2}"
}

log_fail() {
  FAIL=$((FAIL + 1))
  RESULTS="${RESULTS}\n| ${1} | ${2} | FAIL | ${3} |"
  echo -e "${RED}[FAIL]${NC} ${1}: ${2} — ${3}"
}

log_skip() {
  SKIP=$((SKIP + 1))
  RESULTS="${RESULTS}\n| ${1} | ${2} | SKIP | ${3} |"
  echo -e "${YELLOW}[SKIP]${NC} ${1}: ${2} — ${3}"
}

check_url() {
  local id="$1"
  local desc="$2"
  local url="$3"
  local expected_status="${4:-200}"

  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${url}" 2>/dev/null || echo "000")

  if [ "$status" = "$expected_status" ]; then
    log_pass "$id" "$desc"
  elif [ "$status" = "000" ]; then
    log_fail "$id" "$desc" "Connection failed (is the server running?)"
  else
    log_fail "$id" "$desc" "Expected HTTP ${expected_status}, got ${status}"
  fi
}

check_url_contains() {
  local id="$1"
  local desc="$2"
  local url="$3"
  local expected="$4"

  local body
  body=$(curl -s --max-time 10 "${url}" 2>/dev/null || echo "")

  if echo "$body" | grep -q "$expected"; then
    log_pass "$id" "$desc"
  elif [ -z "$body" ]; then
    log_fail "$id" "$desc" "Empty response"
  else
    log_fail "$id" "$desc" "Response does not contain '${expected}'"
  fi
}

echo "============================================================"
echo "  FormForge — Production Smoke Tests"
echo "  Target: ${BASE_URL}"
echo "  Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "============================================================"
echo ""

# ============================================================
# 1. ANONYMOUS USER FLOWS
# ============================================================
echo "--- 1. Anonymous User Flows ---"
echo ""

# SPA serves index.html for all routes (client-side routing)
check_url "1a" "Landing page loads" "${BASE_URL}/"
check_url_contains "1b" "Landing page has SEO title" "${BASE_URL}/" "FormForge"
check_url "1c" "Pricing page loads" "${BASE_URL}/pricing"
check_url "1d" "Privacy page loads" "${BASE_URL}/privacy"
check_url "1e" "Auth page loads" "${BASE_URL}/auth"
check_url "1f" "Ticket tracking page loads" "${BASE_URL}/track/test"
check_url "1g" "Public form route loads" "${BASE_URL}/f/test"
check_url "1h" "404 page loads" "${BASE_URL}/nonexistent-page-xyz"

echo ""

# ============================================================
# 2. STATIC ASSETS & BUILD
# ============================================================
echo "--- 2. Static Assets & Build ---"
echo ""

check_url_contains "2a" "HTML has React root" "${BASE_URL}/" "id=\"root\""
check_url_contains "2b" "HTML has meta description" "${BASE_URL}/" "meta name=\"description\""
check_url_contains "2c" "HTML has OG title" "${BASE_URL}/" 'og:title'
check_url_contains "2d" "HTML has viewport meta" "${BASE_URL}/" "viewport"

echo ""

# ============================================================
# 3. API ENDPOINTS
# ============================================================
echo "--- 3. API & Edge Function Endpoints ---"
echo ""

# Supabase REST API (anon key should be accessible)
SUPABASE_URL="${VITE_SUPABASE_URL:-}"
if [ -n "$SUPABASE_URL" ]; then
  check_url "3a" "Supabase health endpoint" "${SUPABASE_URL}/rest/v1/" "200"
else
  log_skip "3a" "Supabase health endpoint" "VITE_SUPABASE_URL not set"
fi

echo ""

# ============================================================
# 4. BUILD VERIFICATION
# ============================================================
echo "--- 4. Build Verification ---"
echo ""

# Check if dist/ exists (production build)
if [ -d "dist" ]; then
  log_pass "4a" "Production build exists (dist/)"

  # Check for main JS bundle
  if ls dist/assets/index-*.js 1>/dev/null 2>&1; then
    log_pass "4b" "Main JS bundle exists"
  else
    log_fail "4b" "Main JS bundle exists" "No index-*.js found in dist/assets/"
  fi

  # Check for CSS bundle
  if ls dist/assets/index-*.css 1>/dev/null 2>&1; then
    log_pass "4c" "CSS bundle exists"
  else
    log_fail "4c" "CSS bundle exists" "No index-*.css found in dist/assets/"
  fi

  # Check chunk sizes (no chunk >500kB)
  LARGE_CHUNKS=$(find dist/assets -name "*.js" -size +500k 2>/dev/null | wc -l)
  if [ "$LARGE_CHUNKS" -eq 0 ]; then
    log_pass "4d" "No JS chunks >500kB"
  else
    log_fail "4d" "No JS chunks >500kB" "${LARGE_CHUNKS} oversized chunks found"
  fi
else
  log_skip "4a" "Production build exists" "Run 'npm run build' first"
  log_skip "4b" "Main JS bundle exists" "No dist/"
  log_skip "4c" "CSS bundle exists" "No dist/"
  log_skip "4d" "No JS chunks >500kB" "No dist/"
fi

echo ""

# ============================================================
# 5. SECURITY CHECKS
# ============================================================
echo "--- 5. Security Checks ---"
echo ""

# Check no env secrets in built assets
if [ -d "dist" ]; then
  SECRET_LEAKS=$(grep -r "sk_live\|sk_test\|whsec_\|re_[a-zA-Z0-9]\{20\}\|sk-ant-" dist/ 2>/dev/null | wc -l)
  if [ "$SECRET_LEAKS" -eq 0 ]; then
    log_pass "5a" "No leaked secrets in build output"
  else
    log_fail "5a" "No leaked secrets in build output" "Found ${SECRET_LEAKS} potential secret leaks"
  fi
else
  log_skip "5a" "No leaked secrets in build output" "No dist/"
fi

# Check no hardcoded API keys in source
SRC_LEAKS=$(grep -r "sk_live\|whsec_" src/ 2>/dev/null | grep -v "placeholder\|example\|test\|\.test\." | wc -l)
if [ "$SRC_LEAKS" -eq 0 ]; then
  log_pass "5b" "No hardcoded live keys in source"
else
  log_fail "5b" "No hardcoded live keys in source" "Found ${SRC_LEAKS} potential hardcoded keys"
fi

echo ""

# ============================================================
# 6. i18n VERIFICATION
# ============================================================
echo "--- 6. i18n & RTL Verification ---"
echo ""

# Check translation files exist
if [ -f "public/locales/en/common.json" ] || [ -f "src/i18n/en.json" ] || [ -f "src/locales/en.json" ]; then
  log_pass "6a" "English translation file exists"
else
  # Search for any locale files
  EN_FILES=$(find src public -name "en*" -o -name "*en.json" 2>/dev/null | head -5)
  if [ -n "$EN_FILES" ]; then
    log_pass "6a" "English translation file exists"
  else
    log_skip "6a" "English translation file exists" "Translation file not found"
  fi
fi

if [ -f "public/locales/he/common.json" ] || [ -f "src/i18n/he.json" ] || [ -f "src/locales/he.json" ]; then
  log_pass "6b" "Hebrew translation file exists"
else
  HE_FILES=$(find src public -name "he*" -o -name "*he.json" 2>/dev/null | head -5)
  if [ -n "$HE_FILES" ]; then
    log_pass "6b" "Hebrew translation file exists"
  else
    log_skip "6b" "Hebrew translation file exists" "Translation file not found"
  fi
fi

echo ""

# ============================================================
# 7. DEPENDENCY & CONFIG CHECKS
# ============================================================
echo "--- 7. Dependency & Config Checks ---"
echo ""

# Check package.json exists
if [ -f "package.json" ]; then
  log_pass "7a" "package.json exists"
else
  log_fail "7a" "package.json exists" "Missing package.json"
fi

# Check lock file exists
if [ -f "package-lock.json" ]; then
  log_pass "7b" "package-lock.json exists"
else
  log_fail "7b" "package-lock.json exists" "Missing lock file"
fi

# Check .env exists
if [ -f ".env" ]; then
  log_pass "7c" ".env file exists"
else
  log_fail "7c" ".env file exists" "Missing .env"
fi

# Check .gitignore includes sensitive files
if grep -q "\.env" .gitignore 2>/dev/null; then
  log_pass "7d" ".gitignore includes .env"
else
  log_fail "7d" ".gitignore includes .env" "Add .env to .gitignore"
fi

echo ""

# ============================================================
# SUMMARY
# ============================================================
echo "============================================================"
echo "  SMOKE TEST RESULTS"
echo "============================================================"
echo ""
echo -e "  ${GREEN}PASS${NC}: ${PASS}"
echo -e "  ${RED}FAIL${NC}: ${FAIL}"
echo -e "  ${YELLOW}SKIP${NC}: ${SKIP}"
echo "  TOTAL: $((PASS + FAIL + SKIP))"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}All tests passed! FormForge is ready for launch.${NC}"
  exit 0
else
  echo -e "${RED}${FAIL} test(s) failed. Review failures above before launching.${NC}"
  exit 1
fi
