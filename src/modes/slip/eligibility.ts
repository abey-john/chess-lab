import type { Candidate } from '../../engine/types';
import { evalScoreToWinProb } from '../../logic/winProb';
import {
  DECIDED_HIGH,
  DECIDED_LOW,
  MIN_CANDIDATE_LINES_FOR_SLIP,
  MIN_LEGAL_MOVES_FOR_SLIP,
  OPENING_GRACE_BOT_MOVES,
} from './config';
import type { DeferralReason } from './types';

/**
 * Checks eligibility before spending time on candidate engine search:
 * 1. Opening grace period (botMoveCount <= OPENING_GRACE_BOT_MOVES)
 * 2. Forced position (legalMovesCount < MIN_LEGAL_MOVES_FOR_SLIP)
 */
export function checkPreSearchEligibility(
  botMoveCount: number,
  legalMovesCount: number
): { eligible: true } | { eligible: false; reason: DeferralReason } {
  if (botMoveCount < OPENING_GRACE_BOT_MOVES) {
    return { eligible: false, reason: 'opening' };
  }
  if (legalMovesCount < MIN_LEGAL_MOVES_FOR_SLIP) {
    return { eligible: false, reason: 'forced' };
  }
  return { eligible: true };
}

/**
 * Checks eligibility after candidate engine search:
 * 1. Candidate line count (candidates.length < MIN_CANDIDATE_LINES_FOR_SLIP)
 * 2. Decided position (best candidate win% > 90% or < 10% from bot perspective)
 */
export function checkPostSearchEligibility(
  candidates: Candidate[]
): { eligible: true } | { eligible: false; reason: DeferralReason } {
  if (candidates.length < MIN_CANDIDATE_LINES_FOR_SLIP) {
    return { eligible: false, reason: 'forced' };
  }

  const bestCandidate = candidates[0];
  const bestWinPct = evalScoreToWinProb(bestCandidate.score);

  if (bestWinPct > DECIDED_HIGH || bestWinPct < DECIDED_LOW) {
    return { eligible: false, reason: 'decided' };
  }

  return { eligible: true };
}
