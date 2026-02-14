import type { ChatMessage } from '../types/chatMessage';
import { messagesEqual } from './messageEquality';

/**
 * Structural sharing helper that reuses prior array and object references
 * when messages are unchanged, minimizing React re-renders.
 */
export function structuralShareMessages(
  oldData: ChatMessage[] | undefined,
  newData: ChatMessage[]
): ChatMessage[] {
  if (!oldData || oldData.length === 0) return newData;
  if (newData.length === 0) return newData;
  
  // Build a map of old messages by ID for quick lookup
  const oldMap = new Map<bigint, ChatMessage>();
  oldData.forEach(msg => oldMap.set(msg.messageId, msg));
  
  // Reuse old message objects when they're equal
  let hasChanges = false;
  const result = newData.map(newMsg => {
    const oldMsg = oldMap.get(newMsg.messageId);
    if (oldMsg && messagesEqual(oldMsg, newMsg)) {
      return oldMsg; // Reuse old reference
    }
    hasChanges = true;
    return newMsg;
  });
  
  // If no changes and same length, return old array reference
  if (!hasChanges && oldData.length === newData.length) {
    return oldData;
  }
  
  return result;
}
