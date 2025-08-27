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
import { Popup } from '@/components/ui/popup';
import { GameSettings } from '@/components/games/GameSettings';
import { Game, gamesAPI } from '@/lib/api/games';
import { ArrowLeft, Loader2, DollarSign, Settings, Trophy, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Zod schema for form validation
const gameCreationSchema = z.object({
  title: z.string().optional(),
  ante_dollars: z.number().min(1, 'Ante must be at least $1').max(1000, 'Ante cannot exceed $1000'),
  adjudication_mode: z.enum(['admin_only', 'trust_turn_holder']),
  mlb_game_id: z.string().optional(),
  deadline_seconds: z.number().optional(),
});

type GameCreationFormData = z.infer<typeof gameCreationSchema>;

interface GameCreationFormProps {
  onGameCreated: (game: Game) => void;
  onBack: () => void;
}

export function GameCreationForm({ onGameCreated, onBack }: GameCreationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  const form = useForm<GameCreationFormData>({
    resolver: zodResolver(gameCreationSchema),
    defaultValues: {
      title: '',
      ante_dollars: 1,
      adjudication_mode: 'trust_turn_holder', // Changed default to turn-based
      mlb_game_id: '',
      deadline_seconds: undefined,
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
        deadline_seconds: data.deadline_seconds,
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

  // Get current form values for settings popup
  const watchedValues = form.watch();

  const handleSettingsChange = (settings: {
    ante_dollars: number;
    adjudication_mode: 'admin_only' | 'trust_turn_holder';
    deadline_seconds?: number;
    mlb_game_id?: string;
  }) => {
    form.setValue('ante_dollars', settings.ante_dollars);
    form.setValue('adjudication_mode', settings.adjudication_mode);
    form.setValue('deadline_seconds', settings.deadline_seconds);
    form.setValue('mlb_game_id', settings.mlb_game_id);
  };

  const handleSettingsSave = () => {
    setShowSettings(false);
    toast({
      title: "Settings Updated",
      description: "Your game settings have been saved",
    });
  };

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
            <span>Create Game</span>
          </CardTitle>
          <CardDescription>
            Start a new baseball prediction game with turn-based adjudication.
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
                    <FormLabel>Game Title (Optional)</FormLabel>
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

              {/* Current Settings Summary */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Game Settings</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                    className="h-8"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Settings
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Ante Amount</div>
                    <div className="font-semibold">${watchedValues.ante_dollars}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Adjudication</div>
                    <div className="font-semibold">
                      {watchedValues.adjudication_mode === 'trust_turn_holder' 
                        ? 'Turn-Based' 
                        : 'Admin Only'}
                    </div>
                  </div>
                  {watchedValues.deadline_seconds && (
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Pick Deadline</div>
                      <div className="font-semibold">{watchedValues.deadline_seconds}s</div>
                    </div>
                  )}
                  {watchedValues.mlb_game_id && (
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">MLB Game</div>
                      <div className="font-semibold text-xs">{watchedValues.mlb_game_id}</div>
                    </div>
                  )}
                </div>
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
          </Form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Default Settings
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span>$1 ante per round (customizable)</span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span>Turn-based adjudication (current player decides)</span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span>Click "Edit Settings" to customize further</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Popup */}
      <Popup
        open={showSettings}
        onOpenChange={setShowSettings}
        title="Game Settings"
        description="Configure your game preferences"
        className="max-w-2xl max-h-[80vh] overflow-y-auto"
      >
        <GameSettings
          settings={{
            ante_dollars: watchedValues.ante_dollars,
            adjudication_mode: watchedValues.adjudication_mode,
            deadline_seconds: watchedValues.deadline_seconds,
            mlb_game_id: watchedValues.mlb_game_id,
          }}
          onSettingsChange={handleSettingsChange}
          onSave={handleSettingsSave}
          onCancel={() => setShowSettings(false)}
        />
      </Popup>
    </div>
  );
}
