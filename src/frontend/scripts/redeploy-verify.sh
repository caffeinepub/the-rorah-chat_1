#!/bin/bash

# Post-deployment verification script
# Performs lightweight checks to ensure the redeploy was successful

set -euo pipefail  # Exit on error, undefined variables, and pipe failures

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

log_step() {
    echo -e "${BLUE}$1${NC}"
}

# Start verification
echo ""
log_step "🔍 Running post-deployment verification..."
echo ""

# Check if we're in the project root
if [ ! -f "dfx.json" ]; then
    log_error "dfx.json not found. Please run this script from the project root."
    exit 1
fi

# Check backend canister status
log_step "📊 Checking backend canister status..."
BACKEND_STATUS=$(dfx canister status backend 2>&1) || {
    log_error "Failed to get backend canister status"
    echo "$BACKEND_STATUS"
    exit 1
}

if echo "$BACKEND_STATUS" | grep -q "Status: Running"; then
    log_success "Backend canister is running"
else
    log_error "Backend canister is not running"
    echo "$BACKEND_STATUS"
    exit 1
fi

# Check frontend canister status
log_step "📊 Checking frontend canister status..."
FRONTEND_STATUS=$(dfx canister status frontend 2>&1) || {
    log_error "Failed to get frontend canister status"
    echo "$FRONTEND_STATUS"
    exit 1
}

if echo "$FRONTEND_STATUS" | grep -q "Status: Running"; then
    log_success "Frontend canister is running"
else
    log_error "Frontend canister is not running"
    echo "$FRONTEND_STATUS"
    exit 1
fi

# Test backend query call
log_step "🔌 Testing backend query call (listRooms)..."
# Disable exit-on-error temporarily to capture the result properly
set +e
ROOMS_RESULT=$(dfx canister call backend listRooms 2>&1)
QUERY_EXIT_CODE=$?
set -e

if [ $QUERY_EXIT_CODE -eq 0 ]; then
    log_success "Backend query call successful"
    log_info "Rooms: $ROOMS_RESULT"
else
    log_error "Backend query call failed"
    echo "$ROOMS_RESULT"
    exit 1
fi

# Get frontend URL
FRONTEND_ID=$(dfx canister id frontend)
FRONTEND_URL="http://${FRONTEND_ID}.localhost:4943"

echo ""
log_success "✅ All automated checks passed!"
echo ""
log_step "🎯 Critical manual verification steps:"
echo ""
echo "   The backend migration has fixed the message storage issue."
echo "   Please verify the following to confirm the fix:"
echo ""
echo "   1. Open frontend: $FRONTEND_URL"
echo "   2. Create a new room or join an existing room"
echo "   3. ✨ POST A MESSAGE - this should work without errors"
echo "   4. ✨ CLICK THE RELOAD BUTTON - messages should load without backend errors"
echo "   5. Edit a message - should work correctly"
echo "   6. Delete a message - should work correctly"
echo "   7. Add a reaction - should work correctly"
echo "   8. Test file attachments (images/videos)"
echo ""
log_step "🔍 What to look for:"
echo "   ✅ No backend errors in browser console"
echo "   ✅ Messages appear after posting"
echo "   ✅ Reload button fetches messages successfully"
echo "   ✅ All message operations (edit/delete/react) work"
echo ""
log_info "Frontend URL: ${FRONTEND_URL}"
echo ""
