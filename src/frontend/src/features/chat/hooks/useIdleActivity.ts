import { useCallback, useRef, useState, useEffect } from 'react';

interface IdleActivityState {
  isIdle: boolean;
  lastActivityTime: number;
  recordActivity: () => void;
}

/**
 * Hook to track user activity and determine idle state.
 * Returns idle state and a function to record activity.
 */
export function useIdleActivity(idleThresholdMs: number = 30000): IdleActivityState {
  const [isIdle, setIsIdle] = useState(false);
  const lastActivityTimeRef = useRef(Date.now());

  const recordActivity = useCallback(() => {
    lastActivityTimeRef.current = Date.now();
    if (isIdle) {
      setIsIdle(false);
    }
  }, [isIdle]);

  useEffect(() => {
    const checkIdle = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityTimeRef.current;
      const shouldBeIdle = timeSinceActivity > idleThresholdMs;
      
      if (shouldBeIdle !== isIdle) {
        setIsIdle(shouldBeIdle);
      }
    };

    // Check idle state every 10 seconds
    const interval = setInterval(checkIdle, 10000);
    return () => clearInterval(interval);
  }, [idleThresholdMs, isIdle]);

  return {
    isIdle,
    lastActivityTime: lastActivityTimeRef.current,
    recordActivity,
  };
}
