import { CAPITALIZE_TOLERANCE, MIN_MEANINGFUL_GAIN } from './config';
import type { ReplyVerdict } from './types';

/**
 * Classifies the player's reply to an intentional bot slip (Section C8):
 *
 * All values represent win% from the PLAYER's perspective:
 * - u0: player win% before the bot's slip
 * - uBest: player win% after the slip, assuming player finds the optimal reply
 * - uReply: player win% after the reply move actually played by the player
 *
 * Verdicts:
 * - 'n/a': no reply made, or uBest - u0 < MIN_MEANINGFUL_GAIN (trivial slip)
 * - 'capitalized': player captured the advantage within tolerance (uBest - uReply <= CAPITALIZE_TOLERANCE)
 * - 'squandered': player failed to capitalize and ended up worse than before the slip (uReply < u0)
 * - 'missed': player failed to capitalize but did not worsen their original position
 */
export function classifyReply(
  u0: number,
  uBest: number,
  uReply: number | null
): ReplyVerdict {
  if (uReply === null) {
    return 'n/a';
  }

  const theoreticalGain = uBest - u0;
  if (theoreticalGain < MIN_MEANINGFUL_GAIN) {
    return 'n/a';
  }

  const lossVsOptimum = uBest - uReply;
  if (lossVsOptimum <= CAPITALIZE_TOLERANCE) {
    return 'capitalized';
  }

  if (uReply < u0) {
    return 'squandered';
  }

  return 'missed';
}
