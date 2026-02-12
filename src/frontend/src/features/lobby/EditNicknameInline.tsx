import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Check, X, Trash2 } from 'lucide-react';

interface EditNicknameInlineProps {
  currentNickname: string;
  onSave: (newNickname: string) => void;
  onCancel: () => void;
}

export function EditNicknameInline({ currentNickname, onSave, onCancel }: EditNicknameInlineProps) {
  const [value, setValue] = useState(currentNickname);

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error('Nickname cannot be empty');
      return;
    }
    onSave(trimmed);
    toast.success('Nickname updated!');
  };

  const handleClear = () => {
    onSave('');
    toast.success('Nickname cleared');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="space-y-2">
        <Label htmlFor="edit-nickname">Edit Nickname</Label>
        <Input
          id="edit-nickname"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your nickname"
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSave} size="sm" className="flex-1">
          <Check className="mr-2 h-4 w-4" />
          Save
        </Button>
        <Button onClick={onCancel} variant="outline" size="sm" className="flex-1">
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleClear} variant="destructive" size="sm">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
