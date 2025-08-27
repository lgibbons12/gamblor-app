'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Check } from 'lucide-react';

const BASEBALL_CHARACTERS = [
  { id: 'ace', name: 'The Ace', icon: '⚾', description: 'Strikeout specialist', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { id: 'slugger', name: 'Power Hitter', icon: '💪', description: 'Home run hero', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  { id: 'speedster', name: 'Speed Demon', icon: '⚡', description: 'Base stealing master', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { id: 'glove', name: 'Golden Glove', icon: '🥅', description: 'Defensive wizard', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { id: 'coach', name: 'The Coach', icon: '📋', description: 'Strategic mind', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { id: 'rookie', name: 'Rising Star', icon: '🌟', description: 'Future legend', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  { id: 'veteran', name: 'Hall of Famer', icon: '🏆', description: 'Seasoned pro', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
  { id: 'clutch', name: 'Mr. Clutch', icon: '💎', description: 'Pressure performer', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
];

interface CharacterSelectionProps {
  selectedCharacter?: string;
  onCharacterSelect: (character: typeof BASEBALL_CHARACTERS[0]) => void;
  title?: string;
  description?: string;
}

export function CharacterSelection({ 
  selectedCharacter, 
  onCharacterSelect, 
  title = "Choose Your Character",
  description = "Pick a baseball persona that represents you in the game"
}: CharacterSelectionProps) {
  
  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {BASEBALL_CHARACTERS.map((character) => (
            <div
              key={character.id}
              className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                selectedCharacter === character.id
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-muted-foreground/50'
              }`}
              onClick={() => onCharacterSelect(character)}
            >
              {selectedCharacter === character.id && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="text-3xl">{character.icon}</div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm leading-tight">{character.name}</h3>
                  <p className="text-xs text-muted-foreground leading-tight">{character.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {selectedCharacter && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">
                {BASEBALL_CHARACTERS.find(c => c.id === selectedCharacter)?.icon}
              </div>
              <div>
                <p className="font-semibold">
                  You selected: {BASEBALL_CHARACTERS.find(c => c.id === selectedCharacter)?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {BASEBALL_CHARACTERS.find(c => c.id === selectedCharacter)?.description}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { BASEBALL_CHARACTERS };
