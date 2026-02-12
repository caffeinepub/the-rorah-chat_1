import { useState } from 'react';
import { useLocalProfile } from '../../hooks/useLocalProfile';
import { useCreateRoom, useValidateRoomMutation } from '../../hooks/useQueries';
import { useActor } from '../../hooks/useActor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, Plus, LogIn, Edit2, AlertCircle } from 'lucide-react';
import { EditNicknameInline } from './EditNicknameInline';

interface LobbyPageProps {
  onJoinRoom: (roomId: string) => void;
}

export function LobbyPage({ onJoinRoom }: LobbyPageProps) {
  const { nickname, setNickname } = useLocalProfile();
  const { actor } = useActor();
  const [tempNickname, setTempNickname] = useState(nickname);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [createRoomCode, setCreateRoomCode] = useState('');
  const [createRoomError, setCreateRoomError] = useState<string | null>(null);
  const [joinRoomError, setJoinRoomError] = useState<string | null>(null);
  const [isEditingNickname, setIsEditingNickname] = useState(false);

  const createRoomMutation = useCreateRoom();
  const validateRoomMutation = useValidateRoomMutation();

  const handleSetNickname = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempNickname.trim()) {
      setNickname(tempNickname.trim());
      toast.success(`Welcome, ${tempNickname.trim()}!`);
    }
  };

  const handleSaveNickname = (newNickname: string) => {
    setNickname(newNickname);
    setIsEditingNickname(false);
    // Reset temp nickname for the onboarding flow if nickname is cleared
    if (!newNickname) {
      setTempNickname('');
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateRoomError(null);

    if (!actor) {
      toast.error('Connecting to backend… Please wait.');
      return;
    }

    const userEnteredCode = createRoomCode.trim();

    // If user entered a code, validate it
    if (userEnteredCode) {
      try {
        // Check if room already exists
        const roomExists = await validateRoomMutation.mutateAsync(userEnteredCode);

        if (roomExists) {
          setCreateRoomError('That room code is already in use');
          return;
        }

        // Room doesn't exist, we can create it
        await createRoomMutation.mutateAsync({ roomId: userEnteredCode, name: userEnteredCode });
        toast.success('Room created successfully!');
        setCreateRoomCode('');
        onJoinRoom(userEnteredCode);
      } catch (error) {
        // Handle backend error (e.g., race condition where room was created between validation and creation)
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('already exists')) {
          setCreateRoomError('That room code is already in use');
        } else {
          setCreateRoomError('Failed to create room. Please try again.');
        }
        console.error(error);
      }
    } else {
      // Auto-generate room code
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      try {
        await createRoomMutation.mutateAsync({ roomId, name: roomId });
        toast.success('Room created successfully!');
        onJoinRoom(roomId);
      } catch (error) {
        setCreateRoomError('Failed to create room. Please try again.');
        console.error(error);
      }
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinRoomError(null);

    if (!joinRoomId.trim()) {
      toast.error('Please enter a room code');
      return;
    }

    if (!actor) {
      toast.error('Connecting to backend… Please wait.');
      return;
    }

    const roomIdToJoin = joinRoomId.trim();

    try {
      const roomExists = await validateRoomMutation.mutateAsync(roomIdToJoin);

      if (roomExists) {
        onJoinRoom(roomIdToJoin);
        setJoinRoomId('');
      } else {
        toast.error('Room not found. Please check the room code and try again.');
      }
    } catch (error) {
      // Show validation error (not "Room not found")
      setJoinRoomError('Failed to validate room due to a server or network error.');
      console.error(error);
    }
  };

  const handleRetryJoin = async () => {
    setJoinRoomError(null);
    if (!joinRoomId.trim()) {
      toast.error('Please enter a room code');
      return;
    }

    if (!actor) {
      toast.error('Connecting to backend… Please wait.');
      return;
    }

    const roomIdToJoin = joinRoomId.trim();

    try {
      const roomExists = await validateRoomMutation.mutateAsync(roomIdToJoin);

      if (roomExists) {
        onJoinRoom(roomIdToJoin);
        setJoinRoomId('');
      } else {
        toast.error('Room not found. Please check the room code and try again.');
      }
    } catch (error) {
      setJoinRoomError('Failed to validate room due to a server or network error.');
      console.error(error);
    }
  };

  const isCreating = createRoomMutation.isPending || validateRoomMutation.isPending;
  const isJoining = validateRoomMutation.isPending;

  if (!nickname) {
    return (
      <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome to The Rorah Chat</CardTitle>
            <CardDescription>Choose a nickname to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetNickname} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nickname">Nickname</Label>
                <Input
                  id="nickname"
                  placeholder="Enter your nickname"
                  value={tempNickname}
                  onChange={(e) => setTempNickname(e.target.value)}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show connecting state only while actor is null
  if (!actor) {
    return (
      <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Connecting to backend...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <h2 className="text-3xl font-bold">Hello, {nickname}!</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditingNickname(true)}
            disabled={isEditingNickname}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
        {isEditingNickname && (
          <div className="mx-auto mb-4 max-w-md">
            <EditNicknameInline
              currentNickname={nickname}
              onSave={handleSaveNickname}
              onCancel={() => setIsEditingNickname(false)}
            />
          </div>
        )}
        <p className="text-muted-foreground">Create a new room or join an existing one</p>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create Room</TabsTrigger>
          <TabsTrigger value="join">Join Room</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Create a New Room</CardTitle>
              <CardDescription>Start a new chat room with a custom or auto-generated code</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="createRoomCode">Room code</Label>
                  <Input
                    id="createRoomCode"
                    placeholder="Leave blank to generate a code"
                    value={createRoomCode}
                    onChange={(e) => {
                      setCreateRoomCode(e.target.value);
                      setCreateRoomError(null);
                    }}
                    disabled={isCreating}
                  />
                  <p className="text-sm text-muted-foreground">
                    Leave blank to generate a code automatically, or enter your own custom room code.
                  </p>
                  {createRoomError && (
                    <p className="text-sm text-destructive">{createRoomError}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {validateRoomMutation.isPending ? 'Validating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Room
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="join" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Join a Room</CardTitle>
              <CardDescription>Enter a room code to join an existing chat</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roomId">Room Code</Label>
                  <Input
                    id="roomId"
                    placeholder="e.g., room_1234567890_abc"
                    value={joinRoomId}
                    onChange={(e) => {
                      setJoinRoomId(e.target.value);
                      setJoinRoomError(null);
                    }}
                    disabled={isJoining}
                  />
                </div>
                {joinRoomError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Validation Error</AlertTitle>
                    <AlertDescription>{joinRoomError}</AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={isJoining}>
                    {isJoining ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Join Room
                      </>
                    )}
                  </Button>
                  {joinRoomError && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRetryJoin}
                      disabled={isJoining}
                    >
                      Retry
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
