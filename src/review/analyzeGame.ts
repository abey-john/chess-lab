import { Chess } from 'chess.js';
import type { EngineService } from '../engine/types';
import type { PositionEval, SavedGame } from '../game/types';
import { REVIEW_EVAL_DEPTH } from '../logic/config';

export interface AnalysisProgress {
  currentPly: number;
  totalPlies: number;
  percent: number;
}

export type ProgressCallback = (progress: AnalysisProgress) => void;

export interface AnalysisTask {
  promise: Promise<PositionEval[]>;
  cancel: () => void;
}

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Runs a background analysis pass over all positions (ply 0 through the end)
 * using the full-strength engine worker.
 */
export function startAnalysis(
  game: SavedGame,
  engine: EngineService,
  onProgress?: ProgressCallback,
  depth: number = REVIEW_EVAL_DEPTH
): AnalysisTask {
  let isCancelled = false;

  const positions: Array<{ ply: number; fen: string }> = [];

  // Ply 0: Starting position
  positions.push({ ply: 0, fen: STARTING_FEN });

  // Replay moves using chess.js to obtain exact FEN at each ply
  const chess = new Chess();
  for (let i = 0; i < game.tags.length; i++) {
    const tag = game.tags[i];
    try {
      chess.move(tag.san);
      positions.push({ ply: i + 1, fen: chess.fen() });
    } catch {
      console.warn(`Could not replay move ${tag.san} during analysis`);
    }
  }

  const totalPlies = positions.length;

  const promise = (async (): Promise<PositionEval[]> => {
    // If game already has complete cached analysis, return it immediately
    if (game.analysis && game.analysis.length === totalPlies) {
      onProgress?.({ currentPly: totalPlies, totalPlies, percent: 100 });
      return game.analysis;
    }

    const existingAnalysisMap = new Map<number, PositionEval>();
    if (game.analysis) {
      for (const item of game.analysis) {
        existingAnalysisMap.set(item.ply, item);
      }
    }

    const results: PositionEval[] = [];

    for (let i = 0; i < positions.length; i++) {
      if (isCancelled) {
        throw new Error('Analysis cancelled');
      }

      const { ply, fen } = positions[i];

      // Use cached evaluation if already present
      const cached = existingAnalysisMap.get(ply);
      if (cached) {
        results.push(cached);
      } else {
        const evalResult = await engine.evaluate(fen, depth);
        results.push({
          ply,
          score: evalResult.score,
          depth: evalResult.depth,
        });
      }

      const currentPly = i + 1;
      const percent = Math.round((currentPly / totalPlies) * 100);
      onProgress?.({ currentPly, totalPlies, percent });
    }

    return results;
  })();

  return {
    promise,
    cancel: () => {
      isCancelled = true;
      try {
        engine.stop();
      } catch {
        // ignore
      }
    },
  };
}
