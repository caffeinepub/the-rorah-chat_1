# Redeploy Runbook

## Overview
This document describes the redeploy process for the anonymous chat application. A redeploy rebuilds and redeploys both the backend canister and frontend without requiring any functional code changes.

**IMPORTANT**: This runbook is for deployment-only operations. Do not introduce functional code changes during a redeploy.

## Prerequisites
- DFX CLI installed and configured
- Node.js and pnpm installed
- Access to the Internet Computer network (local or mainnet)
- Existing canister IDs (backend and frontend)
- Current working directory is the project root (where `dfx.json` is located)

## Quick Redeploy

### Automated Script (Recommended)
