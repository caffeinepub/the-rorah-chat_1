# Specification

## Summary
**Goal:** Allow users to reply to their own sent messages in the chat UI.

**Planned changes:**
- Update the message action UI to show the Reply action for messages authored by the current user as well as other users.
- Keep the Reply action hidden/disabled for optimistic messages in sending/failed states.
- Ensure clicking Reply on an own message sets the reply context and composer reply-to preview the same way as replying to others.

**User-visible outcome:** In a chat room, you can reply to your own messages (with the normal quoted/reply-to context), while Reply remains unavailable for messages that are still sending or have failed.
