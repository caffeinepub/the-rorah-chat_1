/**
 * Determines the appropriate polling interval based on visibility, activity, and message state.
 */
export function getPollingInterval(options: {
  isVisible: boolean;
  isIdle: boolean;
  isNearBottom: boolean;
  hasRecentActivity: boolean;
}): number | false {
  const { isVisible, isIdle, isNearBottom, hasRecentActivity } = options;

  // No polling when tab is hidden
  if (!isVisible) {
    return false;
  }

  // Fast polling when user is active and near bottom
  if (hasRecentActivity && isNearBottom) {
    return 3000; // 3 seconds
  }

  // Medium polling when user is active but scrolled up
  if (hasRecentActivity) {
    return 5000; // 5 seconds
  }

  // Slow polling when idle and near bottom
  if (isNearBottom && !isIdle) {
    return 8000; // 8 seconds
  }

  // Very slow polling when idle
  if (isIdle) {
    return 15000; // 15 seconds
  }

  // Default medium polling
  return 5000;
}
