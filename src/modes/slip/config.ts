import type { Severity, SeverityChoice } from './types';

export const OPENING_GRACE_BOT_MOVES = 6;
export const DECIDED_HIGH = 90;
export const DECIDED_LOW = 10;
export const MIN_LEGAL_MOVES_FOR_SLIP = 3;
export const MIN_CANDIDATE_LINES_FOR_SLIP = 3;

export const BAND_WIDEN = 3; // Win% points to widen search band if no candidates match
export const MIN_MEANINGFUL_DROP = 3; // Win% floor for fallback to smaller errors
export const MIN_MEANINGFUL_GAIN = 3; // Minimum player gain to consider slip non-trivial
export const CAPITALIZE_TOLERANCE = 3; // Win% window within theoretical optimum

export const DEFERRAL_CAP = 3;

export const FREQUENCY_RANGES = {
  rare: [9, 14] as const,
  sometimes: [5, 8] as const,
  frequent: [3, 4] as const,
};

export const MIXED_WEIGHTS: Record<Severity, number> = {
  inaccuracy: 0.4,
  mistake: 0.4,
  blunder: 0.2,
};

export const PLAUSIBILITY = {
  hangPenalty: 0.3,
  sameTypeBonus: 1.5,
  minMultiplier: 0.05,
} as const;

export const DEFAULT_SLIP_SEVERITY: SeverityChoice = 'mixed';
export const DEFAULT_SLIP_FREQUENCY = 'sometimes' as const;
