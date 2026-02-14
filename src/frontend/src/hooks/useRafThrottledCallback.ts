import { useCallback, useRef } from 'react';

/**
 * Hook that throttles a callback to run at most once per animation frame.
 * Useful for scroll handlers and other high-frequency events.
 */
export function useRafThrottledCallback<T extends (...args: any[]) => void>(
  callback: T
): T {
  const rafIdRef = useRef<number | null>(null);
  const latestCallbackRef = useRef(callback);

  // Keep callback ref up to date
  latestCallbackRef.current = callback;

  const throttledCallback = useCallback((...args: any[]) => {
    if (rafIdRef.current !== null) {
      // Already scheduled, skip this call
      return;
    }

    rafIdRef.current = requestAnimationFrame(() => {
      latestCallbackRef.current(...args);
      rafIdRef.current = null;
    });
  }, []);

  return throttledCallback as T;
}
