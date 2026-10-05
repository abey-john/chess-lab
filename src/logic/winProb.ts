import type { EvalScore } from '../engine/types';
import type { Color } from '../game/types';

const WIN_PCT_SCALE = -0.00368208;
const MATE_CP_EQUIVALENT = 10000;

/**
 * Calculates winning probability percentage (0 to 100) from a centipawn score,
 * using the standard model from Lichess / Stockfish:
 * winPct(cp) = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
 *
 * @param cp Centipawns from the perspective of the side to move
 */
export function winPctFromCp(cp: number): number {
  const result = 50 + 50 * (2 / (1 + Math.exp(WIN_PCT_SCALE * cp)) - 1);
  return Math.max(0, Math.min(100, result));
}

/**
 * Maps an EvalScore ({ kind: 'cp' } | { kind: 'mate' }) to a centipawn integer,
 * treating mate in N (N > 0) as +10000 cp and mate in -N as -10000 cp.
 */
export function evalScoreToCp(score: EvalScore): number {
  if (score.kind === 'cp') {
    return score.value;
  }
  if (score.value > 0) {
    return MATE_CP_EQUIVALENT;
  }
  // When score.value <= 0 (e.g. mate 0 or mate -N), side to move is in checkmate
  // or getting checkmated: this is a terminal loss for the side to move.
  return -MATE_CP_EQUIVALENT;
}

/**
 * Calculates win percentage from an EvalScore from the side-to-move's perspective.
 */
export function evalScoreToWinProb(score: EvalScore): number {
  return winPctFromCp(evalScoreToCp(score));
}

/**
 * Converts an EvalScore to White's perspective win percentage (0 to 100).
 */
export function evalScoreToWhiteWinProb(score: EvalScore, sideToMove: Color): number {
  const sideToMoveWinPct = evalScoreToWinProb(score);
  return sideToMove === 'white' ? sideToMoveWinPct : 100 - sideToMoveWinPct;
}
