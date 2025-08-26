'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Game, gamesAPI } from '@/lib/api/games';
import { ArrowLeft, Loader2, DollarSign, Settings, Trophy, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Zod schema for form validation
const gameCreationSchema = z.object({
  title: z.string().optional(),
  ante_dollars: z.number().min(1, 'Ante must be at least $1').max(100, 'Ante cannot exceed $100'),
  adjudication_mode: z.enum(['admin_only', 'trust_turn_holder']),
  mlb_game_id: z.string().optional(),
});

type GameCreationFormData = z.infer<typeof gameCreationSchema>;

interface GameCreationFormProps {
  onGameCreated: (game: Game) => void;
  onBack: () => void;
}

export function GameCreationForm({ onGameCreated, onBack }: GameCreationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<GameCreationFormData>({
    resolver: zodResolver(gameCreationSchema),
    defaultValues: {
      title: '',
      ante_dollars: 1,
      adjudication_mode: 'admin_only',
      mlb_game_id: '',
    },
  });

  const onSubmit = async (data: GameCreationFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Clean up the data before sending
      const gameData = {
        title: data.title?.trim() || undefined,
        ante_dollars: data.ante_dollars,
        adjudication_mode: data.adjudication_mode,
        mlb_game_id: data.mlb_game_id?.trim() || undefined,
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

  const anteOptions = [1, 2, 5, 10];

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold">Create New Game</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Set up your baseball prediction game</p>
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Game Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Game Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Yankees vs Red Sox Showdown"
                        className="text-base h-12"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Leave empty to auto-generate based on your name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Ante Amount */}
              <FormField
                control={form.control}
                name="ante_dollars"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold flex items-center space-x-2">
                      <DollarSign className="h-4 w-4" />
                      <span>Ante Amount</span>
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {anteOptions.map((amount) => (
                            <Button
                              key={amount}
                              type="button"
                              variant={field.value === amount ? "default" : "outline"}
                              className="h-14 text-lg font-semibold"
                              onClick={() => field.onChange(amount)}
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
                            className="w-28 h-10 text-center"
                            placeholder="$"
                            inputMode="numeric"
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (value > 0) field.onChange(value);
                            }}
                          />
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Amount each player pays to enter the game
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Adjudication Mode */}
              <FormField
                control={form.control}
                name="adjudication_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold flex items-center space-x-2">
                      <Settings className="h-4 w-4" />
                      <span>Game Management</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-base h-12">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin_only" className="py-4">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">Admin Only</span>
                              <Badge variant="secondary" className="text-xs">Recommended</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground leading-snug">
                              Only you can determine winners and manage the game
                            </p>
                          </div>
                        </SelectItem>
                        <SelectItem value="trust_turn_holder" className="py-4">
                          <div className="space-y-2">
                            <div className="font-medium">Trust Turn Holder</div>
                            <p className="text-sm text-muted-foreground leading-snug">
                              Current player can self-adjudicate outcomes
                            </p>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* MLB Game ID */}
              <FormField
                control={form.control}
                name="mlb_game_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MLB Game ID (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 2024-10-15-NYY-BOS"
                        className="text-base h-12"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Link to a specific MLB game for automated data
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
          </Form>
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
