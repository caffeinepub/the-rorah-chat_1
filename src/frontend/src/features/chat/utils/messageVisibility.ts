/**
 * Utility to determine if a message is within the last hour.
 * Uses backend Time (bigint nanoseconds) and compares to current time.
 */

// 1 hour in milliseconds
const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Check if a message timestamp (backend Time in nanoseconds) is within the last hour
 * @param timestamp - Backend Time value (bigint in nanoseconds)
 * @returns true if the message was sent within the last hour
 */
export function isMessageWithinLastHour(timestamp: bigint): boolean {
  // Convert backend nanoseconds to milliseconds
  const messageTimeMs = Number(timestamp / BigInt(1000000));
  const currentTimeMs = Date.now();
  const ageMs = currentTimeMs - messageTimeMs;
  
  return ageMs <= ONE_HOUR_MS;
}

/**
 * Filter messages to only include those within the last hour
 * @param messages - Array of messages with timestamp field
 * @returns Filtered array containing only messages from the last hour
 */
export function filterRecentMessages<T extends { timestamp: bigint }>(messages: T[]): T[] {
  return messages.filter(msg => isMessageWithinLastHour(msg.timestamp));
}
