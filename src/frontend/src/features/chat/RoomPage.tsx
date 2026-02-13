import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRoomMessages, useValidateRoom } from '../../hooks/useQueries';
import { useActor } from '../../hooks/useActor';
import { useLocalProfile } from '../../hooks/useLocalProfile';
import { MessageComposer } from './components/MessageComposer';
import { MessageItem } from './components/MessageItem';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { MessageId, PublicMessage } from '../../backend';
import type { ChatMessage } from './types/chatMessage';

interface RoomPageProps {
  roomId: string;
  onLeaveRoom: () => void;
}

export function RoomPage({ roomId, onLeaveRoom }: RoomPageProps) {
  const { userId, nickname } = useLocalProfile();
  const { actor } = useActor();
  const { data: roomExists, isLoading: isValidatingRoom, isError: isValidationError, refetch: refetchValidation } = useValidateRoom(roomId);
  const { 
    data: messages, 
    isLoading: isLoadingMessages, 
    isError, 
    refetch,
    isFetching,
  } = useRoomMessages(
    roomId,
    roomExists === true
  );
  const [replyToMessage, setReplyToMessage] = useState<MessageId | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages?.length]);

  // Build a memoized lookup map for reply context resolution
  const messageMap = useMemo(() => {
    if (!messages) return new Map<MessageId, PublicMessage>();
    const map = new Map<MessageId, PublicMessage>();
    messages.forEach((msg) => {
      map.set(msg.messageId, msg);
    });
    return map;
  }, [messages]);

  // Memoized callback to get reply message
  const getReplyMessage = useCallback(
    (messageId: MessageId) => {
      return messageMap.get(messageId);
    },
    [messageMap]
  );

  // Show connecting state only while actor is null
  if (!actor) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Connecting to backend...</p>
        </div>
      </div>
    );
  }

  // Show validation error state with retry button
  if (isValidationError) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <div className="container max-w-md px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Validation Error</AlertTitle>
            <AlertDescription className="mt-2">
              We couldn't validate this room due to a server or network error. Please try again.
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={() => refetchValidation()} variant="default">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
            <Button onClick={onLeaveRoom} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Lobby
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while validating
  if (isValidatingRoom) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Validating room...</p>
        </div>
      </div>
    );
  }

  // Only show "Room Not Found" when validation has definitively returned false
  if (roomExists === false) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <div className="container max-w-md px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Room Not Found</AlertTitle>
            <AlertDescription className="mt-2">
              The room you're trying to access doesn't exist. It may have been deleted or the room code is incorrect.
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-center">
            <Button onClick={onLeaveRoom}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Lobby
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while messages are being fetched initially
  if (isLoadingMessages) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  const replyToMessageData = replyToMessage ? messageMap.get(replyToMessage) : undefined;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={onLeaveRoom}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{roomId}</h2>
          </div>
          {isFetching && !isLoadingMessages && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Syncing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages - scrollable area */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="container max-w-4xl px-4 py-4 pb-6">
            {/* Non-blocking error banner for refetch failures */}
            {isError && messages && messages.length > 0 && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Issue</AlertTitle>
                <AlertDescription className="flex items-center justify-between gap-4">
                  <span>Unable to fetch new messages. Showing cached messages.</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetch()}
                    className="shrink-0"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Full error state when no cached messages */}
            {isError && (!messages || messages.length === 0) ? (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error loading messages</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>Failed to load messages. Please check your connection and try again.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetch()}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((message: ChatMessage) => (
                  <MessageItem
                    key={message.clientId || message.messageId.toString()}
                    message={message}
                    isOwn={message.userId === userId}
                    currentUserId={userId}
                    roomId={roomId}
                    onReply={() => setReplyToMessage(message.messageId)}
                    getReplyMessage={getReplyMessage}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                <div>
                  <p className="text-lg font-medium">No messages yet</p>
                  <p className="text-sm">Be the first to send a message!</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Message Composer - fixed at bottom */}
      <div className="shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-4xl px-4 py-4">
          <MessageComposer
            roomId={roomId}
            userId={userId}
            nickname={nickname}
            replyToMessage={replyToMessageData}
            onCancelReply={() => setReplyToMessage(null)}
          />
        </div>
      </div>
    </div>
  );
}
