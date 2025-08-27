'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, CardHeader, CardTitle, CardContent, CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Crown, 
  Zap, 
  Target, 
  DollarSign, 
  Users,
  Clock,
  Trophy,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { gamesAPI, GameState, PickCreateRequest, AdjudicationRequest } from '@/lib/api/games';
import { LoadingSpinner } from '@/components/ui/loading';

interface GamePlayProps {
  gameId: string;
  onBack: () => void;
}

// Choice code explanations
const CHOICE_CODES = {
  'K': { label: 'Strikeout', icon: '⚡', description: 'Batter strikes out' },
  'G': { label: 'Ground Out', icon: '⬇️', description: 'Ground ball out' },
  'F': { label: 'Fly Out', icon: '🎯', description: 'Fly ball out' },
  'D': { label: 'Double Play', icon: '⚡⚡', description: 'Double play (+2 outs)' },
  'T': { label: 'Triple Play', icon: '⚡⚡⚡', description: 'Triple play (+3 outs)' },
  'N': { label: 'No Out', icon: '✅', description: 'Batter reaches safely' }
};

export default function GamePlay({ gameId, onBack }: GamePlayProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Auto-refresh game state
  useEffect(() => {
    const fetchGameState = async () => {
      try {
        const state = await gamesAPI.getGameState(gameId);
        setGameState(state);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load game state');
      } finally {
        setLoading(false);
      }
    };

    fetchGameState();
    
    // Auto-refresh every 3 seconds
    const interval = setInterval(fetchGameState, 3000);
    return () => clearInterval(interval);
  }, [gameId]);

  const handleMakePick = async (choiceCode: 'K' | 'G' | 'F' | 'D' | 'T' | 'N') => {
    if (!gameState?.current_inning_id) {
      setError('No active inning found');
      return;
    }
    
    setActionLoading(true);
    try {
      await gamesAPI.createPick(gameId, {
        inning_id: gameState.current_inning_id,
        choice_code: choiceCode
      });
      
      // Refresh game state
      const newState = await gamesAPI.getGameState(gameId);
      setGameState(newState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to make pick');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdjudicate = async (resultCode: 'K' | 'G' | 'F' | 'D' | 'T' | 'N') => {
    if (!gameState?.current_inning_id) {
      setError('No active inning found');
      return;
    }
    
    setActionLoading(true);
    try {
      const result = await gamesAPI.adjudicateOutcome(gameId, {
        inning_id: gameState.current_inning_id,
        result_code: resultCode
      });
      
      // Show result briefly then refresh
      setTimeout(async () => {
        const newState = await gamesAPI.getGameState(gameId);
        setGameState(newState);
      }, 1000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjudicate');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
        <span className="ml-2">Loading game...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!gameState) return null;

  const isYourTurn = gameState.current_player && gameState.current_player.user_name === 'You';
  const canAdjudicate = gameState.current_player && (
    gameState.current_player.is_admin || 
    isYourTurn // Trust turn holder mode
  );

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Badge variant={gameState.game_status === 'active' ? 'default' : 'secondary'}>
          {gameState.game_status}
        </Badge>
      </div>

      {/* Game Status Card */}
      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>
                {gameState.inning_number ? `Inning ${gameState.inning_number}` : 'Waiting'} 
                {gameState.half && ` - ${gameState.half.charAt(0).toUpperCase() + gameState.half.slice(1)}`}
              </span>
            </CardTitle>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{gameState.outs}/3 Outs</span>
              </div>
              <div className="flex items-center space-x-1">
                <DollarSign className="h-4 w-4" />
                <span className="font-semibold text-foreground">${gameState.pot_dollars}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Current Player */}
          {gameState.current_player && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Crown className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-semibold">{gameState.current_player.user_name}</p>
                  <p className="text-sm text-muted-foreground">Current Turn</p>
                </div>
              </div>
              {isYourTurn && (
                <Badge variant="default">Your Turn!</Badge>
              )}
            </div>
          )}

          {/* Your Pick */}
          {gameState.your_pick && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-green-600" />
                <span className="font-semibold">Your Pick: {CHOICE_CODES[gameState.your_pick as keyof typeof CHOICE_CODES]?.label}</span>
              </div>
            </div>
          )}

          {gameState.between_ab_locked && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Between at-bats - picks are locked until next batter
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Pick Selection */}
      {isYourTurn && !gameState.your_pick && gameState.game_status === 'active' && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Make Your Pick</span>
            </CardTitle>
            <CardDescription>
              Predict the outcome of the current at-bat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(CHOICE_CODES).map(([code, info]) => (
                <Button
                  key={code}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 text-center"
                  onClick={() => handleMakePick(code as any)}
                  disabled={actionLoading}
                >
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <p className="font-semibold text-sm">{info.label}</p>
                    <p className="text-xs text-muted-foreground">{info.description}</p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Adjudication */}
      {canAdjudicate && gameState.game_status === 'active' && (
        <Card className="shadow-lg border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-600">
              <Crown className="h-5 w-5" />
              <span>Adjudicate Outcome</span>
            </CardTitle>
            <CardDescription>
              Determine the actual result of the at-bat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(CHOICE_CODES).map(([code, info]) => (
                <Button
                  key={code}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 text-center border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-900/20"
                  onClick={() => handleAdjudicate(code as any)}
                  disabled={actionLoading}
                >
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <p className="font-semibold text-sm">{info.label}</p>
                    <p className="text-xs text-muted-foreground">{info.description}</p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Players */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Players</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {gameState.players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  player.is_current_player 
                    ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20' 
                    : 'border-border'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-semibold">
                    {player.turn_order}
                  </div>
                  <div>
                    <p className="font-semibold">{player.user_name}</p>
                    {player.is_admin && (
                      <Badge variant="secondary" className="text-xs">Admin</Badge>
                    )}
                  </div>
                </div>
                {player.is_current_player && (
                  <Crown className="h-4 w-4 text-yellow-500" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      {gameState.leaderboard.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5" />
              <span>Leaderboard</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {gameState.leaderboard.map((entry, index) => (
                <div
                  key={entry.player_id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      index === 1 ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' :
                      index === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{entry.user_name}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{entry.wins}W</span>
                        <span>{entry.misses}M</span>
                        <span>{entry.picks_total} picks</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      entry.net_dollars >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${entry.net_dollars}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
