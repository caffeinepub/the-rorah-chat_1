import { useState, useEffect } from 'react';
import { useEditMessage, useDeleteMessage } from '../../../hooks/useQueries';
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
import { MoreVertical, Edit, Trash, Reply, Check, X, Download } from 'lucide-react';
import { toast } from 'sonner';
import type { Message, RoomId, UserId } from '../../../backend';
import { cn } from '@/lib/utils';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  currentUserId: UserId;
  roomId: RoomId;
  onReply: () => void;
  messages: Message[];
}

export function MessageItem({
  message,
  isOwn,
  currentUserId,
  roomId,
  onReply,
  messages,
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  const editMutation = useEditMessage();
  const deleteMutation = useDeleteMessage();

  const replyToMessage = message.replyTo
    ? messages.find((m) => m.messageId === message.replyTo)
    : null;

  // Detect MIME type from media bytes (simple heuristic)
  const detectMimeType = (bytes: Uint8Array): string => {
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

  // Convert media bytes to blob URL for display
  useEffect(() => {
    if (message.media && message.media.length > 0) {
      const mediaArray = new Uint8Array(message.media);
      const mimeType = detectMimeType(mediaArray);
      const blob = new Blob([mediaArray], { type: mimeType });
      const url = URL.createObjectURL(blob);
      setMediaUrl(url);

      // Cleanup blob URL on unmount
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [message.media]);

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
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error('Failed to delete message');
      console.error(error);
    }
  };

  const handleDownload = () => {
    if (!mediaUrl) return;
    
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = `attachment-${message.messageId}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isImage = mediaUrl && message.media && detectMimeType(new Uint8Array(message.media)).startsWith('image/');
  const isVideo = mediaUrl && message.media && detectMimeType(new Uint8Array(message.media)).startsWith('video/');

  return (
    <div className={cn('flex gap-3', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn('flex max-w-[70%] flex-col gap-1', isOwn ? 'items-end' : 'items-start')}>
        {/* User ID */}
        <span className="text-xs text-muted-foreground">{message.userId}</span>

        {/* Reply context */}
        {replyToMessage && (
          <div className={cn(
            'rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs',
            isOwn ? 'rounded-tr-none' : 'rounded-tl-none'
          )}>
            <p className="font-medium text-muted-foreground">
              Replying to {replyToMessage.userId}
            </p>
            <p className="text-muted-foreground/80">
              {replyToMessage.content.substring(0, 50)}...
            </p>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-lg px-4 py-2',
            isOwn
              ? 'bg-chat-sent text-chat-sent-foreground rounded-tr-none'
              : 'bg-chat-received text-chat-received-foreground rounded-tl-none'
          )}
        >
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px] resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleEdit}
                  disabled={editMutation.isPending}
                >
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
              {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
              
              {/* Media preview */}
              {mediaUrl && isImage && (
                <img
                  src={mediaUrl}
                  alt="Attachment"
                  className="mt-2 max-h-64 rounded-lg object-contain"
                />
              )}
              
              {mediaUrl && isVideo && (
                <video
                  src={mediaUrl}
                  controls
                  className="mt-2 max-h-64 rounded-lg"
                />
              )}
              
              {/* Non-image/video attachment */}
              {mediaUrl && !isImage && !isVideo && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background/50 p-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Attachment</p>
                    <p className="text-xs text-muted-foreground">
                      {message.media ? `${(message.media.length / 1024).toFixed(1)} KB` : ''}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownload}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Download
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Reactions */}
        <ReactionBar
          message={message}
          currentUserId={currentUserId}
          roomId={roomId}
        />

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground">
          {new Date(Number(message.timestamp) / 1000000).toLocaleTimeString()}
        </span>
      </div>

      {/* Actions menu (only for own messages) */}
      {isOwn && !isEditing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Reply button (for other users' messages) */}
      {!isOwn && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onReply}>
          <Reply className="h-4 w-4" />
        </Button>
      )}

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
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
