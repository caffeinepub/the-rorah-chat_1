# Specification

## Summary
**Goal:** Redeploy the backend and frontend canisters by rebuilding and upgrading/deploying them, without introducing any functional code changes.

**Planned changes:**
- Rebuild and upgrade the backend canister using the existing redeploy runbook/scripts.
- Regenerate backend bindings.
- Rebuild the frontend and deploy the frontend canister using the existing redeploy runbook/scripts.
- Run post-deployment verification checks (canister statuses and `listRooms` query).

**User-visible outcome:** The application is redeployed successfully (backend and frontend canisters running), and core verification (including `listRooms`) works as before with no functional behavior changes.
