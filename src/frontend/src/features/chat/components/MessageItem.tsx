import { useState, memo, useMemo } from 'react';
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
import { MoreVertical, Edit, Trash, Reply, Check, X, Download, Loader2, RefreshCw, AlertCircle, FileQuestion } from 'lucide-react';
import { toast } from 'sonner';
import type { PublicMessage, RoomId, UserId, MessageId } from '../../../backend';
import type { ChatMessage } from '../types/chatMessage';
import { cn } from '@/lib/utils';
import { getDisplayName } from '../utils/displayName';
import { downloadFromUrl, downloadFromBytes, getExtensionFromMimeType } from '../utils/download';
import { useAttachmentObjectUrl } from '../hooks/useAttachmentObjectUrl';
import { detectMimeType } from '../utils/detectMimeType';
import { getMediaFingerprint } from '../utils/mediaFingerprint';
import { getCachedAttachmentMetadata } from '../utils/attachmentMemo';

interface MessageItemProps {
  message: ChatMessage;
  isOwn: boolean;
  currentUserId: UserId;
  roomId: RoomId;
  onReply: (messageId: MessageId) => void;
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

  const editMutation = useEditMessage();
  const deleteMutation = useDeleteMessage();
  const postMessageMutation = usePostMessage();

  const replyToMessage = message.replyTo ? getReplyMessage(message.replyTo) : null;

  // Check if this is an optimistic message
  const isPending = message.clientStatus === 'sending';
  const isFailed = message.clientStatus === 'failed';

  // Normalize media bytes to Uint8Array for both optimistic and fetched messages
  const normalizedMedia = useMemo(() => {
    if (!message.media) return undefined;
    
    // If already a Uint8Array, return as-is
    if (message.media instanceof Uint8Array) {
      return message.media;
    }
    
    // Convert array-like objects to Uint8Array
    try {
      return new Uint8Array(message.media as ArrayLike<number>);
    } catch (error) {
      console.error('Failed to normalize media bytes:', error);
      return undefined;
    }
  }, [message.media]);

  // Detect MIME type using lightweight detection with memoization
  const mimeType = useMemo(() => {
    if (!normalizedMedia || normalizedMedia.length === 0) return null;
    
    const fingerprint = getMediaFingerprint(normalizedMedia);
    
    const metadata = getCachedAttachmentMetadata(fingerprint, () => ({
      mimeType: detectMimeType(normalizedMedia),
    }));
    
    return metadata.mimeType;
  }, [normalizedMedia]);

  // Use the hook for attachment URLs with proper caching and cleanup
  const mediaUrl = useAttachmentObjectUrl(normalizedMedia, mimeType || 'application/octet-stream');

  // Determine if we have an attachment that failed to render
  const hasAttachment = !!message.media;
  const hasValidMedia = normalizedMedia && normalizedMedia.length > 0;
  const attachmentFailed = hasAttachment && (!hasValidMedia || !mediaUrl);

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
    const safeMimeType = mimeType || 'application/octet-stream';
    const extension = getExtensionFromMimeType(safeMimeType);
    const filename = `attachment_${message.messageId}.${extension}`;

    // Try to download from URL first (if available)
    if (mediaUrl) {
      downloadFromUrl(mediaUrl, filename);
    } 
    // Fallback to downloading from bytes directly
    else if (normalizedMedia && normalizedMedia.length > 0) {
      downloadFromBytes(normalizedMedia, filename, safeMimeType);
    } else {
      toast.error('Unable to download attachment');
    }
  };

  const handleReplyClick = () => {
    onReply(message.messageId);
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

              {/* Media attachment - successful render */}
              {mediaUrl && hasValidMedia && (
                <div className="mt-2 space-y-2">
                  {isImage && (
                    <>
                      <img
                        src={mediaUrl}
                        alt="Attachment"
                        className="max-h-64 rounded-lg object-contain"
                      />
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleDownload}
                        className="w-full"
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Download Image
                      </Button>
                    </>
                  )}
                  {isVideo && (
                    <>
                      <video
                        src={mediaUrl}
                        controls
                        className="max-h-64 rounded-lg"
                      />
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleDownload}
                        className="w-full"
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Download Video
                      </Button>
                    </>
                  )}
                  {!isImage && !isVideo && (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
                      <span className="text-xs">Attachment</span>
                      <Button size="sm" variant="outline" onClick={handleDownload}>
                        <Download className="mr-1 h-3 w-3" />
                        Download
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Media attachment - failed to render */}
              {attachmentFailed && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-2">
                    <FileQuestion className="h-4 w-4 shrink-0 text-destructive" />
                    <span className="text-xs text-destructive">
                      Unable to display attachment
                    </span>
                  </div>
                  {normalizedMedia && normalizedMedia.length > 0 && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleDownload}
                      className="w-full"
                    >
                      <Download className="mr-1 h-3 w-3" />
                      Download Attachment
                    </Button>
                  )}
                </div>
              )}

              {/* Failed state with error message and retry */}
              {isFailed && (
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-destructive bg-destructive/10 p-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                  <div className="flex-1 space-y-1">
                    <p className="text-xs text-destructive">
                      {message.clientErrorText || 'Failed to send message'}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRetry}
                      disabled={postMessageMutation.isPending}
                      className="h-7 text-xs"
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Retry
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Reactions and Reply button */}
        {!isPending && !isFailed && (
          <div className="flex items-center gap-2">
            <ReactionBar
              message={message}
              currentUserId={currentUserId}
              roomId={roomId}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReplyClick}
              className="h-6 px-2 text-xs"
            >
              <Reply className="mr-1 h-3 w-3" />
              Reply
            </Button>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your message.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
