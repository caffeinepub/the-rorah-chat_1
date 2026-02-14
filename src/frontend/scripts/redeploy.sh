#!/bin/bash

# Redeploy script for anonymous chat application
# This script rebuilds and redeploys both backend and frontend canisters
# without introducing functional code changes.

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

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_step() {
    echo -e "${BLUE}$1${NC}"
}

# Error handler
error_handler() {
    log_error "Redeploy failed at line $1"
    log_error "Check the error message above for details"
    exit 1
}

trap 'error_handler $LINENO' ERR

# Start redeploy
echo ""
log_step "🚀 Starting redeploy process..."
echo ""

# Check if we're in the project root
if [ ! -f "dfx.json" ]; then
    log_error "dfx.json not found. Please run this script from the project root."
    exit 1
fi

log_success "Project root verified"

# Step 1: Build backend
log_step "📦 Step 1/5: Building backend canister..."
if dfx build backend; then
    log_success "Backend build completed"
else
    log_error "Backend build failed"
    exit 1
fi

# Step 2: Upgrade backend
log_step "⬆️  Step 2/5: Upgrading backend canister..."
log_info "Running migration to fix message storage..."
if dfx canister install backend --mode upgrade; then
    log_success "Backend upgrade completed (migration applied)"
else
    log_error "Backend upgrade failed"
    exit 1
fi

# Step 3: Generate bindings
log_step "🔧 Step 3/5: Generating TypeScript bindings..."
if dfx generate backend; then
    log_success "Bindings generated"
else
    log_error "Binding generation failed"
    exit 1
fi

# Step 4: Build frontend
log_step "🏗️  Step 4/5: Building frontend..."
if cd frontend && pnpm run build:skip-bindings; then
    cd ..
    log_success "Frontend build completed"
else
    cd ..
    log_error "Frontend build failed"
    exit 1
fi

# Step 5: Deploy frontend
log_step "🌐 Step 5/5: Deploying frontend canister..."
if dfx deploy frontend; then
    log_success "Frontend deployment completed"
else
    log_error "Frontend deployment failed"
    exit 1
fi

# Get frontend URL
FRONTEND_ID=$(dfx canister id frontend)
FRONTEND_URL="http://${FRONTEND_ID}.localhost:4943"

echo ""
log_success "🎉 Redeploy complete!"
echo ""
log_info "Frontend URL: ${FRONTEND_URL}"
echo ""
log_step "📋 Next steps:"
echo "   1. Run ./frontend/scripts/redeploy-verify.sh to verify the deployment"
echo "   2. Open the frontend URL in your browser"
echo "   3. Manually test the message reload flow (see verification output)"
echo ""
log_warning "Note: The migration has reset message storage to fix backend errors."
log_warning "Existing messages have been cleared. New messages will work correctly."
echo ""
