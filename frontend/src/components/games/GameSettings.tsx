'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Separator } from '@/components/ui/separator';
import { Settings, DollarSign, Gavel, Clock } from 'lucide-react';

interface GameSettingsProps {
  settings: {
    ante_dollars: number;
    adjudication_mode: 'admin_only' | 'trust_turn_holder';
    deadline_seconds?: number;
    mlb_game_id?: string;
  };
  onSettingsChange: (settings: GameSettingsProps['settings']) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function GameSettings({ settings, onSettingsChange, onSave, onCancel }: GameSettingsProps) {
  const anteOptions = [1, 2, 5, 10, 25, 50];

  const updateSetting = <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* Ante Settings */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Ante Amount</span>
          </CardTitle>
          <CardDescription>
            Amount each player pays to enter each round
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {anteOptions.map((amount) => (
              <Button
                key={amount}
                type="button"
                variant={settings.ante_dollars === amount ? "default" : "outline"}
                className="h-12 text-base font-semibold"
                onClick={() => updateSetting('ante_dollars', amount)}
              >
                ${amount}
              </Button>
            ))}
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="custom-ante" className="text-sm whitespace-nowrap">Custom:</Label>
            <Input
              id="custom-ante"
              type="number"
              min="1"
              max="1000"
              className="flex-1 text-center"
              placeholder="$"
              value={settings.ante_dollars}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value > 0) updateSetting('ante_dollars', value);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Adjudication Settings */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Gavel className="h-5 w-5" />
            <span>Game Management</span>
          </CardTitle>
          <CardDescription>
            Who can determine the outcome of each at-bat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div 
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                settings.adjudication_mode === 'trust_turn_holder' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:bg-muted/50'
              }`}
              onClick={() => updateSetting('adjudication_mode', 'trust_turn_holder')}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Current Player Decides</span>
                    <Badge variant="default" className="text-xs">Recommended</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The player whose turn it is determines the outcome
                  </p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  settings.adjudication_mode === 'trust_turn_holder'
                    ? 'border-primary bg-primary' 
                    : 'border-muted-foreground'
                }`} />
              </div>
            </div>

            <div 
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                settings.adjudication_mode === 'admin_only' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:bg-muted/50'
              }`}
              onClick={() => updateSetting('adjudication_mode', 'admin_only')}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Admin Only</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Only you can determine winners and manage outcomes
                  </p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  settings.adjudication_mode === 'admin_only'
                    ? 'border-primary bg-primary' 
                    : 'border-muted-foreground'
                }`} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Advanced</span>
          </CardTitle>
          <CardDescription>
            Optional settings for enhanced gameplay
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mlb-game">MLB Game ID (Optional)</Label>
            <Input
              id="mlb-game"
              placeholder="e.g., 2024-10-15-NYY-BOS"
              value={settings.mlb_game_id || ''}
              onChange={(e) => updateSetting('mlb_game_id', e.target.value || undefined)}
            />
            <p className="text-xs text-muted-foreground">
              Link to a specific MLB game for automated data
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="deadline">Pick Deadline (Optional)</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="deadline"
                type="number"
                min="5"
                max="300"
                placeholder="60"
                className="flex-1"
                value={settings.deadline_seconds || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  updateSetting('deadline_seconds', value > 0 ? value : undefined);
                }}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">seconds</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Time limit for players to make their picks
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-4">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={onSave} className="flex-1">
          Save Settings
        </Button>
      </div>
    </div>
  );
}
