import type { PuzzleSession } from './puzzleService';

export type RedemptionLives = 1 | 3 | 'unlimited';

export interface RedemptionConfigExtension {
  mode: 'redemption';
  lives: RedemptionLives;
}

export interface ChessPuzzle {
  id: string;
  fen: string;
  initialMove: string; // UCI format e.g. "e7e5"
  solution: string[]; // UCI format e.g. ["f3e5", "d8e7", "e5f3"]
  rating: number;
  themes: string[];
}

export type RedemptionOutcome = 'solved' | 'accepted' | 'failed' | 'timeout';

export interface RedemptionEvent {
  blunderPly: number;
  san?: string;
  puzzleId: string;
  puzzleRating: number;
  outcome: RedemptionOutcome;
  timeSpentMs?: number;
}

export interface RedemptionTagData {
  attempted: boolean;
  outcome: RedemptionOutcome;
  puzzleId: string;
  puzzleRating: number;
}

export interface ActiveRedemptionState {
  blunderPly: number;
  blunderMove: {
    from: string;
    to: string;
    promotion?: string;
    san: string;
    fenBefore: string;
    fenAfter: string;
  };
  puzzle: ChessPuzzle;
  session: PuzzleSession;
  livesRemaining: number | 'unlimited';
  status: 'active' | 'solved' | 'failed' | 'timeout' | 'accepted';
  timeRemainingMs: number;
}

export interface RedemptionStrategyState {
  livesRemaining: number | 'unlimited';
  redemptionEvents: RedemptionEvent[];
  usedPuzzleIds: string[];
}
