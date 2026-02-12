import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Room, Message, MessageId, RoomId, UserId, Media } from '../backend';

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

export function useRoomMessages(roomId: RoomId, enabled: boolean = true) {
  const { actor } = useActor();

  return useQuery<Message[]>({
    queryKey: ['messages', roomId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMessages(roomId, BigInt(0), BigInt(1000));
    },
    enabled: !!actor && !!roomId && enabled,
    refetchInterval: 3000,
  });
}

export function usePostMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      roomId,
      content,
      media,
      replyTo,
    }: {
      userId: UserId;
      roomId: RoomId;
      content: string;
      media: Media | null;
      replyTo: MessageId | null;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.postMessage(userId, roomId, content, media, replyTo);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.roomId] });
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
      return actor.editMessage(userId, roomId, messageId, newContent);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.roomId] });
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
      queryClient.invalidateQueries({ queryKey: ['messages', variables.roomId] });
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
      return actor.reactToMessage(userId, roomId, messageId, emoji);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.roomId] });
    },
  });
}
