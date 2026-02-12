import { useState, useEffect, memo, useMemo } from 'react';
import { useEditMessage, useDeleteMessage, usePostMessage } from '../../../hooks/useQueries';
import { ReactionBar } from '../reactions/ReactionBar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreVertical, Edit, Trash, Reply, Check, X, Download, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { PublicMessage, RoomId, UserId, MessageId } from '../../../backend';
import type { ChatMessage } from '../types/chatMessage';
import { cn } from '@/lib/utils';
import { getDisplayName } from '../utils/displayName';
import { downloadFromUrl, getExtensionFromMimeType } from '../utils/download';

interface MessageItemProps {
  message: ChatMessage;
  isOwn: boolean;
  currentUserId: UserId;
  roomId: RoomId;
  onReply: () => void;
  getReplyMessage: (messageId: MessageId) => PublicMessage | undefined;
}

export const MessageItem = memo(function MessageItem({
  message,
  isOwn,
  currentUserId,
  roomId,
  onReply,
  getReplyMessage,
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);

  const editMutation = useEditMessage();
  const deleteMutation = useDeleteMessage();
  const postMessageMutation = usePostMessage();

  const replyToMessage = message.replyTo ? getReplyMessage(message.replyTo) : null;

  // Check if this is an optimistic message
  const isPending = message.clientStatus === 'sending';
  const isFailed = message.clientStatus === 'failed';

  // Detect MIME type from media bytes (simple heuristic)
  const detectMimeType = useMemo(() => {
    return (bytes: Uint8Array): string => {
      if (bytes.length < 4) return 'application/octet-stream';
      
      // Check magic numbers for common file types
      const header = Array.from(bytes.slice(0, 12))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // JPEG
      if (header.startsWith('ffd8ff')) return 'image/jpeg';
      // PNG
      if (header.startsWith('89504e47')) return 'image/png';
      // GIF
      if (header.startsWith('474946')) return 'image/gif';
      // WebP
      if (header.includes('57454250')) return 'image/webp';
      // MP4
      if (header.includes('667479706d703432') || header.includes('667479706973')) return 'video/mp4';
      // WebM
      if (header.startsWith('1a45dfa3')) return 'video/webm';
      // PDF
      if (header.startsWith('255044462d')) return 'application/pdf';
      
      return 'application/octet-stream';
    };
  }, []);

  // Convert media bytes to blob URL for display
  useEffect(() => {
    if (message.media && message.media.length > 0) {
      const mediaArray = new Uint8Array(message.media);
      const detectedMimeType = detectMimeType(mediaArray);
      setMimeType(detectedMimeType);
      const blob = new Blob([mediaArray], { type: detectedMimeType });
      const url = URL.createObjectURL(blob);
      setMediaUrl(url);

      // Cleanup blob URL on unmount
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [message.media, detectMimeType]);

  const handleEdit = async () => {
    if (!editContent.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    try {
      await editMutation.mutateAsync({
        userId: currentUserId,
        roomId,
        messageId: message.messageId,
        newContent: editContent.trim(),
      });
      setIsEditing(false);
      toast.success('Message updated');
    } catch (error) {
      toast.error('Failed to edit message');
      console.error(error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({
        userId: currentUserId,
        roomId,
        messageId: message.messageId,
      });
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete message');
      console.error(error);
    }
    setShowDeleteDialog(false);
  };

  const handleRetry = async () => {
    if (!message.clientSendPayload) return;

    try {
      // Generate a new client ID for the retry
      const newClientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await postMessageMutation.mutateAsync({
        ...message.clientSendPayload,
        clientId: newClientId,
      });
    } catch (error) {
      // Error will be handled by mutation's onError
      console.error('Retry error:', error);
    }
  };

  const handleDownload = () => {
    if (!mediaUrl || !mimeType) return;
    const extension = getExtensionFromMimeType(mimeType);
    const filename = `attachment_${message.messageId}.${extension}`;
    downloadFromUrl(mediaUrl, filename);
  };

  const isImage = mimeType?.startsWith('image/');
  const isVideo = mimeType?.startsWith('video/');
  const displayName = getDisplayName(message);

  return (
    <div className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
      <div className={cn('flex max-w-[70%] flex-col gap-1', isOwn && 'items-end')}>
        {/* Reply context */}
        {replyToMessage && (
          <div className="mb-1 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs">
            <p className="font-medium text-muted-foreground">
              Replying to {getDisplayName(replyToMessage)}
            </p>
            <p className="text-muted-foreground">{replyToMessage.content.substring(0, 50)}...</p>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2',
            isOwn
              ? 'bg-sent-bubble text-sent-bubble-foreground'
              : 'bg-received-bubble text-received-bubble-foreground',
            isPending && 'opacity-70',
            isFailed && 'border-2 border-destructive'
          )}
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-semibold">{displayName}</span>
            {isPending && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Sending...
              </span>
            )}
            {isOwn && !isPending && !isFailed && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEdit} disabled={editMutation.isPending}>
                  <Check className="mr-1 h-3 w-3" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }}
                >
                  <X className="mr-1 h-3 w-3" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>

              {/* Media display */}
              {mediaUrl && (
                <div className="mt-2">
                  {isImage && (
                    <div className="relative group">
                      <img
                        src={mediaUrl}
                        alt="Attachment"
                        className="max-h-64 rounded-lg object-contain"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handleDownload}
                        title="Download image"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  )}
                  {isVideo && (
                    <div className="relative group">
                      <video
                        src={mediaUrl}
                        controls
                        className="max-h-64 rounded-lg"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handleDownload}
                        title="Download video"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  )}
                  {!isImage && !isVideo && (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-background/50 p-2">
                      <div className="flex-1">
                        <p className="text-xs font-medium">Attachment</p>
                        <p className="text-xs text-muted-foreground">{mimeType}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownload}
                        title="Download file"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Failed state with error message and retry */}
              {isFailed && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-2">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-destructive">Failed to send</p>
                      {message.clientErrorText && (
                        <p className="text-xs text-destructive/80 mt-0.5">
                          {message.clientErrorText}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetry}
                    disabled={postMessageMutation.isPending}
                    className="w-full"
                  >
                    {postMessageMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-3 w-3" />
                        Retry
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}

          {!isPending && !isFailed && (
            <p className="mt-1 text-xs opacity-70">
              {new Date(Number(message.timestamp) / 1000000).toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Reactions and reply button */}
        {!isPending && !isFailed && (
          <div className="flex items-center gap-2">
            <ReactionBar
              message={message}
              currentUserId={currentUserId}
              roomId={roomId}
              align={isOwn ? 'end' : 'start'}
            />
            {!isOwn && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onReply}>
                <Reply className="mr-1 h-3 w-3" />
                Reply
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
