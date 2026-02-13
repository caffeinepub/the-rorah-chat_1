# Specification

## Summary
**Goal:** Keep the chat message composer/type bar visually fixed at the bottom of the viewport while the message timeline scrolls independently.

**Planned changes:**
- Update the chat room page/layout so only the message list is scrollable and the composer remains fixed and always clickable at the bottom of the screen.
- Add sufficient bottom spacing/padding in the scrollable message list so the last message is fully visible above the fixed composer (not hidden behind it).
- Ensure the fixed-composer behavior remains usable on small/mobile viewports during typical interactions (scrolling, focusing the input, sending a message).

**User-visible outcome:** Users can scroll through chat messages while the composer stays fixed at the bottom, remains accessible at all times, and the newest/last messages are not obscured by the composer.
