# Redeploy Runbook

## Overview
This document describes the redeploy process for the anonymous chat application. This redeploy includes a critical backend migration that fixes message storage issues causing backend errors.

**IMPORTANT**: This redeploy includes a migration that resets message storage to fix backend errors. Existing messages will be cleared, but all new messages will work correctly.

## What This Redeploy Fixes
- **Backend errors** when accessing messages in rooms
- **Message storage corruption** that prevented message operations
- **Self-healing message lists** - backend now initializes empty lists when missing

## Prerequisites
- DFX CLI installed and configured
- Node.js and pnpm installed
- Access to the Internet Computer network (local or mainnet)
- Existing canister IDs (backend and frontend)
- Current working directory is the project root (where `dfx.json` is located)

## Quick Redeploy

### Automated Script (Recommended)

Run the automated redeploy script from the project root:

