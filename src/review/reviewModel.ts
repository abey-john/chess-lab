import type { Color, MoveQuality, PositionEval, SavedGame } from '../game/types';
import { calculateMoveAccuracy, calculateSideAccuracy } from '../logic/accuracy';
import { getQualityForDrop, type MoveClassification } from '../logic/classifyMove';
import { evalScoreToWhiteWinProb, formatWhiteScore } from '../logic/winProb';

export interface ClassifiedMove {
  ply: number;
  san: string;
  by: 'player' | 'bot';
  color: Color; // white or black
  scoreBefore?: PositionEval;
  scoreAfter?: PositionEval;
  classification?: MoveClassification;
  accuracy?: number; // 0 to 100
  whiteWinProb?: number; // White's win% after this move (0 to 100)
  playerWinProb?: number; // Player's win% after this move (0 to 100)
  score?: number; // In pawns, clamped [-10, 10] (+ for White, - for Black, 0 for even)
  scoreDisplay?: string; // Formatted score e.g. "+1.4", "-0.8", "0.0", "+M2", "-M1", "#"
}

export interface MoveSwing {
  ply: number;
  san: string;
  by: 'player' | 'bot';
  color: Color;
  drop: number;
  quality: MoveQuality;
}

export interface SideStats {
  good: number;
  inaccuracy: number;
  mistake: number;
  blunder: number;
  accuracy: number; // average accuracy (0 to 100)
}

export interface ReviewGraphPoint {
  ply: number;
  whiteWinProb: number;
  playerWinProb: number;
  score: number; // In pawns, clamped [-10, 10] (+ for White, - for Black, 0 for even)
  scoreDisplay: string; // Formatted score e.g. "+1.4", "-0.8", "0.0", "+M2", "-M1", "#"
  quality?: MoveQuality;
  by?: 'player' | 'bot';
  color?: Color;
  san?: string;
}

export interface ReviewModel {
  gameId: string;
  mode: string;
  result: SavedGame['result'];
  resultReason: string;
  playerColor: Color;
  botColor: Color;
  config: SavedGame['config'];
  classifiedMoves: ClassifiedMove[];
  topSwings: MoveSwing[];
  whiteStats: SideStats;
  blackStats: SideStats;
  evalGraphPoints: ReviewGraphPoint[];
}

/**
 * Builds the complete post-game review model from a SavedGame and its position evals.
 */
