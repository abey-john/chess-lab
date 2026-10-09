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
