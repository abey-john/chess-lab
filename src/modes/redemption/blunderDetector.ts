import type { EngineService, EvalScore } from '../../engine/types';
import type { MoveQuality } from '../../game/types';
import { classifyMove } from '../../logic/classifyMove';

export interface BlunderCheckResult {
  isBlunder: boolean;
  drop: number;
  quality: MoveQuality;
  beforeWinProb: number;
  afterWinProb: number;
  beforeScore: EvalScore;
  afterScore: EvalScore;
}

/**
 * Evaluates the position before and after a player move to determine if it is a blunder.
 * A move is a blunder if the moving side's win probability drops by >= 20 percentage points.
 *
 * @param fenBefore Position FEN before the move (moving side's perspective)
 * @param fenAfter Position FEN after the move (opponent's perspective)
 * @param engine The engine service to evaluate positions with
 * @param cachedBeforeScore Optional precomputed score for fenBefore to avoid redundant computation
 * @param depth Search depth for live evaluation (defaults to 10 for fast live response)
 */
export async function checkMoveForBlunder(
  fenBefore: string,
  fenAfter: string,
  engine: EngineService,
  cachedBeforeScore?: EvalScore,
  depth: number = 10
): Promise<BlunderCheckResult> {
  const beforeScore = cachedBeforeScore ?? (await engine.evaluate(fenBefore, depth)).score;
  const afterEval = await engine.evaluate(fenAfter, depth);
  const afterScore = afterEval.score;

  const classification = classifyMove(beforeScore, afterScore);

  return {
    isBlunder: classification.quality === 'blunder',
    drop: classification.drop,
    quality: classification.quality,
    beforeWinProb: classification.beforeWinProb,
    afterWinProb: classification.afterWinProb,
    beforeScore,
    afterScore,
  };
}
