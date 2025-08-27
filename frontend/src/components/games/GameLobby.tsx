'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Game, GameSummary, gamesAPI, GamePlayer } from '@/lib/api/games';
import { CharacterSelection, BASEBALL_CHARACTERS } from '@/components/games/CharacterSelection';
import { useAuth } from '@/lib/auth';
import { 
  ArrowLeft, 
  Copy, 
  Users, 
  Crown, 
  Play, 
  RefreshCw, 
  Share2, 
  DollarSign, 
  Clock,
  CheckCircle,
  AlertCircle,
  User
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface GameLobbyProps {
  game: Game;
  onBack: () => void;
  onGameStarted?: () => void;
}

export function GameLobby({ game: initialGame, onBack, onGameStarted }: GameLobbyProps) {
  const [game, setGame] = useState<Game>(initialGame);
  const [gameSummary, setGameSummary] = useState<GameSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('ace');
  const [showCharacterSelection, setShowCharacterSelection] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Poll for updates every 5 seconds
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchGameData = async () => {
      try {
        const summary = await gamesAPI.getGameSummary(game.id);
        setGameSummary(summary);
        setGame(summary.game);
      } catch (err) {
        console.error('Failed to fetch game data:', err);
      }
    };

    // Initial fetch
    fetchGameData();

    // Set up polling
    interval = setInterval(fetchGameData, 5000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [game.id]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const summary = await gamesAPI.getGameSummary(game.id);
      setGameSummary(summary);
      setGame(summary.game);
      toast({
        title: "Refreshed",
        description: "Game data updated",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPin = async () => {
    await navigator.clipboard.writeText(game.pin);
    toast({
      title: "PIN Copied!",
      description: `Game PIN ${game.pin} copied to clipboard`,
    });
  };

  const handleStartGame = async () => {
    setIsStarting(true);
    setError(null);
    try {
      await gamesAPI.updateGame(game.id, { status: 'active' });
      toast({
        title: "Game Started!",
        description: "The game is now active and ready for predictions",
      });
      // Refresh to get updated status
      const summary = await gamesAPI.getGameSummary(game.id);
      setGameSummary(summary);
      setGame(summary.game);
      
      // Transition to playing view
      if (onGameStarted) {
        setTimeout(() => onGameStarted(), 1000); // Short delay to show success message
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start game';
      setError(errorMessage);
      toast({
        title: "Failed to Start",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Join my game: ${game.title}`,
      text: `Join my baseball prediction game with PIN: ${game.pin}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled sharing
        handleCopyPin();
      }
    } else {
      handleCopyPin();
    }
  };

  // Find the current user in the game players
  const currentUserPlayer = gameSummary?.players?.find(p => p.user_id === user?.id);
  const isAdmin = currentUserPlayer?.is_admin || false;
  const canStart = isAdmin && game.status === 'pending' && (gameSummary?.player_count || 0) >= 2;
  // Derive current user's persisted character from backend if available
  const currentUserCharacterId = currentUserPlayer?.character ?? selectedCharacter;
  const currentUserCharacter = BASEBALL_CHARACTERS.find(c => c.id === currentUserCharacterId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{game.title}</h1>
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Badge variant={game.status === 'active' ? 'default' : 'secondary'}>
                {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
              </Badge>
              <span>•</span>
              <span>PIN: {game.pin}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Game Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* PIN Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Share2 className="h-5 w-5" />
                <span>Game PIN</span>
              </CardTitle>
              <CardDescription>Share this PIN with friends to join</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="text-3xl font-mono font-bold tracking-widest">
                  {game.pin}
                </span>
                <Button size="sm" onClick={handleCopyPin}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Game Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Game Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ante Amount</span>
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-semibold">{game.ante_dollars}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Management</span>
                <Badge variant="outline">
                  {game.adjudication_mode === 'admin_only' ? 'Admin Only' : 'Trust Turn Holder'}
                </Badge>
              </div>
              {game.mlb_game_id && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">MLB Game</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {game.mlb_game_id}
                  </code>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">
                  {new Date(game.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Admin Actions */}
          {isAdmin && game.status === 'pending' && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <span>Admin Controls</span>
                </CardTitle>
                <CardDescription>You are the game administrator</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  onClick={handleStartGame}
                  disabled={!canStart || isStarting}
                >
                  {isStarting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Game
                    </>
                  )}
                </Button>
                {!canStart && gameSummary && gameSummary.player_count < 2 && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Need at least 2 players to start
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Character Selection */}
          <Card className="border-secondary/20 bg-secondary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <User className="h-5 w-5 text-secondary-foreground" />
                <span>Your Character</span>
              </CardTitle>
              <CardDescription>Choose your baseball persona</CardDescription>
            </CardHeader>
            <CardContent>
              {!showCharacterSelection ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-background rounded-lg border">
                    <div className="text-2xl">{currentUserCharacter?.icon}</div>
                    <div className="flex-1">
                      <p className="font-semibold">{currentUserCharacter?.name}</p>
                      <p className="text-sm text-muted-foreground">{currentUserCharacter?.description}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => setShowCharacterSelection(true)}
                  >
                    Change Character
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <CharacterSelection
                    selectedCharacter={selectedCharacter}
                    onCharacterSelect={async (character) => {
                      try {
                        await gamesAPI.updateMyCharacter(game.id, character.id);
                        setSelectedCharacter(character.id);
                        setShowCharacterSelection(false);
                        toast({
                          title: "Character Selected!",
                          description: `You are now ${character.name}`,
                        });
                        // Refresh summary to reflect persisted character
                        const summary = await gamesAPI.getGameSummary(game.id);
                        setGameSummary(summary);
                      } catch (e) {
                        const msg = e instanceof Error ? e.message : 'Failed to save character';
                        toast({ title: 'Error', description: msg, variant: 'destructive' });
                      }
                    }}
                    title=""
                    description=""
                  />
                  <Button 
                    variant="ghost" 
                    className="w-full" 
                    onClick={() => setShowCharacterSelection(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Players List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Players</span>
                  {gameSummary && (
                    <Badge variant="secondary">
                      {gameSummary.player_count}
                    </Badge>
                  )}
                </div>
                {game.status === 'pending' && gameSummary?.is_joinable && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Accepting Players
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {game.status === 'pending' 
                  ? 'Waiting for players to join...' 
                  : 'Game participants'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gameSummary ? (
                <div className="space-y-3">
                  {gameSummary.players
                    .sort((a, b) => a.turn_order - b.turn_order)
                    .map((player: GamePlayer) => {
                      const isCurrentUser = player.user_id === user?.id;
                      const playerCharacterId = player.character ?? BASEBALL_CHARACTERS[player.turn_order % BASEBALL_CHARACTERS.length].id;
                      const playerCharacter = BASEBALL_CHARACTERS.find(c => c.id === playerCharacterId) || BASEBALL_CHARACTERS[0];
                      
                      return (
                        <div
                          key={player.id}
                          className={`flex items-center justify-between p-4 rounded-lg border ${
                            isCurrentUser 
                              ? 'border-primary bg-primary/5 shadow-md' 
                              : 'border-border bg-card'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl">
                                {playerCharacter?.icon || '👤'}
                              </div>
                              {player.is_admin && (
                                <Crown className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500" />
                              )}
                              {isCurrentUser && (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                  <User className="h-3 w-3 text-primary-foreground" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold">
                                  {isCurrentUser ? 'You' : `Player ${player.turn_order}`}
                                </span>
                                {player.is_admin && (
                                  <Badge variant="outline" className="text-xs">
                                    Admin
                                  </Badge>
                                )}
                                {isCurrentUser && (
                                  <Badge variant="default" className="text-xs">
                                    You
                                  </Badge>
                                )}
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-primary">
                                  {playerCharacter?.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {playerCharacter?.description}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <div>Turn #{player.turn_order}</div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {new Date(player.last_seen_at).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Loading players...</p>
                </div>
              )}

              {game.status === 'pending' && (
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium">
                      Share the PIN to invite more players
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Game will start when the admin is ready
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}