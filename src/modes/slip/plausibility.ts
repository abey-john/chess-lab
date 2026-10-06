import { Chess, type Square } from 'chess.js';
import type { Candidate } from '../../engine/types';
import { PLAUSIBILITY } from './config';
import type { Severity } from './types';

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};

/**
 * Heuristic plausibility multiplier (Section C6):
 * - Base 1.0.
 * - x1.5 if the move uses the same piece type as the engine's best move.
 * - x0.3 penalty for obvious piece hangs (target square attacked by a cheaper enemy piece),
 *   applied ONLY for 'inaccuracy' and 'mistake' (blunders are permitted to hang pieces).
 * - Clamped to minMultiplier (0.05).
 */
export function getPlausibilityMultiplier(
  fen: string,
  candidate: Candidate,
  bestCandidate: Candidate,
  targetSeverity: Severity
): number {
  let multiplier = 1.0;

  try {
    const chess = new Chess(fen);
    const bestFrom = bestCandidate.move.slice(0, 2) as Square;
    const candFrom = candidate.move.slice(0, 2) as Square;
    const candTo = candidate.move.slice(2, 4) as Square;

    const bestPiece = chess.get(bestFrom);
    const candPiece = chess.get(candFrom);

    // 1. Same piece type bonus
    if (bestPiece && candPiece && bestPiece.type === candPiece.type) {
      multiplier *= PLAUSIBILITY.sameTypeBonus;
    }

    // 2. Hang check (for non-blunder slips)
    if (targetSeverity !== 'blunder' && candPiece) {
      const movingPieceVal = PIECE_VALUES[candPiece.type] ?? 1;

      // Make the move on a cloned board to see who attacks the destination square
      const testChess = new Chess(fen);
      const promoChar = candidate.move.length > 4 ? candidate.move[4] : undefined;
      const moveRes = testChess.move({
        from: candFrom,
        to: candTo,
        promotion: promoChar === 'q' || promoChar === 'r' || promoChar === 'b' || promoChar === 'n' ? promoChar : undefined,
      });

      if (moveRes) {
        // Check if any opponent piece can capture on candTo
        const opponentMoves = testChess.moves({ verbose: true });
        for (const opMove of opponentMoves) {
          if (opMove.to === candTo) {
            const attackerVal = PIECE_VALUES[opMove.piece] ?? 1;
            // If attacked by a cheaper piece (e.g., pawn attacking queen/rook), heavily penalize plausibility
            if (attackerVal < movingPieceVal) {
              multiplier *= PLAUSIBILITY.hangPenalty;
              break;
            }
          }
        }
      }
    }
  } catch {
    // If parsing fails for any reason, keep base multiplier
  }

  return Math.max(PLAUSIBILITY.minMultiplier, multiplier);
}
