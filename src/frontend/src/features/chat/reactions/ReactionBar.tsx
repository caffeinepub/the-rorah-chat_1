import { useState } from 'react';
import { useReactToMessage } from '../../../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import type { Message, RoomId, UserId } from '../../../backend';

interface ReactionBarProps {
  message: Message;
  currentUserId: UserId;
  roomId: RoomId;
  align?: 'start' | 'end';
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];

export function ReactionBar({ message, currentUserId, roomId, align = 'start' }: ReactionBarProps) {
  const [open, setOpen] = useState(false);
  const reactMutation = useReactToMessage();

  const reactionCounts = message.reactions.reduce((acc, reaction) => {
    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleReact = async (emoji: string) => {
    try {
      await reactMutation.mutateAsync({
        userId: currentUserId,
        roomId,
        messageId: message.messageId,
        emoji,
      });
      setOpen(false);
    } catch (error) {
      console.error('Failed to react:', error);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {Object.entries(reactionCounts).map(([emoji, count]) => (
        <Button
          key={emoji}
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => handleReact(emoji)}
        >
          {emoji} {count}
        </Button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Smile className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align={align}>
          <div className="flex gap-1">
            {EMOJI_OPTIONS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-lg"
                onClick={() => handleReact(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
