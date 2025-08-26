'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Game, gamesAPI, GameCreateRequest } from '@/lib/api/games';
import { ArrowLeft, Loader2, DollarSign, Settings, Trophy, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface GameCreationProps {
  onGameCreated: (game: Game) => void;
  onBack: () => void;
}

export function GameCreation({ onGameCreated, onBack }: GameCreationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<GameCreateRequest>({
    title: '',
    ante_dollars: 1,
    adjudication_mode: 'admin_only',
    mlb_game_id: '',
  });
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Clean up the data before sending
      const gameData: GameCreateRequest = {
        title: formData.title.trim() || undefined,
        ante_dollars: formData.ante_dollars,
        adjudication_mode: formData.adjudication_mode,
        mlb_game_id: formData.mlb_game_id?.trim() || undefined,
      };

      const game = await gamesAPI.createGame(gameData);
      
      toast({
        title: "Game Created!",
        description: `Your game "${game.title}" has been created with PIN: ${game.pin}`,
      });
      
      onGameCreated(game);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create game';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof GameCreateRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create New Game</h1>
          <p className="text-muted-foreground">Set up your baseball prediction game</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Game Settings</span>
          </CardTitle>
          <CardDescription>
            Configure your game settings. You'll be the admin and can change these later.
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

            {/* Game Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Game Title</Label>
              <Input
                id="title"
                placeholder="e.g., Yankees vs Red Sox Showdown"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="text-base"
              />
              <p className="text-sm text-muted-foreground">
                Leave empty to auto-generate based on your name
              </p>
            </div>

            <Separator />

            {/* Ante Amount */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center space-x-2">
                <DollarSign className="h-4 w-4" />
                <span>Ante Amount</span>
              </Label>
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 5, 10].map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant={formData.ante_dollars === amount ? "default" : "outline"}
                    className="h-12"
                    onClick={() => handleInputChange('ante_dollars', amount)}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="custom-ante" className="text-sm">Custom:</Label>
                <Input
                  id="custom-ante"
                  type="number"
                  min="1"
                  max="100"
                  className="w-24"
                  placeholder="$"
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value > 0) handleInputChange('ante_dollars', value);
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Amount each player pays to enter the game
              </p>
            </div>

            <Separator />

            {/* Adjudication Mode */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Game Management</span>
              </Label>
              <Select
                value={formData.adjudication_mode}
                onValueChange={(value: 'admin_only' | 'trust_turn_holder') => 
                  handleInputChange('adjudication_mode', value)
                }
              >
                <SelectTrigger className="text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin_only">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span>Admin Only</span>
                        <Badge variant="secondary">Recommended</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Only you can determine winners and manage the game
                      </p>
                    </div>
                  </SelectItem>
                  <SelectItem value="trust_turn_holder">
                    <div className="space-y-1">
                      <div>Trust Turn Holder</div>
                      <p className="text-sm text-muted-foreground">
                        Current player can self-adjudicate outcomes
                      </p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* MLB Game ID (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="mlb-game">MLB Game ID (Optional)</Label>
              <Input
                id="mlb-game"
                placeholder="e.g., 2024-10-15-NYY-BOS"
                value={formData.mlb_game_id}
                onChange={(e) => handleInputChange('mlb_game_id', e.target.value)}
                className="text-base"
              />
              <p className="text-sm text-muted-foreground">
                Link to a specific MLB game for automated data
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-medium" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Game...
                  </>
                ) : (
                  'Create Game'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              What happens next?
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span>You'll get a 6-digit PIN to share with players</span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span>Players join your lobby using the PIN</span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span>You start the game when everyone's ready</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
