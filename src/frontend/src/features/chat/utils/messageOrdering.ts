import type { ChatMessage } from '../types/chatMessage';

/**
 * Stable sort comparator for messages
 * Sorts by timestamp ascending (oldest first), then by messageId/clientId for tie-breaking
 */
export function compareMessages(a: ChatMessage, b: ChatMessage): number {
  // First, compare by timestamp
  const timeA = Number(a.timestamp);
  const timeB = Number(b.timestamp);
  
  if (timeA !== timeB) {
    return timeA - timeB;
  }
  
  // Tie-breaker: use messageId if both have it
  if (a.messageId && b.messageId) {
    const idA = Number(a.messageId);
    const idB = Number(b.messageId);
    return idA - idB;
  }
  
  // If one is optimistic (has clientId but no messageId), put it after confirmed messages
  if (a.clientId && !b.clientId) return 1;
  if (!a.clientId && b.clientId) return -1;
  
  // Both optimistic: compare by clientId
  if (a.clientId && b.clientId) {
    return a.clientId.localeCompare(b.clientId);
  }
  
  return 0;
}

/**
 * Sort messages in a stable, predictable order
 */
export function sortMessages(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort(compareMessages);
}

/**
 * Merge optimistic messages with backend messages, removing duplicates
 */
export function mergeMessages(
  backendMessages: ChatMessage[],
  optimisticMessages: ChatMessage[]
): ChatMessage[] {
  const messageMap = new Map<string, ChatMessage>();
  
  // Add all backend messages (these are authoritative)
  backendMessages.forEach((msg) => {
    const key = msg.messageId.toString();
    messageMap.set(key, msg);
  });
  
  // Add optimistic messages that don't have a backend counterpart yet
  optimisticMessages.forEach((msg) => {
    if (msg.clientId && msg.clientStatus !== 'sent') {
      // Only add if not already confirmed by backend
      const existingKey = Array.from(messageMap.keys()).find((key) => {
        const existing = messageMap.get(key);
        return existing && existing.content === msg.content && 
               Math.abs(Number(existing.timestamp) - Number(msg.timestamp)) < 5000000000; // 5 seconds in nanoseconds
      });
      
      if (!existingKey) {
        messageMap.set(`optimistic-${msg.clientId}`, msg);
      }
    }
  });
  
  return sortMessages(Array.from(messageMap.values()));
}
