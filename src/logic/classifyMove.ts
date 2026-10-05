import type { EvalScore } from '../engine/types';
import type { MoveQuality } from '../game/types';
import { SEVERITY_BANDS } from './config';
import { evalScoreToWinProb } from './winProb';

export interface MoveClassification {
  drop: number; // win% points lost
  quality: MoveQuality;
  beforeWinProb: number; // moving side's win% before move
  afterWinProb: number; // moving side's win% after move
}

/**
 * Maps a win% drop to a MoveQuality classification using shared SEVERITY_BANDS.
 */
export function getQualityForDrop(drop: number): MoveQuality {
  if (drop < SEVERITY_BANDS.good.max) {
    return 'good';
  }
  if (drop < SEVERITY_BANDS.inaccuracy.max) {
    return 'inaccuracy';
  }
  if (drop < SEVERITY_BANDS.mistake.max) {
    return 'mistake';
  }
  return 'blunder';
}

/**
 * Classifies a move's quality based on win percentage drop.
 *
 * @param beforeScore EvalScore before the move (from moving side's perspective)
 * @param afterScore EvalScore after the move (from opponent's perspective)
 */
export function classifyMove(beforeScore: EvalScore, afterScore: EvalScore): MoveClassification {
  // Moving side's win probability before the move
  const beforeWinProb = evalScoreToWinProb(beforeScore);

  // After the move, afterScore is from the opponent's perspective,
  // so the moving side's win probability is (100 - afterScoreWinProb)
  const afterWinProb = 100 - evalScoreToWinProb(afterScore);

  // Drop in win percentage points (clamped to at least 0)
  const drop = Math.max(0, beforeWinProb - afterWinProb);

  const quality = getQualityForDrop(drop);

  return {
    drop,
    quality,
    beforeWinProb,
    afterWinProb,
  };
}
