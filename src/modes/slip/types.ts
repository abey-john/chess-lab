import type { Candidate } from '../../engine/types';

export type Severity = 'inaccuracy' | 'mistake' | 'blunder';
export type SeverityChoice = Severity | 'mixed';
export type Frequency = 'rare' | 'sometimes' | 'frequent';

export interface SlipTagData {
  requestedSeverity: Severity;
  measuredDrop: number; // Win% points lost vs best move at slip time
  measuredSeverity: Severity | 'sub-inaccuracy';
  fallbackUsed: 'none' | 'widened' | 'smaller';
  rankPlayed: number; // 1-based engine rank (rank 1 is best move)
}

export interface SlipStrategyState {
  botMovesUntilSlip: number;
  consecutiveDeferrals: number;
  botMoveCount: number; // Total moves played by bot in this game
}

export type DeferralReason = 'opening' | 'forced' | 'decided' | 'no-candidate';

export type ReplyVerdict = 'capitalized' | 'squandered' | 'missed' | 'n/a';

export interface SlipChoiceResult {
  candidate: Candidate;
  tag: SlipTagData;
}
