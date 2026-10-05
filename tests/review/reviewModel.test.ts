import { describe, expect, it } from 'vitest';
import type { SavedGame } from '../../src/game/types';
import { buildReviewModel } from '../../src/review/reviewModel';

describe('buildReviewModel', () => {
  it('builds a full review model with classifications, swings, and summary stats', () => {
    // 4-ply test game
    const sampleGame: SavedGame = {
      version: 1,
      id: 'test-game-123',
      mode: 'standard',
      startedAt: '2026-10-04T12:00:00Z',
      config: {
        mode: 'standard',
        playerColor: 'white',
        elo: 1500,
        botDelay: false,
      },
      result: '1-0',
      resultReason: 'checkmate',
      pgn: '1. e4 e5 2. Qh5 g6',
      tags: [
        { ply: 1, fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', san: 'e4', by: 'player' },
        { ply: 2, fenBefore: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', san: 'e5', by: 'bot' },
        { ply: 3, fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', san: 'Qh5', by: 'player' },
        { ply: 4, fenBefore: 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2', san: 'g6', by: 'bot' },
      ],
      analysis: [
        { ply: 0, score: { kind: 'cp', value: 20 }, depth: 14 }, // White to move: White +20cp (~52% win)
        { ply: 1, score: { kind: 'cp', value: -18 }, depth: 14 }, // After 1. e4: Black to move, -18cp for Black (White ~52% win) -> Good move
        { ply: 2, score: { kind: 'cp', value: 20 }, depth: 14 }, // After 1... e5: White to move, +20cp for White -> Good move
        { ply: 3, score: { kind: 'cp', value: -15 }, depth: 14 }, // After 2. Qh5: Black to move, -15cp for Black -> Good move
        { ply: 4, score: { kind: 'cp', value: 450 }, depth: 14 }, // After 2... g6: White to move, +450cp for White -> Bot blundered!
      ],
    };

    const model = buildReviewModel(sampleGame);

    expect(model.gameId).toBe('test-game-123');
    expect(model.playerColor).toBe('white');
    expect(model.botColor).toBe('black');
    expect(model.result).toBe('1-0');

    // 4 classified moves
    expect(model.classifiedMoves).toHaveLength(4);

    // Ply 1: White 1. e4
    expect(model.classifiedMoves[0].san).toBe('e4');
    expect(model.classifiedMoves[0].color).toBe('white');
    expect(model.classifiedMoves[0].classification?.quality).toBe('good');
    expect(model.classifiedMoves[0].classification?.drop).toBeLessThan(5);

    // Ply 2: Black 1... e5
    expect(model.classifiedMoves[1].san).toBe('e5');
    expect(model.classifiedMoves[1].color).toBe('black');
    expect(model.classifiedMoves[1].classification?.quality).toBe('good');

    // Ply 3: White 2. Qh5
    expect(model.classifiedMoves[2].san).toBe('Qh5');
    expect(model.classifiedMoves[2].color).toBe('white');
    expect(model.classifiedMoves[2].classification?.quality).toBe('good');

    // Ply 4: Black 2... g6 (blunder!)
    expect(model.classifiedMoves[3].san).toBe('g6');
    expect(model.classifiedMoves[3].color).toBe('black');
    expect(model.classifiedMoves[3].classification?.quality).toBe('blunder');
    expect(model.classifiedMoves[3].classification?.drop).toBeGreaterThan(20);

    // Top swings: should identify ply 4 as the biggest swing
    expect(model.topSwings.length).toBeGreaterThanOrEqual(1);
    expect(model.topSwings[0].ply).toBe(4);
    expect(model.topSwings[0].san).toBe('g6');
    expect(model.topSwings[0].quality).toBe('blunder');

    // Stats
    expect(model.whiteStats.good).toBe(2);
    expect(model.whiteStats.blunder).toBe(0);
    expect(model.whiteStats.accuracy).toBeGreaterThan(95);

    expect(model.blackStats.good).toBe(1);
    expect(model.blackStats.blunder).toBe(1);
    expect(model.blackStats.accuracy).toBeCloseTo(60.5, 1);

    // Eval graph points: plies 0, 1, 2, 3, 4
    expect(model.evalGraphPoints).toHaveLength(5);
    expect(model.evalGraphPoints[0].ply).toBe(0);
    expect(model.evalGraphPoints[4].ply).toBe(4);
    expect(model.evalGraphPoints[4].whiteWinProb).toBeGreaterThan(80);
  });
});
