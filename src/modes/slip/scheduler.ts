import { DEFERRAL_CAP, FREQUENCY_RANGES, OPENING_GRACE_BOT_MOVES } from './config';
import type { DeferralReason, Frequency, SlipStrategyState } from './types';

/**
 * Samples a random integer uniformly between min and max (inclusive).
 */
export function sampleRange(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * Initializes scheduler state at the start of a slip game.
 */
export function initSlipScheduler(frequency: Frequency, rng: () => number): SlipStrategyState {
  const [min, max] = FREQUENCY_RANGES[frequency];
  return {
    botMovesUntilSlip: sampleRange(min, max, rng),
    consecutiveDeferrals: 0,
    botMoveCount: 0,
  };
}

/**
 * Checks if the bot turn should attempt a slip or play a normal move.
 */
export function shouldAttemptSlip(state: SlipStrategyState): boolean {
  return state.botMovesUntilSlip === 0;
}

/**
 * Updates scheduler when a normal move is played (countdown active).
 */
export function stepNormalMove(state: SlipStrategyState): SlipStrategyState {
  return {
    ...state,
    botMovesUntilSlip: Math.max(0, state.botMovesUntilSlip - 1),
    botMoveCount: state.botMoveCount + 1,
  };
}

/**
 * Resets scheduler after a slip is successfully played.
 */
export function onSlipPlayed(
  state: SlipStrategyState,
  frequency: Frequency,
  rng: () => number
): SlipStrategyState {
  const [min, max] = FREQUENCY_RANGES[frequency];
  return {
    botMovesUntilSlip: sampleRange(min, max, rng),
    consecutiveDeferrals: 0,
    botMoveCount: state.botMoveCount + 1,
  };
}

/**
 * Handles a deferred slip attempt per Section C3:
 * - Opening grace deferrals do NOT count towards consecutiveDeferrals.
 * - Other deferrals increment consecutiveDeferrals.
 * - When consecutiveDeferrals reaches DEFERRAL_CAP, the slip is aborted and reset.
 */
export function onSlipDeferred(
  state: SlipStrategyState,
  reason: DeferralReason,
  frequency: Frequency,
  rng: () => number
): SlipStrategyState {
  const nextMoveCount = state.botMoveCount + 1;

  if (reason === 'opening' || nextMoveCount <= OPENING_GRACE_BOT_MOVES) {
    // Opening deferrals keep waiting at 0 until grace period clears, without penalty
    return {
      ...state,
      botMovesUntilSlip: 0,
      botMoveCount: nextMoveCount,
    };
  }

  const nextDeferrals = state.consecutiveDeferrals + 1;

  if (nextDeferrals >= DEFERRAL_CAP) {
    // Cap reached: abort this slip cycle and reset countdown
    const [min, max] = FREQUENCY_RANGES[frequency];
    return {
      botMovesUntilSlip: sampleRange(min, max, rng),
      consecutiveDeferrals: 0,
      botMoveCount: nextMoveCount,
    };
  }

  return {
    ...state,
    botMovesUntilSlip: 0,
    consecutiveDeferrals: nextDeferrals,
    botMoveCount: nextMoveCount,
  };
}
