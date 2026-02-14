import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Room, PublicMessage, MessageId, RoomId, UserId, ExternalBlob } from '../backend';
import type { ChatMessage, MessageSendPayload } from '../features/chat/types/chatMessage';
import { sortMessages } from '../features/chat/utils/messageOrdering';
import { extractErrorMessage } from '../features/chat/utils/messageErrors';
import { structuralShareMessages } from '../features/chat/utils/structuralShareMessages';

export function useListRooms() {
  const { actor } = useActor();

  return useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listRooms();
    },
    enabled: !!actor,
    refetchInterval: 10000,
  });
}

export function useValidateRoom(roomId: RoomId | null) {
  const { actor } = useActor();

  return useQuery<boolean>({
    queryKey: ['validateRoom', roomId],
    queryFn: async () => {
      if (!actor || !roomId) throw new Error('Actor or roomId not available');
      return actor.validateRoom(roomId);
    },
    enabled: !!actor && !!roomId,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}

export function useValidateRoomMutation() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (roomId: RoomId) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.validateRoom(roomId);
    },
  });
}

export function useCreateRoom() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, name }: { roomId: RoomId; name: string }) => {
      if (!actor) throw new Error('Actor not initialized');
      await actor.createRoom(roomId, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useRoomMessages(
  roomId: RoomId, 
  enabled: boolean = true
) {
  const { actor } = useActor();

  return useQuery<ChatMessage[]>({
    queryKey: ['messages', roomId],
    queryFn: async () => {
      if (!actor) return [];
      // Fetch only recent messages (last 100) to reduce payload
      const messages = await actor.getMessages(roomId, BigInt(0), BigInt(100));
      return messages as ChatMessage[];
    },
    enabled: !!actor && !!roomId && enabled,
    // Disable automatic polling - messages only refresh on manual reload
    refetchInterval: false,
    refetchIntervalInBackground: false,
    // Disable unnecessary refetch triggers to reduce CPU usage
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 2000,
    // Keep previous data while refetching to avoid flicker
    placeholderData: (previousData) => previousData,
    // Apply stable sorting and structural sharing
    select: (data) => {
      const sorted = sortMessages(data);
      return sorted;
    },
    // Enhanced structural sharing to prevent unnecessary re-renders
    structuralSharing: (oldData, newData) => {
      if (!oldData || !newData) return newData;
      if (!Array.isArray(oldData) || !Array.isArray(newData)) return newData;
      
      return structuralShareMessages(oldData, newData);
    },
  });
}

interface PostMessageContext {
  previousMessages?: ChatMessage[];
}

export function usePostMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<PublicMessage, Error, MessageSendPayload & { clientId?: string }, PostMessageContext>({
    mutationFn: async ({ userId, roomId, content, media, replyTo }) => {
      if (!actor) throw new Error('Actor not initialized');
      const result = await actor.postMessage(userId, roomId, content, media, replyTo);
      if (result === null) {
        throw new Error('Room does not exist');
      }
      return result;
    },
    
    // Optimistic update: add message immediately
    onMutate: async (variables) => {
      const { roomId, clientId } = variables;
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages', roomId] });
      
      // Snapshot previous value
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(['messages', roomId]);
      
      // Optimistically update cache
      if (clientId) {
        const optimisticMessage: ChatMessage = {
          messageId: BigInt(0), // Temporary ID
          userId: variables.userId,
          roomId: variables.roomId,
          content: variables.content,
          timestamp: BigInt(Date.now() * 1000000), // Current time in nanoseconds
          media: variables.media || undefined,
          reactions: [],
          replyTo: variables.replyTo || undefined,
          nickname: '', // Will be filled by backend
          clientId,
          clientStatus: 'sending',
          clientSendPayload: {
            userId: variables.userId,
            roomId: variables.roomId,
            content: variables.content,
            media: variables.media,
            replyTo: variables.replyTo,
          },
        };
        
        queryClient.setQueryData<ChatMessage[]>(
          ['messages', roomId],
          (old) => {
            const messages = old || [];
            return sortMessages([...messages, optimisticMessage]);
          }
        );
      }
      
      return { previousMessages };
    },
    
    // On error, mark the optimistic message as failed
    onError: (error, variables, context) => {
      const { roomId, clientId } = variables;
      
      if (clientId) {
        queryClient.setQueryData<ChatMessage[]>(
          ['messages', roomId],
          (old) => {
            if (!old) return old;
            return old.map((msg) =>
              msg.clientId === clientId
                ? {
                    ...msg,
                    clientStatus: 'failed' as const,
                    clientErrorText: extractErrorMessage(error),
                  }
                : msg
            );
          }
        );
      } else if (context?.previousMessages) {
        // Rollback if no clientId
        queryClient.setQueryData(['messages', roomId], context.previousMessages);
      }
    },
    
    // On success, replace optimistic message with real one
    onSuccess: (data, variables) => {
      const { roomId, clientId } = variables;
      
      queryClient.setQueryData<ChatMessage[]>(
        ['messages', roomId],
        (old) => {
          if (!old) return [data as ChatMessage];
          
          // Remove optimistic message and add real one
          const withoutOptimistic = old.filter((msg) => msg.clientId !== clientId);
          
          // Check if message already exists (avoid duplicates)
          const exists = withoutOptimistic.some((msg) => msg.messageId === data.messageId);
          if (exists) {
            return withoutOptimistic;
          }
          
          return sortMessages([...withoutOptimistic, data as ChatMessage]);
        }
      );
    },
  });
}

export function useEditMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      roomId,
      messageId,
      newContent,
    }: {
      userId: UserId;
      roomId: RoomId;
      messageId: MessageId;
      newContent: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      const result = await actor.editMessage(userId, roomId, messageId, newContent);
      if (result === null) {
        throw new Error('Failed to edit message. The room or message may not exist.');
      }
      return result;
    },
    onSuccess: (data, variables) => {
      // Directly update the message in cache
      queryClient.setQueryData<ChatMessage[]>(
        ['messages', variables.roomId],
        (old) => {
          if (!old) return old;
          return old.map((msg) =>
            msg.messageId === variables.messageId ? (data as ChatMessage) : msg
          );
        }
      );
    },
  });
}

export function useDeleteMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      roomId,
      messageId,
    }: {
      userId: UserId;
      roomId: RoomId;
      messageId: MessageId;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      await actor.deleteMessage(userId, roomId, messageId);
    },
    onSuccess: (_, variables) => {
      // Directly remove the message from cache
      queryClient.setQueryData<ChatMessage[]>(
        ['messages', variables.roomId],
        (old) => {
          if (!old) return old;
          return old.filter((msg) => msg.messageId !== variables.messageId);
        }
      );
    },
  });
}

export function useReactToMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      roomId,
      messageId,
      emoji,
    }: {
      userId: UserId;
      roomId: RoomId;
      messageId: MessageId;
      emoji: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      const result = await actor.reactToMessage(userId, roomId, messageId, emoji);
      if (result === null) {
        throw new Error('Failed to add reaction. The room or message may not exist.');
      }
      return result;
    },
    onSuccess: (data, variables) => {
      // Directly update the message in cache
      queryClient.setQueryData<ChatMessage[]>(
        ['messages', variables.roomId],
        (old) => {
          if (!old) return old;
          return old.map((msg) =>
            msg.messageId === variables.messageId ? (data as ChatMessage) : msg
          );
        }
      );
    },
  });
}

export function useSetNickname() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ userId, nickname }: { userId: UserId; nickname: string }) => {
      if (!actor) throw new Error('Actor not initialized');
      await actor.setNickname(userId, nickname);
    },
  });
}
