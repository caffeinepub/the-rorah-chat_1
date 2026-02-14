import { useState, useRef } from 'react';
import { usePostMessage } from '../../../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Send, Paperclip, X, Loader2, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { PublicMessage, RoomId, UserId } from '../../../backend';
import { getDisplayName } from '../utils/displayName';

interface MessageComposerProps {
  roomId: RoomId;
  userId: UserId;
  nickname: string;
  replyToMessage?: PublicMessage;
  onCancelReply: () => void;
  onActivity?: () => void;
  onReload: () => void;
  isReloading: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function MessageComposer(props: MessageComposerProps) {
  const { roomId, userId, replyToMessage, onCancelReply, onActivity, onReload, isReloading } = props;
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const postMessageMutation = usePostMessage();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    onActivity?.();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length === 0) {
      // No files in clipboard, allow normal text paste
      return;
    }

    // Prevent default paste behavior when files are present
    e.preventDefault();

    if (files.length > 1) {
      toast.info('Only one file can be attached at a time. Attaching the first file.');
    }

    const file = files[0];

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    toast.success(`File "${file.name}" attached from clipboard`);
    onActivity?.();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() && !selectedFile) {
      toast.error('Please enter a message or select a file');
      return;
    }

    try {
      let mediaBytes: Uint8Array | null = null;

      if (selectedFile) {
        setUploadProgress(10);
        const arrayBuffer = await selectedFile.arrayBuffer();
        mediaBytes = new Uint8Array(arrayBuffer);
        setUploadProgress(50);
      }

      // Generate a unique client ID for optimistic updates
      const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      await postMessageMutation.mutateAsync({
        userId,
        roomId,
        content: content.trim(),
        media: mediaBytes,
        replyTo: replyToMessage ? replyToMessage.messageId : null,
        clientId,
      });

      setUploadProgress(100);
      setContent('');
      setSelectedFile(null);
      onCancelReply();
      setUploadProgress(0);
      onActivity?.();

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      // Error is handled by the mutation's onError
      // No need for generic toast here - per-message error will show
      console.error('Send error:', error);
      setUploadProgress(0);
    }
  };

  const handleTyping = () => {
    onActivity?.();
  };

  const isUploading = postMessageMutation.isPending && uploadProgress > 0;

  const getFileIcon = () => {
    if (!selectedFile) return null;
    const type = selectedFile.type;
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎬';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    return '📎';
  };

  return (
    <form onSubmit={handleSend} className="space-y-3">
      {replyToMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground">
              Replying to {getDisplayName(replyToMessage)}
            </p>
            <p className="text-sm">{replyToMessage.content.substring(0, 50)}...</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onCancelReply}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {selectedFile && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
          <span className="text-xl">{getFileIcon()}</span>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => {
              setSelectedFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isUploading && uploadProgress > 0 && uploadProgress < 100 && (
        <div className="space-y-1">
          <Progress value={uploadProgress} className="h-1" />
          <p className="text-xs text-muted-foreground text-center">Uploading... {uploadProgress}%</p>
        </div>
      )}

      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            handleTyping();
          }}
          onPaste={handlePaste}
          onFocus={handleTyping}
          placeholder="Type a message..."
          className="min-h-[80px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
        />
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onReload}
            disabled={isReloading}
            title="Reload messages"
            aria-label="Reload messages"
          >
            {isReloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={postMessageMutation.isPending}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            type="submit"
            size="icon"
            disabled={postMessageMutation.isPending || (!content.trim() && !selectedFile)}
          >
            {postMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,video/*,audio/*,.pdf"
      />
    </form>
  );
}
