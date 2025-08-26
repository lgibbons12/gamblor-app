'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Game, gamesAPI } from '@/lib/api/games';
import { ArrowLeft, Loader2, Hash, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface GameJoiningProps {
  onGameJoined: (game: Game) => void;
  onBack: () => void;
}

export function GameJoining({ onGameJoined, onBack }: GameJoiningProps) {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handlePinChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setPin(numericValue);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin.length !== 6) {
      setError('PIN must be exactly 6 digits');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, join the game
      const gamePlayer = await gamesAPI.joinGameByPin(pin);
      
      // Then get the game details
      const gameSummary = await gamesAPI.getGameSummary(gamePlayer.game_id);
      
      toast({
        title: "Joined Game!",
        description: `Successfully joined "${gameSummary.game.title}"`,
      });
      
      onGameJoined(gameSummary.game);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join game';
      setError(errorMessage);
      toast({
        title: "Failed to Join",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold">Join Game</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Enter the 6-digit PIN to join</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2">
            <Hash className="h-5 w-5" />
            <span>Game PIN</span>
          </CardTitle>
          <CardDescription>
            Ask the game creator for the PIN code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* PIN Input */}
            <div className="space-y-2">
              <Label htmlFor="pin" className="sr-only">Game PIN</Label>
              <div className="relative">
                <Input
                  id="pin"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  className="text-center text-xl sm:text-2xl font-mono tracking-widest h-14 sm:h-16 text-foreground"
                  maxLength={6}
                  autoComplete="off"
                  pattern="[0-9]*"
                />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="flex space-x-2">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 border-b-2 transition-colors ${
                          i < pin.length
                            ? 'border-primary'
                            : 'border-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-center text-muted-foreground">
                {pin.length}/6 digits entered
              </p>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-medium" 
              disabled={isLoading || pin.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining Game...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Join Game
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Quick PIN Entry */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground text-center">
              Quick Entry
            </h3>
            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => (
                <Button
                  key={digit}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-14 text-xl font-mono touch-manipulation"
                  onClick={() => {
                    if (pin.length < 6) {
                      handlePinChange(pin + digit.toString());
                    }
                  }}
                  disabled={pin.length >= 6}
                >
                  {digit}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-14 touch-manipulation"
                onClick={() => handlePinChange(pin.slice(0, -1))}
                disabled={pin.length === 0}
              >
                ←
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Need Help?
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Get the PIN from whoever created the game</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Game must be in "pending" status to join</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>You can only join each game once</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
