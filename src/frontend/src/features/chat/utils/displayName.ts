import type { PublicMessage } from '../../../backend';

/**
 * Get a safe display name for a message sender.
 * Returns the nickname if present and non-empty, otherwise returns "Anonymous".
 * Never returns the userId.
 */
export function getDisplayName(message: PublicMessage): string {
  if (message.nickname && message.nickname.trim() !== '' && message.nickname !== message.userId) {
    return message.nickname;
  }
  return 'Anonymous';
}
