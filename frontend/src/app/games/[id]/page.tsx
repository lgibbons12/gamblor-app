'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { gamesAPI, Game, GameSummary } from '@/lib/api/games';
import { GameLobby } from '@/components/games/GameLobby';
import GamePlay from '@/components/games/GamePlay';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function GameDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [game, setGame] = useState<Game | null>(null);
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!gameId) return;
      setLoading(true);
      try {
        const s = await gamesAPI.getGameSummary(gameId);
        if (!mounted) return;
        setSummary(s);
        setGame(s.game);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load game';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [gameId]);

  const handleGameStarted = () => {
    // Refresh to show GamePlay
    gamesAPI.getGameSummary(gameId).then(s => {
      setSummary(s);
      setGame(s.game);
    });
  };

  const backToGames = () => router.push('/games');

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">Loading...</CardContent>
        </Card>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Button variant="ghost" onClick={backToGames} className="w-fit">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to games
        </Button>
        <Card>
          <CardContent className="p-6">{error ?? 'Game not found'}</CardContent>
        </Card>
      </div>
    );
  }

  if (game.status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
          <div className="mb-4">
            <Button variant="ghost" onClick={backToGames} className="w-fit">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to games
            </Button>
          </div>
          <GameLobby game={game} onBack={backToGames} onGameStarted={handleGameStarted} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
        <div className="mb-4">
          <Button variant="ghost" onClick={backToGames} className="w-fit">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to games
          </Button>
        </div>
        <GamePlay gameId={game.id} onBack={backToGames} />
      </div>
    </div>
  );
}


