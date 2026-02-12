import type { PublicMessage, MessageId, RoomId, UserId, Media } from '../../../backend';

/**
 * Client-side status for optimistic message handling
 */
export type ClientMessageStatus = 'sending' | 'failed' | 'sent';

/**
 * Payload needed to retry a failed message send
 */
export interface MessageSendPayload {
  userId: UserId;
  roomId: RoomId;
  content: string;
  media: Media | null;
  replyTo: MessageId | null;
}

/**
 * Extended message type with optimistic update support
 */
export interface ChatMessage extends PublicMessage {
  // Client-only fields for optimistic updates
  clientId?: string;
  clientStatus?: ClientMessageStatus;
  clientErrorText?: string;
  clientSendPayload?: MessageSendPayload;
}

/**
 * Type guard to check if a message is optimistic (not yet confirmed by backend)
 */
export function isOptimisticMessage(message: ChatMessage): boolean {
  return !!message.clientId && message.clientStatus !== 'sent';
}
