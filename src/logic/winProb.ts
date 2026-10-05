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

/**
 * Converts an EvalScore to White's perspective centipawns.
 */
export function evalScoreToWhiteCp(score: EvalScore, sideToMove: Color): number {
  const sideToMoveCp = evalScoreToCp(score);
  return sideToMove === 'white' ? sideToMoveCp : -sideToMoveCp;
}

/**
 * Formatted score representation from White's perspective (+ for White, - for Black, 0.0 for even).
 */
export interface WhiteScoreInfo {
  score: number; // Value in pawns clamped to [-10, 10] for graph plotting
  display: string; // "+1.4", "-0.8", "0.0", "+M2", "-M1", "#", "-#"
  isMate: boolean;
}

/**
 * Formats an EvalScore from White's perspective (+ for White, - for Black, 0 for even).
 *
 * @param score EvalScore from the perspective of sideToMove
 * @param sideToMove The side to move in the evaluated position
 */
export function formatWhiteScore(score: EvalScore, sideToMove: Color): WhiteScoreInfo {
  if (score.kind === 'mate') {
    const isWhiteWinning =
      (sideToMove === 'white' && score.value > 0) ||
      (sideToMove === 'black' && score.value <= 0);

    if (score.value === 0) {
      return {
        score: isWhiteWinning ? 10 : -10,
        display: isWhiteWinning ? '#' : '-#',
        isMate: true,
      };
    }

    const moves = Math.abs(score.value);
    return {
      score: isWhiteWinning ? 10 : -10,
      display: isWhiteWinning ? `+M${moves}` : `-M${moves}`,
      isMate: true,
    };
  }

  // Centipawns:
  const rawWhiteCp = sideToMove === 'white' ? score.value : -score.value;
  const pawns = rawWhiteCp / 100;
  const clampedPawns = Math.max(-10, Math.min(10, pawns));

  let display: string;
  if (Math.abs(pawns) < 0.05) {
    display = '0.0';
  } else if (pawns > 0) {
    display = `+${pawns.toFixed(1)}`;
  } else {
    display = pawns.toFixed(1);
  }

  return {
    score: clampedPawns,
    display,
    isMate: false,
  };
}

