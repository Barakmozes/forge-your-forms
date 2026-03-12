#!/bin/bash
# ============================================
# FormForge Edge Function Smoke Tests
# Verifies each function responds correctly to
# basic requests (auth failures, bad input, etc.)
# Usage: ./scripts/test-functions.sh
# ============================================

set -uo pipefail

PROJECT_REF="rsuolemihuqjvrcpqjpa"
BASE_URL="https://${PROJECT_REF}.supabase.co/functions/v1"

PASSED=0
FAILED=0
TOTAL=0

# --- Test helper ---
test_endpoint() {
  local name="$1"
  local method="$2"
  local url="$3"
  local expected_status="$4"
  local body="${5:-}"
  local extra_headers="${6:-}"
  TOTAL=$((TOTAL + 1))

  local args=(-s -o /dev/null -w "%{http_code}" -X "$method" "$url")

  if [ -n "$body" ]; then
    args+=(-H "Content-Type: application/json" -d "$body")
  fi

  if [ -n "$extra_headers" ]; then
    IFS='|' read -ra HDRS <<< "$extra_headers"
    for h in "${HDRS[@]}"; do
      args+=(-H "$h")
    done
  fi

  local status
  status=$(curl "${args[@]}" 2>/dev/null || echo "000")

  if [ "$status" = "$expected_status" ]; then
    echo "  PASS  $name (HTTP $status)"
    PASSED=$((PASSED + 1))
  else
    echo "  FAIL  $name (expected $expected_status, got $status)"
    FAILED=$((FAILED + 1))
  fi
}

echo "========================================"
echo "FormForge Edge Function Smoke Tests"
echo "Base URL: $BASE_URL"
echo "========================================"
echo ""

# Note: Supabase JWT gateway returns 401 for all unauthenticated requests
# before function logic runs. Tests verify functions are deployed & reachable.

# --- stripe-webhook ---
echo "[stripe-webhook]"
test_endpoint "POST without auth → 401 (gateway)" \
  POST "$BASE_URL/stripe-webhook" "401" '{"type":"test"}'
test_endpoint "GET without auth → 401 (gateway)" \
  GET "$BASE_URL/stripe-webhook" "401"
echo ""

# --- send-email ---
echo "[send-email]"
test_endpoint "POST without auth → 401" \
  POST "$BASE_URL/send-email" "401" '{"to":"test@test.com","template":"welcome"}'
test_endpoint "GET without auth → 401 (gateway)" \
  GET "$BASE_URL/send-email" "401"
echo ""

# --- api-v1 ---
echo "[api-v1]"
test_endpoint "GET /forms without API key → 401" \
  GET "$BASE_URL/api-v1/forms" "401"
test_endpoint "GET /forms with invalid key → 401" \
  GET "$BASE_URL/api-v1/forms" "401" "" "X-API-Key: invalid_key_12345"
test_endpoint "GET unknown resource → 401 (gateway)" \
  GET "$BASE_URL/api-v1/unknown" "401" "" "X-API-Key: invalid_key_12345"
echo ""

# --- dispatch-webhook ---
echo "[dispatch-webhook]"
test_endpoint "POST without auth → 401 (gateway)" \
  POST "$BASE_URL/dispatch-webhook" "401" ''
test_endpoint "POST missing fields without auth → 401 (gateway)" \
  POST "$BASE_URL/dispatch-webhook" "401" '{"workspace_id":"test"}'
echo ""

# --- ai-generate ---
echo "[ai-generate]"
test_endpoint "POST without auth → 401" \
  POST "$BASE_URL/ai-generate" "401" '{"prompt":"test","mode":"standard","workspace_id":"test"}'
echo ""

# --- ai-analyze ---
echo "[ai-analyze]"
test_endpoint "POST without auth → 401" \
  POST "$BASE_URL/ai-analyze" "401" '{"submissions":[],"form_id":"test","workspace_id":"test"}'
echo ""

# --- classify-ticket ---
echo "[classify-ticket]"
test_endpoint "POST without auth → 401" \
  POST "$BASE_URL/classify-ticket" "401" '{"subject":"test","form_id":"test","workspace_id":"test"}'
echo ""

# --- churn-score ---
echo "[churn-score]"
test_endpoint "POST without auth → 401" \
  POST "$BASE_URL/churn-score" "401" '{"workspace_id":"test"}'
echo ""

# --- execute-workflow ---
echo "[execute-workflow]"
test_endpoint "POST without auth → 401 (gateway)" \
  POST "$BASE_URL/execute-workflow" "401" 'not-json'
test_endpoint "GET without auth → 401 (gateway)" \
  GET "$BASE_URL/execute-workflow" "401"
echo ""

# --- slack-notify ---
echo "[slack-notify]"
test_endpoint "POST without auth → 401 (gateway)" \
  POST "$BASE_URL/slack-notify" "401" '{"event_type":"test"}'
test_endpoint "POST non-Slack URL without auth → 401 (gateway)" \
  POST "$BASE_URL/slack-notify" "401" '{"webhook_url":"https://evil.com","event_type":"test"}'
echo ""

# --- create-checkout ---
echo "[create-checkout]"
test_endpoint "POST without auth → 401" \
  POST "$BASE_URL/create-checkout" "401" '{"priceId":"test","workspaceId":"test"}'
echo ""

# --- create-portal-session ---
echo "[create-portal-session]"
test_endpoint "POST without auth → 401" \
  POST "$BASE_URL/create-portal-session" "401" '{"workspaceId":"test"}'
echo ""

# --- Summary ---
echo "========================================"
echo "Smoke Test Summary"
echo "  Passed: $PASSED / $TOTAL"
echo "  Failed: $FAILED / $TOTAL"
echo "========================================"

exit $FAILED
