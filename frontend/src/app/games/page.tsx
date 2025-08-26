'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { GameCreationForm } from '@/components/games/GameCreationForm';
import { GameJoining } from '@/components/games/GameJoining';
import { GameLobby } from '@/components/games/GameLobby';
import { Game } from '@/lib/api/games';
import { Dice6, Users, Plus, LogIn } from 'lucide-react';

type GameFlow = 'menu' | 'create' | 'join' | 'lobby';

export default function GamesPage() {
  const [currentFlow, setCurrentFlow] = useState<GameFlow>('menu');
  const [currentGame, setCurrentGame] = useState<Game | null>(null);

  const handleGameCreated = (game: Game) => {
    setCurrentGame(game);
    setCurrentFlow('lobby');
  };

  const handleGameJoined = (game: Game) => {
    setCurrentGame(game);
    setCurrentFlow('lobby');
  };

  const handleBackToMenu = () => {
    setCurrentFlow('menu');
    setCurrentGame(null);
  };

  const renderFlow = () => {
    switch (currentFlow) {
      case 'create':
        return (
          <GameCreationForm
            onGameCreated={handleGameCreated}
            onBack={handleBackToMenu}
          />
        );
      case 'join':
        return (
          <GameJoining
            onGameJoined={handleGameJoined}
            onBack={handleBackToMenu}
          />
        );
      case 'lobby':
        return currentGame ? (
          <GameLobby
            game={currentGame}
            onBack={handleBackToMenu}
          />
        ) : null;
      default:
        return (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <Dice6 className="h-8 w-8 text-primary" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Gamblor
                </h1>
              </div>
              <p className="text-xl text-muted-foreground">
                Create or join a baseball prediction game
              </p>
            </div>

            {/* Main Actions */}
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* Create Game Card */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
                    <Plus className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Create Game</CardTitle>
                  <CardDescription className="text-base">
                    Start a new prediction game with your friends
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button 
                    className="w-full h-12 text-base font-medium"
                    onClick={() => setCurrentFlow('create')}
                  >
                    Create New Game
                  </Button>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="h-4 w-4 mr-2" />
                      You'll be the game admin
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Dice6 className="h-4 w-4 mr-2" />
                      Set rules and manage the game
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Join Game Card */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-3 bg-secondary/10 rounded-full w-fit group-hover:bg-secondary/20 transition-colors">
                    <LogIn className="h-8 w-8 text-secondary-foreground" />
                  </div>
                  <CardTitle className="text-2xl">Join Game</CardTitle>
                  <CardDescription className="text-base">
                    Enter a game PIN to join an existing game
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button 
                    variant="secondary" 
                    className="w-full h-12 text-base font-medium"
                    onClick={() => setCurrentFlow('join')}
                  >
                    Join with PIN
                  </Button>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Badge variant="outline" className="mr-2 px-2">
                        123456
                      </Badge>
                      Enter 6-digit game PIN
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="h-4 w-4 mr-2" />
                      Play with existing group
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator className="max-w-2xl mx-auto" />

            {/* How it Works */}
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-semibold text-center mb-6">How it Works</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center space-y-3">
                  <div className="mx-auto p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full w-fit">
                    <Plus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold">1. Create or Join</h3>
                  <p className="text-sm text-muted-foreground">
                    Start a new game or join with a PIN from a friend
                  </p>
                </div>
                <div className="text-center space-y-3">
                  <div className="mx-auto p-3 bg-green-100 dark:bg-green-900/20 rounded-full w-fit">
                    <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold">2. Wait for Players</h3>
                  <p className="text-sm text-muted-foreground">
                    Gather your group in the lobby before starting
                  </p>
                </div>
                <div className="text-center space-y-3">
                  <div className="mx-auto p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full w-fit">
                    <Dice6 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold">3. Make Predictions</h3>
                  <p className="text-sm text-muted-foreground">
                    Predict baseball outcomes and compete for the pot
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
        <div className="min-h-[calc(100vh-8rem)] flex flex-col">
          {renderFlow()}
        </div>
      </div>
    </div>
  );
}
