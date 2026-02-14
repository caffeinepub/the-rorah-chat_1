import type { ChatMessage } from '../types/chatMessage';
import { getMediaFingerprint } from './mediaFingerprint';
import type { ExternalBlob } from '../../../backend';

/**
 * Check if two messages are equal for the purposes of structural sharing.
 * Compares stable fields to avoid unnecessary re-renders.
 */
export function messagesEqual(a: ChatMessage, b: ChatMessage): boolean {
  if (a.messageId !== b.messageId) return false;
  if (a.content !== b.content) return false;
  if (a.reactions.length !== b.reactions.length) return false;
  
  // Compare replyTo
  if (a.replyTo !== b.replyTo) return false;
  
  // Compare media by fingerprint (not full byte comparison)
  // Handle both Uint8Array and ExternalBlob types
  const aMedia = a.media instanceof Uint8Array ? a.media : undefined;
  const bMedia = b.media instanceof Uint8Array ? b.media : undefined;
  
  // If both are ExternalBlob or other types, compare by reference
  if (!aMedia && !bMedia) {
    if (a.media !== b.media) return false;
  } else {
    // Compare fingerprints for Uint8Array
    if (getMediaFingerprint(aMedia) !== getMediaFingerprint(bMedia)) return false;
  }
  
  // Compare reactions efficiently
  if (a.reactions.length > 0) {
    for (let i = 0; i < a.reactions.length; i++) {
      if (a.reactions[i].emoji !== b.reactions[i].emoji) return false;
      if (a.reactions[i].userId !== b.reactions[i].userId) return false;
    }
  }
  
  return true;
}
