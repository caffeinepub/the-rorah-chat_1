import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRoomMessages, useValidateRoom } from '../../hooks/useQueries';
import { useActor } from '../../hooks/useActor';
import { useLocalProfile } from '../../hooks/useLocalProfile';
import { useIdleActivity } from '../chat/hooks/useIdleActivity';
import { useRafThrottledCallback } from '../../hooks/useRafThrottledCallback';
import { MessageComposer } from './components/MessageComposer';
import { MessageItem } from './components/MessageItem';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, AlertCircle, RefreshCw, ChevronUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { MessageId, PublicMessage } from '../../backend';
import type { ChatMessage } from './types/chatMessage';
import { scrollToBottom, isNearBottom, getScrollPosition, setScrollPosition, getScrollViewport } from './utils/scrollViewport';
import { filterRecentMessages } from './utils/messageVisibility';
import { extractErrorMessage } from './utils/messageErrors';

interface RoomPageProps {
  roomId: string;
  onLeaveRoom: () => void;
}

const INITIAL_MESSAGE_WINDOW = 50; // Show only 50 most recent messages initially
const LOAD_MORE_INCREMENT = 25; // Load 25 more when user clicks "Load older"

export function RoomPage({ roomId, onLeaveRoom }: RoomPageProps) {
  const { userId, nickname } = useLocalProfile();
  const { actor } = useActor();
  const { recordActivity } = useIdleActivity(30000); // 30 seconds idle threshold
  
  const { data: roomExists, isLoading: isValidatingRoom, isError: isValidationError, refetch: refetchValidation } = useValidateRoom(roomId);
  
  const [replyToMessage, setReplyToMessage] = useState<MessageId | null>(null);
  const [visibleMessageCount, setVisibleMessageCount] = useState(INITIAL_MESSAGE_WINDOW);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const wasNearBottomRef = useRef<boolean>(true);
  const viewportRef = useRef<HTMLElement | null>(null);

  const { 
    data: messages, 
    isLoading: isLoadingMessages, 
    isError, 
    error,
    refetch,
    isFetching,
  } = useRoomMessages(
    roomId,
    roomExists === true
  );

  // Extract user-friendly error message
  const errorMessage = useMemo(() => {
    if (!isError || !error) return '';
    return extractErrorMessage(error);
  }, [isError, error]);

  // Check if the error indicates the room doesn't exist
  const isRoomNotFoundError = useMemo(() => {
    return errorMessage.toLowerCase().includes('room') && 
           (errorMessage.toLowerCase().includes('not exist') || 
            errorMessage.toLowerCase().includes('no longer exists'));
  }, [errorMessage]);

  // Filter messages to only show those within the last hour
  const recentMessages = useMemo(() => {
    if (!messages) return [];
    return filterRecentMessages(messages);
  }, [messages]);

  // Build a memoized lookup map for reply context resolution (from recent messages only)
  const messageMap = useMemo(() => {
    const map = new Map<MessageId, PublicMessage>();
    recentMessages.forEach((msg) => {
      map.set(msg.messageId, msg);
    });
    return map;
  }, [recentMessages]);

  // Memoized callback to get reply message
  const getReplyMessage = useCallback(
    (messageId: MessageId) => {
      return messageMap.get(messageId);
    },
    [messageMap]
  );

  // Slice messages to show only the most recent ones (bounded rendering from recent messages)
  const visibleMessages = useMemo(() => {
    if (recentMessages.length === 0) return [];
    const startIndex = Math.max(0, recentMessages.length - visibleMessageCount);
    return recentMessages.slice(startIndex);
  }, [recentMessages, visibleMessageCount]);

  const hasOlderMessages = recentMessages.length > visibleMessageCount;

  // Clear replyToMessage if the target message is no longer in the visible/recent set
  useEffect(() => {
    if (replyToMessage && !messageMap.has(replyToMessage)) {
      setReplyToMessage(null);
    }
  }, [replyToMessage, messageMap]);

  // Handle loading more messages
  const handleLoadOlder = () => {
    if (!scrollAreaRef.current) return;
    
    // Save current scroll position before adding more messages
    const currentScrollPos = getScrollPosition(scrollAreaRef.current);
    prevScrollHeightRef.current = scrollAreaRef.current.scrollHeight;
    
    // Increase visible message count
    setVisibleMessageCount(prev => prev + LOAD_MORE_INCREMENT);
    
    // After render, restore scroll position to prevent jump
    requestAnimationFrame(() => {
      if (scrollAreaRef.current) {
        const newScrollHeight = scrollAreaRef.current.scrollHeight;
        const heightDiff = newScrollHeight - prevScrollHeightRef.current;
        setScrollPosition(scrollAreaRef.current, currentScrollPos + heightDiff);
      }
    });
    
    recordActivity();
  };

  // Auto-scroll to bottom only when user is near bottom and new messages arrive
  useEffect(() => {
    if (!scrollAreaRef.current || !visibleMessages.length) return;
    
    // Check if user was near bottom before update
    const shouldAutoScroll = wasNearBottomRef.current;
    
    if (shouldAutoScroll) {
      // Small delay to ensure DOM has updated
      requestAnimationFrame(() => {
        scrollToBottom(scrollAreaRef.current, 'smooth');
      });
    }
  }, [visibleMessages.length]);

  // Track if user is near bottom (for auto-scroll decision) with RAF throttling
  const handleScroll = useRafThrottledCallback(() => {
    if (!viewportRef.current) return;
    wasNearBottomRef.current = isNearBottom(null, 100, viewportRef.current);
  });

  useEffect(() => {
    if (!scrollAreaRef.current) return;
    
    const viewport = getScrollViewport(scrollAreaRef.current);
    if (!viewport) return;
    
    viewportRef.current = viewport;
    
    // Register passive scroll listener
    viewport.addEventListener('scroll', handleScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Stable callback for reply action
  const handleReply = useCallback((messageId: MessageId) => {
    setReplyToMessage(messageId);
    recordActivity();
  }, [recordActivity]);

  // Activity handler for composer
  const handleComposerActivity = useCallback(() => {
    recordActivity();
  }, [recordActivity]);

  // Manual reload handler
  const handleReload = useCallback(() => {
    refetch();
    recordActivity();
  }, [refetch, recordActivity]);

  // Show connecting state only while actor is null
  if (!actor) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
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
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
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
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
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
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="container max-w-md px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Room Not Found</AlertTitle>
            <AlertDescription className="mt-2">
              This room does not exist. Please check the room ID and try again.
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-center">
            <Button onClick={onLeaveRoom} variant="default">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Lobby
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const replyMessage = replyToMessage ? messageMap.get(replyToMessage) : undefined;

  // Determine if we have messages but they're all older than 1 hour
  const hasMessagesButAllOld = messages && messages.length > 0 && recentMessages.length === 0;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Button variant="ghost" size="icon" onClick={onLeaveRoom}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Room: {roomId}</h2>
          <p className="text-sm text-muted-foreground">
            Chatting as {nickname || 'Anonymous'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {hasOlderMessages && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadOlder}
                className="gap-2"
              >
                <ChevronUp className="h-4 w-4" />
                Load older messages
              </Button>
            </div>
          )}

          {isLoadingMessages && visibleMessages.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Messages</AlertTitle>
                <AlertDescription className="mt-2">
                  {errorMessage}
                </AlertDescription>
              </Alert>
              <div className="flex justify-center gap-2">
                <Button 
                  onClick={handleReload} 
                  variant="default"
                  disabled={isFetching}
                >
                  {isFetching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry
                    </>
                  )}
                </Button>
                {isRoomNotFoundError && (
                  <Button onClick={onLeaveRoom} variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Lobby
                  </Button>
                )}
              </div>
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {hasMessagesButAllOld ? (
                <>
                  <p className="text-muted-foreground">No recent messages</p>
                  <p className="text-sm text-muted-foreground">Messages older than 1 hour are hidden</p>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">No messages yet</p>
                  <p className="text-sm text-muted-foreground">Be the first to say something!</p>
                </>
              )}
            </div>
          ) : (
            visibleMessages.map((message) => (
              <MessageItem
                key={message.messageId.toString()}
                message={message}
                isOwn={message.userId === userId}
                currentUserId={userId}
                roomId={roomId}
                onReply={handleReply}
                getReplyMessage={getReplyMessage}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="border-t border-border bg-card p-4">
        <MessageComposer
          roomId={roomId}
          userId={userId}
          nickname={nickname}
          replyToMessage={replyMessage}
          onCancelReply={() => setReplyToMessage(null)}
          onActivity={handleComposerActivity}
          onReload={handleReload}
          isReloading={isFetching}
        />
      </div>
    </div>
  );
}
