import type { Color, MoveQuality, PositionEval, SavedGame } from '../game/types';
import { calculateMoveAccuracy, calculateSideAccuracy } from '../logic/accuracy';
import { getQualityForDrop, type MoveClassification } from '../logic/classifyMove';
import { evalScoreToWhiteWinProb, evalScoreToWinProb, formatWhiteScore } from '../logic/winProb';
import { classifyReply } from '../modes/slip/classifyReply';
import type { ReplyVerdict, SlipTagData } from '../modes/slip/types';

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
  slip?: SlipTagData;
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
  slip?: SlipTagData;
}

export interface SlipReviewItem {
  ply: number;
  moveNumber: number;
  color: Color;
  san: string;
  tag: SlipTagData;
  playerReply?: {
    ply: number;
    san: string;
  };
  u0?: number;
  uBest?: number;
  uReply?: number;
  verdict: ReplyVerdict;
}

export interface SlipReviewSummary {
  totalSlips: number;
  capitalized: number;
  missed: number;
  squandered: number;
  na: number;
  items: SlipReviewItem[];
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
  slipSummary?: SlipReviewSummary;
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

    const isCheckmateMove = tag.san.includes('#');

    if (isCheckmateMove) {
      whiteWinProb = moveColor === 'white' ? 100 : 0;
      playerWinProb = playerColor === 'white' ? whiteWinProb : 100 - whiteWinProb;
      score = moveColor === 'white' ? 10 : -10;
      scoreDisplay = moveColor === 'white' ? '#' : '-#';

      const movingBeforeWinProb = beforeEval ? evalScoreToWinProb(beforeEval.score) : 100;
      classification = {
        drop: 0,
        quality: 'good',
        beforeWinProb: movingBeforeWinProb,
        afterWinProb: 100,
      };
      accuracy = 100;

      const targetStats = moveColor === 'white' ? whiteStats : blackStats;
      targetStats.good++;
      if (moveColor === 'white') {
        whiteAccuracies.push(100);
      } else {
        blackAccuracies.push(100);
      }
    } else {
      if (afterEval) {
        whiteWinProb = evalScoreToWhiteWinProb(afterEval.score, nextSideToMove);
        playerWinProb = playerColor === 'white' ? whiteWinProb : 100 - whiteWinProb;
        const scoreInfo = formatWhiteScore(afterEval.score, nextSideToMove);
        score = scoreInfo.score;
        scoreDisplay = scoreInfo.display;
      }

      if (beforeEval && afterEval && whiteWinProb !== undefined) {
        const movingBeforeWinProb = evalScoreToWinProb(beforeEval.score);
        const movingAfterWinProb = 100 - evalScoreToWinProb(afterEval.score);

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
      slip: tag.slip,
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
        slip: tag.slip,
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

  let slipSummary: SlipReviewSummary | undefined;
  if (mode === 'slip') {
    const slipItems: SlipReviewItem[] = [];
    let capitalized = 0;
    let missed = 0;
    let squandered = 0;
    let na = 0;

    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      if (tag.slip) {
        const ply = tag.ply;
        const moveNumber = Math.ceil(ply / 2);
        const moveColor: Color = ply % 2 === 1 ? 'white' : 'black';

        const replyTag = tags[i + 1]?.by === 'player' ? tags[i + 1] : undefined;

        let u0: number | undefined;
        let uBest: number | undefined;
        let uReply: number | undefined;

        const evalBefore = evalByPly.get(ply - 1);
        const evalAfterSlip = evalByPly.get(ply);

        if (evalBefore) {
          // At ply - 1, bot was to move. Player's win% before bot's slip:
          u0 = 100 - evalScoreToWinProb(evalBefore.score);
        }

        if (evalAfterSlip) {
          // At ply, bot made the slip. Player is now to move.
          // Player's theoretical win% with optimal continuation:
          uBest = evalScoreToWinProb(evalAfterSlip.score);
        }

        if (replyTag) {
          const evalAfterReply = evalByPly.get(replyTag.ply);
          if (evalAfterReply) {
            // At reply ply, player replied. Bot is to move.
            // Player's win% achieved after their reply:
            uReply = 100 - evalScoreToWinProb(evalAfterReply.score);
          }
        }

        const verdict: ReplyVerdict =
          u0 !== undefined && uBest !== undefined
            ? classifyReply(u0, uBest, uReply ?? null)
            : 'n/a';

        if (verdict === 'capitalized') capitalized++;
        else if (verdict === 'missed') missed++;
        else if (verdict === 'squandered') squandered++;
        else na++;

        slipItems.push({
          ply,
          moveNumber,
          color: moveColor,
          san: tag.san,
          tag: tag.slip,
          playerReply: replyTag ? { ply: replyTag.ply, san: replyTag.san } : undefined,
          u0,
          uBest,
          uReply,
          verdict,
        });
      }
    }

    slipSummary = {
      totalSlips: slipItems.length,
      capitalized,
      missed,
      squandered,
      na,
      items: slipItems,
    };
  }

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
    slipSummary,
  };
}
