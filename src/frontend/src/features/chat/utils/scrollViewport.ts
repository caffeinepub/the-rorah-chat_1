/**
 * Helper to access the scrollable viewport element inside a ScrollArea component.
 * ScrollArea wraps content in a viewport div that handles the actual scrolling.
 */
export function getScrollViewport(scrollAreaRef: HTMLDivElement | null): HTMLElement | null {
  if (!scrollAreaRef) return null;
  
  // ScrollArea from Radix UI creates a viewport element
  const viewport = scrollAreaRef.querySelector('[data-radix-scroll-area-viewport]');
  return viewport as HTMLElement | null;
}

/**
 * Scroll to bottom of the viewport
 */
export function scrollToBottom(scrollAreaRef: HTMLDivElement | null, behavior: ScrollBehavior = 'smooth') {
  const viewport = getScrollViewport(scrollAreaRef);
  if (!viewport) return;
  
  viewport.scrollTo({
    top: viewport.scrollHeight,
    behavior,
  });
}

/**
 * Check if user is near the bottom of the scroll area.
 * Accepts optional cached viewport element to avoid repeated DOM queries.
 */
export function isNearBottom(
  scrollAreaRef: HTMLDivElement | null, 
  threshold: number = 100,
  cachedViewport?: HTMLElement | null
): boolean {
  const viewport = cachedViewport || getScrollViewport(scrollAreaRef);
  if (!viewport) return true;
  
  const { scrollTop, scrollHeight, clientHeight } = viewport;
  return scrollHeight - scrollTop - clientHeight < threshold;
}

/**
 * Get current scroll position
 */
export function getScrollPosition(scrollAreaRef: HTMLDivElement | null): number {
  const viewport = getScrollViewport(scrollAreaRef);
  return viewport?.scrollTop ?? 0;
}

/**
 * Set scroll position
 */
export function setScrollPosition(scrollAreaRef: HTMLDivElement | null, position: number) {
  const viewport = getScrollViewport(scrollAreaRef);
  if (viewport) {
    viewport.scrollTop = position;
  }
}
