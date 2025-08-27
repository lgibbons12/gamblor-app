import { backendBaseUrl } from '@/app/lib/backend';

export interface GameCreateRequest {
  title?: string;
  mlb_game_id?: string;
  ante_dollars?: number;
  adjudication_mode?: 'admin_only' | 'trust_turn_holder';
  deadline_seconds?: number;
}

export interface GameJoinRequest {
  // Empty - user ID comes from JWT token
}

export interface GameUpdateRequest {
  ante_dollars?: number;
  adjudication_mode?: 'admin_only' | 'trust_turn_holder';
  deadline_seconds?: number;
  mlb_game_id?: string;
  status?: 'pending' | 'active' | 'final';
}

export interface User {
  id: string;
  name: string;
  email: string;
  google_sub?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  title: string;
  pin: string;
  created_by: string;
  mlb_game_id?: string;
  ante_dollars: number;
  adjudication_mode: string;
  deadline_seconds?: number;
  status: string;
  created_at: string;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  user_id: string;
  turn_order: number;
  is_admin: boolean;
  nickname?: string;
  character?: string;
  joined_at: string;
  last_seen_at: string;
}

export interface GameSummary {
  game: Game;
  players: GamePlayer[];
  player_count: number;
  is_joinable: boolean;
}

export interface MyGameEntry {
  game: Game;
  is_admin: boolean;
  player_id: string;
}

export interface PlayerStateInfo {
  id: string;
  user_id: string;
  user_name: string;
  turn_order: number;
  is_admin: boolean;
  nickname?: string;
  character?: string;
  is_current_player: boolean;
}

export interface LeaderboardEntry {
  player_id: string;
  user_name: string;
  net_dollars: number;
  wins: number;
  misses: number;
  picks_total: number;
}

export interface GameState {
  current_inning_id?: string;
  inning_number?: number;
  half?: 'top' | 'bottom';
  outs: number;
  between_ab_locked: boolean;
  pot_dollars: number;
  ante_dollars: number;
  current_player?: PlayerStateInfo;
  your_pick?: string;
  amend_allowed: boolean;
  players: PlayerStateInfo[];
  leaderboard: LeaderboardEntry[];
  last_event_id?: string;
  game_status: string;
}

export interface PickCreateRequest {
  inning_id: string;
  choice_code: 'K' | 'G' | 'F' | 'D' | 'T' | 'N';
}

export interface PickAmendRequest {
  new_code: 'K' | 'G' | 'F' | 'D' | 'T' | 'N';
}

export interface PickResponse {
  id: string;
  choice_code: string;
  amend_count: number;
  is_final: boolean;
  created_at: string;
}

export interface AdjudicationRequest {
  inning_id: string;
  result_code: 'K' | 'G' | 'F' | 'D' | 'T' | 'N';
}

export interface MissRequest {
  inning_id: string;
}

export interface AdjudicationResponse {
  inning_id: string;
  result_code: string;
  winners: string[];
  pot_awarded: number;
  new_outs: number;
  inning_closed: boolean;
  next_inning_started: boolean;
}

class GamesAPI {
  private baseUrl: string;

  constructor(baseUrl: string = backendBaseUrl) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('gamblor_token');
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Create a new game
  async createGame(data: GameCreateRequest): Promise<Game> {
    return this.request<Game>('/games', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Join a game by PIN
  async joinGameByPin(pin: string): Promise<GamePlayer> {
    return this.request<GamePlayer>(`/games/${pin}/join`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // Update game settings (admin only)
  async updateGame(gameId: string, data: GameUpdateRequest): Promise<Game> {
    return this.request<Game>(`/games/${gameId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Get game summary
  async getGameSummary(gameId: string): Promise<GameSummary> {
    return this.request<GameSummary>(`/games/${gameId}`);
  }

  // Get real-time game state
  async getGameState(gameId: string): Promise<GameState> {
    return this.request<GameState>(`/games/${gameId}/state`);
  }

  // List my games
  async listMyGames(status?: 'pending' | 'active' | 'final'): Promise<MyGameEntry[]> {
    const q = status ? `?status_filter=${status}` : '';
    return this.request<MyGameEntry[]>(`/games/mine${q}`);
  }

  // Update my character for a game
  async updateMyCharacter(gameId: string, character: string): Promise<{ player_id: string; character: string; }> {
    return this.request(`/games/${gameId}/players/me/character`, {
      method: 'PATCH',
      body: JSON.stringify({ character }),
    });
  }

  // Create or update a pick
  async createPick(gameId: string, data: PickCreateRequest): Promise<PickResponse> {
    return this.request<PickResponse>(`/games/${gameId}/picks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Amend an existing pick
  async amendPick(gameId: string, pickId: string, data: PickAmendRequest): Promise<PickResponse> {
    return this.request<PickResponse>(`/games/${gameId}/picks/${pickId}/amend`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Adjudicate an outcome
  async adjudicateOutcome(gameId: string, data: AdjudicationRequest): Promise<AdjudicationResponse> {
    return this.request<AdjudicationResponse>(`/games/${gameId}/outs`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Mark a miss
  async markMiss(gameId: string, data: MissRequest): Promise<AdjudicationResponse> {
    return this.request<AdjudicationResponse>(`/games/${gameId}/miss`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const gamesAPI = new GamesAPI();
