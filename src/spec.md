# Specification

## Summary
**Goal:** Improve chat messaging reliability and perceived quality with optimistic sending, clearer user feedback, stable timeline behavior, and more efficient send/refresh flows.

**Planned changes:**
- Add optimistic message sending so newly sent messages appear immediately with a distinct “Sending…” state.
- Add failed-send handling with an English “Failed to send” state and a one-click Retry action that resends the same content/attachment/reply target.
- Reconcile optimistic messages with server-confirmed messages to avoid duplicate entries after successful send.
- Stabilize timeline ordering across periodic refreshes and reduce visible flicker by keeping the last-known message list rendered while refetching.
- On refetch failure, keep current messages visible and show a non-blocking English error state with a clear Retry action.
- Fix backend `getMessages(roomId, start, count)` to honor pagination parameters and return messages in a documented, predictable order.
- Improve React Query flow to update the message list immediately after a successful send (cache update) and reduce unnecessary list churn when polled data is unchanged.

**User-visible outcome:** Messages appear instantly when sent with clear sending/failed states and a retry button; the timeline stays consistently ordered with less flicker during refreshes; and message loading/sending feels more reliable, especially under intermittent connectivity.