export function buildReviewModel(savedGame: SavedGame): ReviewModel {
  const { id, mode, result, resultReason, config, tags, analysis = [] } = savedGame;
  const playerColor = config.playerColor;
  const botColor: Color = playerColor === 'white' ? 'black' : 'white';

  // Map analysis by ply for instant lookup
  const evalByPly = new Map<number, PositionEval>();
  for (const posEval of analysis) {
    evalByPly.set(posEval.ply, posEval);
  }

  const classifiedMoves: ClassifiedMove[] = [];
  const whiteAccuracies: number[] = [];
  const blackAccuracies: number[] = [];

  const whiteStats: SideStats = { good: 0, inaccuracy: 0, mistake: 0, blunder: 0, accuracy: 100 };
  const blackStats: SideStats = { good: 0, inaccuracy: 0, mistake: 0, blunder: 0, accuracy: 100 };

  const evalGraphPoints: ReviewGraphPoint[] = [];

  // Starting position (ply 0): White to move
  const startEval = evalByPly.get(0);
  if (startEval) {
    const startWhiteWinProb = evalScoreToWhiteWinProb(startEval.score, 'white');
    const startPlayerWinProb = playerColor === 'white' ? startWhiteWinProb : 100 - startWhiteWinProb;
    const startScoreInfo = formatWhiteScore(startEval.score, 'white');
    evalGraphPoints.push({
      ply: 0,
      whiteWinProb: startWhiteWinProb,
      playerWinProb: startPlayerWinProb,
      score: startScoreInfo.score,
      scoreDisplay: startScoreInfo.display,
    });
  }

  for (const tag of tags) {
    const ply = tag.ply;
    // Odd plies (1, 3, 5...) are White's moves; even plies (2, 4, 6...) are Black's moves
    const moveColor: Color = ply % 2 === 1 ? 'white' : 'black';
    // After ply i, the side to move next is the opposite color
    const nextSideToMove: Color = moveColor === 'white' ? 'black' : 'white';

    const beforeEval = evalByPly.get(ply - 1);
    const afterEval = evalByPly.get(ply);

    let classification: MoveClassification | undefined;
    let accuracy: number | undefined;
    let whiteWinProb: number | undefined;
    let playerWinProb: number | undefined;
    let score: number | undefined;
    let scoreDisplay: string | undefined;

    if (afterEval) {
      whiteWinProb = evalScoreToWhiteWinProb(afterEval.score, nextSideToMove);
      playerWinProb = playerColor === 'white' ? whiteWinProb : 100 - whiteWinProb;
      const scoreInfo = formatWhiteScore(afterEval.score, nextSideToMove);
      score = scoreInfo.score;
      scoreDisplay = scoreInfo.display;
    }

    if (beforeEval && afterEval && whiteWinProb !== undefined) {
      const beforeWhiteWinProb = evalScoreToWhiteWinProb(beforeEval.score, moveColor);
      const movingBeforeWinProb = moveColor === 'white' ? beforeWhiteWinProb : 100 - beforeWhiteWinProb;
      const movingAfterWinProb = moveColor === 'white' ? whiteWinProb : 100 - whiteWinProb;

      const drop = Math.max(0, movingBeforeWinProb - movingAfterWinProb);
      const quality = getQualityForDrop(drop);

      classification = {
        drop,
        quality,
        beforeWinProb: movingBeforeWinProb,
        afterWinProb: movingAfterWinProb,
      };
      accuracy = calculateMoveAccuracy(drop);

      // Accumulate stats
      const targetStats = moveColor === 'white' ? whiteStats : blackStats;
      targetStats[quality]++;

      if (moveColor === 'white') {
        whiteAccuracies.push(accuracy);
      } else {
        blackAccuracies.push(accuracy);
      }
    }

    classifiedMoves.push({
      ply,
      san: tag.san,
      by: tag.by,
      color: moveColor,
      scoreBefore: beforeEval,
      scoreAfter: afterEval,
      classification,
      accuracy,
      whiteWinProb,
      playerWinProb,
      score,
      scoreDisplay,
    });

    if (
      whiteWinProb !== undefined &&
      playerWinProb !== undefined &&
      score !== undefined &&
      scoreDisplay !== undefined
    ) {
      evalGraphPoints.push({
        ply,
        whiteWinProb,
        playerWinProb,
        score,
        scoreDisplay,
        quality: classification?.quality,
        by: tag.by,
        color: moveColor,
        san: tag.san,
      });
    }
  }


  // Calculate side averages
  whiteStats.accuracy = calculateSideAccuracy(whiteAccuracies);
  blackStats.accuracy = calculateSideAccuracy(blackAccuracies);

  // Top 5 swings across both sides by win% drop (descending)
  const swings: MoveSwing[] = classifiedMoves
    .filter((m): m is ClassifiedMove & { classification: MoveClassification } => m.classification !== undefined)
    .map((m) => ({
      ply: m.ply,
      san: m.san,
      by: m.by,
      color: m.color,
      drop: m.classification.drop,
      quality: m.classification.quality,
    }))
    .sort((a, b) => b.drop - a.drop)
    .slice(0, 5);

  return {
    gameId: id,
    mode,
    result,
    resultReason,
    playerColor,
    botColor,
    config,
    classifiedMoves,
    topSwings: swings,
    whiteStats,
    blackStats,
    evalGraphPoints,
  };
}
