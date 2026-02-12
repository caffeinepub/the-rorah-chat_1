import { useState, useRef } from 'react';
import { usePostMessage } from '../../../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Send, Paperclip, X, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { Message, RoomId, UserId } from '../../../backend';

interface MessageComposerProps {
  roomId: RoomId;
  userId: UserId;
  nickname: string;
  replyToMessage?: Message;
  onCancelReply: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function MessageComposer(props: MessageComposerProps) {
  const { roomId, userId, replyToMessage, onCancelReply } = props;
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

      await postMessageMutation.mutateAsync({
        userId,
        roomId,
        content: content.trim(),
        media: mediaBytes,
        replyTo: replyToMessage ? replyToMessage.messageId : null,
      });

      setUploadProgress(100);
      setContent('');
      setSelectedFile(null);
      onCancelReply();
      setUploadProgress(0);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast.error('Failed to send message');
      console.error(error);
      setUploadProgress(0);
    }
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
              Replying to {replyToMessage.userId}
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

      {isUploading && (
        <div className="space-y-1">
          <Progress value={uploadProgress} className="h-1" />
          <p className="text-xs text-muted-foreground">Uploading... {uploadProgress}%</p>
        </div>
      )}

      <div className="flex gap-2">
        <Textarea
          placeholder="Type a message or paste a file..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          className="min-h-[60px] resize-none"
          disabled={postMessageMutation.isPending}
        />
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="*/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={postMessageMutation.isPending}
            title="Attach file"
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
    </form>
  );
}
