import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { LobbyPage } from './features/lobby/LobbyPage';
import { RoomPage } from './features/chat/RoomPage';
import { useLocalProfile } from './hooks/useLocalProfile';
import { useState, useEffect } from 'react';
import { ThemeToggle } from './components/ThemeToggle';
import { MessageSquare } from 'lucide-react';

function App() {
  const { nickname } = useLocalProfile();
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  // Check URL hash for room ID on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && nickname) {
      setCurrentRoomId(hash);
    }
  }, [nickname]);

  // Update URL hash when room changes
  useEffect(() => {
    if (currentRoomId) {
      window.location.hash = currentRoomId;
    } else {
      window.location.hash = '';
    }
  }, [currentRoomId]);

  const handleJoinRoom = (roomId: string) => {
    setCurrentRoomId(roomId);
  };

  const handleLeaveRoom = () => {
    setCurrentRoomId(null);
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold tracking-tight">The Rorah Chat</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1">
          {!nickname || !currentRoomId ? (
            <LobbyPage onJoinRoom={handleJoinRoom} />
          ) : (
            <RoomPage roomId={currentRoomId} onLeaveRoom={handleLeaveRoom} />
          )}
        </main>

        {(!nickname || !currentRoomId) && (
          <footer className="border-t border-border bg-muted/30 py-4">
            <div className="container px-4 text-center text-sm text-muted-foreground">
              <p>
                © {new Date().getFullYear()} Built with ❤️ using{' '}
                <a
                  href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                    window.location.hostname || 'the-rorah-chat'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  caffeine.ai
                </a>
              </p>
            </div>
          </footer>
        )}
      </div>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
