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
        { ply: 0, score: { kind: 'cp', value: 20 }, depth: 14 }, // White to move: White +20cp
        { ply: 1, score: { kind: 'cp', value: -18 }, depth: 14 }, // After 1. e4: Black to move, White +18cp
        { ply: 2, score: { kind: 'cp', value: 20 }, depth: 14 }, // After 1... e5: White to move, White +20cp
        { ply: 3, score: { kind: 'cp', value: -15 }, depth: 14 }, // After 2. Qh5: Black to move, White +15cp
        { ply: 4, score: { kind: 'cp', value: 450 }, depth: 14 }, // After 2... g6: White to move, White +450cp
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
    expect(model.evalGraphPoints[0].score).toBeCloseTo(0.2, 1);
    expect(model.evalGraphPoints[0].scoreDisplay).toBe('+0.2');

    expect(model.evalGraphPoints[4].ply).toBe(4);
    // Move 4 eval was +450 cp for White, so White score is +4.5 pawns
    expect(model.evalGraphPoints[4].score).toBeCloseTo(4.5, 1);
    expect(model.evalGraphPoints[4].scoreDisplay).toBe('+4.5');
    expect(model.classifiedMoves[3].scoreDisplay).toBe('+4.5');

    // Win probability is still tracked accurately
    expect(model.evalGraphPoints[4].whiteWinProb).toBeGreaterThan(80);
    expect(model.evalGraphPoints[4].whiteWinProb).toBeLessThan(90);
    expect(model.evalGraphPoints[4].playerWinProb).toBe(model.evalGraphPoints[4].whiteWinProb);
  });

  it('adapts playerWinProb to player perspective when player is Black and preserves score (+ for White, - for Black)', () => {
    const blackGame: SavedGame = {
      version: 1,
      id: 'test-game-black',
      mode: 'standard',
      startedAt: '2026-10-04T12:00:00Z',
      config: {
        mode: 'standard',
        playerColor: 'black',
        elo: 1500,
        botDelay: false,
      },
      result: '1-0', // Bot (White) wins
      resultReason: 'White won by resignation',
      pgn: '1. e4 e5',
      tags: [
        { ply: 1, fenBefore: 'start', san: 'e4', by: 'bot' },
        { ply: 2, fenBefore: 'fen1', san: 'e5', by: 'player' },
      ],
      analysis: [
        { ply: 0, score: { kind: 'cp', value: 20 }, depth: 14 },
        { ply: 1, score: { kind: 'cp', value: -18 }, depth: 14 },
        { ply: 2, score: { kind: 'cp', value: 20 }, depth: 14 },
      ],
    };

    const model = buildReviewModel(blackGame);
    expect(model.playerColor).toBe('black');
    expect(model.botColor).toBe('white');

    // Starting position: White is 52.4%, so Black (Player) is ~47.6%
    expect(model.evalGraphPoints[0].playerWinProb).toBeCloseTo(100 - model.evalGraphPoints[0].whiteWinProb, 1);
    expect(model.evalGraphPoints[0].scoreDisplay).toBe('+0.2');

    // Terminal move (resignation): graph preserves the real engine position evaluation (~48.2% for Black)
    expect(model.evalGraphPoints[2].whiteWinProb).toBeCloseTo(51.8, 1);
    expect(model.evalGraphPoints[2].playerWinProb).toBeCloseTo(48.2, 1);
    expect(model.classifiedMoves[1].playerWinProb).toBeCloseTo(48.2, 1);
    expect(model.evalGraphPoints[2].scoreDisplay).toBe('+0.2');
  });

  it('builds slipSummary with classified replies and verdicts for slip mode games', () => {
    const slipGame: SavedGame = {
      version: 1,
      id: 'slip-game-1',
      mode: 'slip',
      startedAt: '2026-10-05T12:00:00Z',
      config: {
        mode: 'slip',
        playerColor: 'white',
        elo: 1500,
        botDelay: false,
        severity: 'blunder',
        frequency: 'frequent',
      },
      result: '1-0',
      resultReason: 'checkmate',
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O g5 5. Nxg5',
      tags: [
        { ply: 1, fenBefore: 'fen0', san: 'e4', by: 'player' },
        { ply: 2, fenBefore: 'fen1', san: 'e5', by: 'bot' },
        { ply: 3, fenBefore: 'fen2', san: 'Nf3', by: 'player' },
        { ply: 4, fenBefore: 'fen3', san: 'Nc6', by: 'bot' },
        { ply: 5, fenBefore: 'fen4', san: 'Bc4', by: 'player' },
        { ply: 6, fenBefore: 'fen5', san: 'Bc5', by: 'bot' },
        { ply: 7, fenBefore: 'fen6', san: 'O-O', by: 'player' },
        {
          ply: 8,
          fenBefore: 'fen7',
          san: 'g5',
          by: 'bot',
          slip: {
            requestedSeverity: 'blunder',
            measuredDrop: 28.5,
            measuredSeverity: 'blunder',
            fallbackUsed: 'none',
            rankPlayed: 4,
          },
        },
        { ply: 9, fenBefore: 'fen8', san: 'Nxg5', by: 'player' },
      ],
      analysis: [
        { ply: 0, score: { kind: 'cp', value: 0 }, depth: 14 },
        { ply: 1, score: { kind: 'cp', value: 0 }, depth: 14 },
        { ply: 2, score: { kind: 'cp', value: 0 }, depth: 14 },
        { ply: 3, score: { kind: 'cp', value: 0 }, depth: 14 },
        { ply: 4, score: { kind: 'cp', value: 0 }, depth: 14 },
        { ply: 5, score: { kind: 'cp', value: 0 }, depth: 14 },
        { ply: 6, score: { kind: 'cp', value: 0 }, depth: 14 },
        { ply: 7, score: { kind: 'cp', value: 0 }, depth: 14 }, // u0: equal (White win prob = 50%)
        { ply: 8, score: { kind: 'cp', value: 300 }, depth: 14 }, // Black plays g5: White to move, White +300cp (White win prob ~78%, uBest = 78%)
        { ply: 9, score: { kind: 'cp', value: -300 }, depth: 14 }, // White plays Nxg5: Black to move, White +300cp (uReply = 78%) -> capitalized!
      ],
    };

    const model = buildReviewModel(slipGame);

    expect(model.slipSummary).toBeDefined();
    expect(model.slipSummary?.totalSlips).toBe(1);
    expect(model.slipSummary?.capitalized).toBe(1);
    expect(model.slipSummary?.missed).toBe(0);
    expect(model.slipSummary?.squandered).toBe(0);

    const slipItem = model.slipSummary?.items[0];
    expect(slipItem?.ply).toBe(8);
    expect(slipItem?.moveNumber).toBe(4);
    expect(slipItem?.san).toBe('g5');
    expect(slipItem?.tag.requestedSeverity).toBe('blunder');
    expect(slipItem?.tag.measuredDrop).toBe(28.5);
    expect(slipItem?.tag.fallbackUsed).toBe('none');
    expect(slipItem?.playerReply?.san).toBe('Nxg5');
    expect(slipItem?.verdict).toBe('capitalized');

    // Eval graph has the slip marker
    expect(model.evalGraphPoints.find((p) => p.ply === 8)?.slip).toBeDefined();
  });

  it('correctly classifies terminal checkmate move (#) with 100% accuracy and proper winner score', () => {
    const mateGame: SavedGame = {
      version: 1,
      id: 'mate-game',
      mode: 'standard',
      startedAt: '2026-10-05T12:00:00Z',
      config: {
        mode: 'standard',
        playerColor: 'white',
        elo: 1500,
        botDelay: false,
      },
      result: '0-1',
      resultReason: 'Checkmate — Black wins',
      pgn: '1. f3 e5 2. g4 Qh4#',
      tags: [
        { ply: 1, fenBefore: 'start', san: 'f3', by: 'player' },
        { ply: 2, fenBefore: 'fen1', san: 'e5', by: 'bot' },
        { ply: 3, fenBefore: 'fen2', san: 'g4', by: 'player' },
        { ply: 4, fenBefore: 'fen3', san: 'Qh4#', by: 'bot' },
      ],
      analysis: [
        { ply: 0, score: { kind: 'cp', value: 20 }, depth: 14 },
        { ply: 1, score: { kind: 'cp', value: 15 }, depth: 14 },
        { ply: 2, score: { kind: 'cp', value: 20 }, depth: 14 },
        { ply: 3, score: { kind: 'mate', value: 1 }, depth: 14 }, // Black to move, mate in 1
        { ply: 4, score: { kind: 'mate', value: 0 }, depth: 14 }, // Terminal checkmate
      ],
    };

    const model = buildReviewModel(mateGame);
    const mateMove = model.classifiedMoves[3];
    expect(mateMove.san).toBe('Qh4#');
    expect(mateMove.color).toBe('black');
    expect(mateMove.score).toBe(-10);
    expect(mateMove.scoreDisplay).toBe('-#');
    expect(mateMove.whiteWinProb).toBe(0);
    expect(mateMove.playerWinProb).toBe(0);
    expect(mateMove.classification?.quality).toBe('good');
    expect(mateMove.classification?.drop).toBe(0);
    expect(mateMove.accuracy).toBe(100);

    const lastGraphPoint = model.evalGraphPoints[model.evalGraphPoints.length - 1];
    expect(lastGraphPoint.ply).toBe(4);
    expect(lastGraphPoint.score).toBe(-10);
    expect(lastGraphPoint.scoreDisplay).toBe('-#');
  });

  it('runs buildReviewModel on user 117-move game and prints endgame moves scoreDisplay', () => {
    const { Chess } = require('chess.js');
    const moves = [
      'e4','c6','d4','Nf6','e5','Ng8','Nf3','d5','exd6','Nf6','dxe7','Qxe7+','Qe2','h6','Nc3','Qxe2+','Bxe2','Be6','O-O','Be7','Re1','Na6','a4','Nb4','Na2','a5','Nxb4','Bxb4','c3','Be7','c4','b6','d5','Bd7','dxc6','h5','cxd7+','Nxd7','c5','Nxc5','b4','axb4','Bb2','O-O-O','Bxg7','Rhf8','Bxf8','Bxf8','Rec1','Bh6','Rc2','b3','Rc3','Kb7','a5','Bg7','Rc4','Bxa1','axb6','Re8','Rxc5','Re6','h4','Rxe2','Rxh5','Kxb6','Rh6+','Kb5','Rh5+','Re5','Rxe5+','Bxe5','Nd2','Kc5','Nxb3+','Kd6','h5','Kd5','h6','Bd6','h7','Be5','f4','Bc3','Nd2','Ke6','Ne4','Ba1','g4','f6','Nxf6','Bxf6','g5','Bc3','Kg2','Bd4','Kf3','Kf5','Kg3','Bf6','gxf6','Kxf6','h8=Q+','Ke7','Qe5+','Kd7','f5','Kc8','f6','Kd7','f7','Kc8','f8=Q+','Kb7','Qb5+','Ka7','Qfb8#'
    ];
    const chess = new Chess();
    const tags = [];
    for (let i = 0; i < moves.length; i++) {
      const fenBefore = chess.fen();
      const m = chess.move(moves[i]);
      tags.push({
        ply: i + 1,
        fenBefore,
        san: m.san,
        by: (i % 2 === 0 ? 'player' : 'bot') as 'player' | 'bot',
      });
    }

    // Build analysis matching our actual Stockfish evals:
    const analysis = [
      { ply: 0, score: { kind: 'cp', value: 20 }, depth: 12 },
    ];
    for (let i = 1; i <= 102; i++) {
      analysis.push({ ply: i, score: { kind: 'cp', value: 0 }, depth: 12 });
    }
    // Plies 103 to 117 from our actual Stockfish test:
    analysis.push({ ply: 103, score: { kind: 'cp', value: -3667 }, depth: 12 }); // Black to move
    analysis.push({ ply: 104, score: { kind: 'cp', value: 4265 }, depth: 12 });  // White to move
    analysis.push({ ply: 105, score: { kind: 'cp', value: -4301 }, depth: 12 }); // Black to move
    analysis.push({ ply: 106, score: { kind: 'cp', value: 4284 }, depth: 12 });  // White to move
    analysis.push({ ply: 107, score: { kind: 'mate', value: -7 }, depth: 12 });  // Black to move
    analysis.push({ ply: 108, score: { kind: 'mate', value: 7 }, depth: 12 });   // White to move
    analysis.push({ ply: 109, score: { kind: 'mate', value: -5 }, depth: 12 });  // Black to move
    analysis.push({ ply: 110, score: { kind: 'mate', value: 4 }, depth: 12 });   // White to move
    analysis.push({ ply: 111, score: { kind: 'mate', value: -3 }, depth: 12 });  // Black to move
    analysis.push({ ply: 112, score: { kind: 'mate', value: 3 }, depth: 12 });   // White to move
    analysis.push({ ply: 113, score: { kind: 'mate', value: -2 }, depth: 12 });  // Black to move
    analysis.push({ ply: 114, score: { kind: 'mate', value: 2 }, depth: 12 });   // White to move
    analysis.push({ ply: 115, score: { kind: 'mate', value: -1 }, depth: 12 });  // Black to move
    analysis.push({ ply: 116, score: { kind: 'mate', value: 1 }, depth: 12 });   // White to move
    analysis.push({ ply: 117, score: { kind: 'mate', value: 0 }, depth: 12 });   // Checkmate

    const game: SavedGame = {
      version: 1,
      id: 'test-user-game',
      mode: 'standard',
      startedAt: '2026-10-05T12:00:00Z',
      config: {
        mode: 'standard',
        playerColor: 'white',
        elo: 1500,
        botDelay: false,
      },
      result: '1-0',
      resultReason: 'Checkmate — White wins',
      pgn: chess.pgn(),
      tags,
      analysis,
    };

    const model = buildReviewModel(game);
    const endgameMoves = model.classifiedMoves.slice(102);
    for (const m of endgameMoves) {
      console.log(`PLY ${m.ply} (${m.san}): scoreDisplay = ${m.scoreDisplay}`);
    }

    // Move 103 (h8=Q+): White promotes Queen
    expect(model.classifiedMoves[102].scoreDisplay).toBe('+36.7');
    expect(model.classifiedMoves[102].classification?.quality).toBe('good');

    // Move 107 (f5): Mate in 7 for White
    expect(model.classifiedMoves[106].scoreDisplay).toBe('+M7');
    expect(model.classifiedMoves[106].classification?.quality).toBe('good');

    // Move 113 (f8=Q+): Mate in 2 for White
    expect(model.classifiedMoves[112].scoreDisplay).toBe('+M2');
    expect(model.classifiedMoves[112].classification?.quality).toBe('good');

    // Move 116 (Ka7): Mate in 1 for White
    expect(model.classifiedMoves[115].scoreDisplay).toBe('+M1');

    // Move 117 (Qfb8#): Terminal checkmate
    expect(model.classifiedMoves[116].scoreDisplay).toBe('#');
    expect(model.classifiedMoves[116].classification?.quality).toBe('good');

    // All endgame points in graph must be positive (+10 for mate, White win)
    const endgamePoints = model.evalGraphPoints.slice(103);
    for (const pt of endgamePoints) {
      expect(pt.score).toBeGreaterThan(0);
      expect(pt.scoreDisplay).not.toContain('-');
    }
  });

  it('correctly handles mate sequence where White forces mate against Black', () => {
    // Game where White has forced mate in 2, then mates
    // Ply 0: Start
    // Ply 1: White 1. e4
    // Ply 2: Black 1... f5 (blunder)
    // Ply 3: White 2. exf5
    // Ply 4: Black 2... g5 (blunder: White has mate in 1 with Qh5#)
    // Ply 5: White 3. Qh5#
    const whiteMateGame: SavedGame = {
      version: 1,
      id: 'white-mate-game',
      mode: 'standard',
      startedAt: '2026-10-05T12:00:00Z',
      config: {
        mode: 'standard',
        playerColor: 'white',
        elo: 1500,
        botDelay: false,
      },
      result: '1-0',
      resultReason: 'Checkmate — White wins',
      pgn: '1. e4 f5 2. exf5 g5 3. Qh5#',
      tags: [
        { ply: 1, fenBefore: 'start', san: 'e4', by: 'player' },
        { ply: 2, fenBefore: 'fen1', san: 'f5', by: 'bot' },
        { ply: 3, fenBefore: 'fen2', san: 'exf5', by: 'player' },
        { ply: 4, fenBefore: 'fen3', san: 'g5', by: 'bot' },
        { ply: 5, fenBefore: 'fen4', san: 'Qh5#', by: 'player' },
      ],
      analysis: [
        { ply: 0, score: { kind: 'cp', value: 20 }, depth: 14 },
        { ply: 1, score: { kind: 'cp', value: -18 }, depth: 14 },
        { ply: 2, score: { kind: 'cp', value: 150 }, depth: 14 },
        { ply: 3, score: { kind: 'cp', value: -150 }, depth: 14 },
        // After 2... g5 (ply 4): White to move. White has mate in 1 (Qh5#).
        // Side to move is White. Stockfish returns mate +1!
        { ply: 4, score: { kind: 'mate', value: 1 }, depth: 14 },
        // After 3. Qh5# (ply 5): Checkmate.
        { ply: 5, score: { kind: 'mate', value: 0 }, depth: 14 },
      ],
    };

    const model = buildReviewModel(whiteMateGame);
    // At ply 4 (Black played g5), White has mate in 1:
    const g5Move = model.classifiedMoves[3];
    console.log('PLY 4 (g5) scoreDisplay:', g5Move.scoreDisplay);
    console.log('PLY 4 (g5) score:', g5Move.score);
    expect(g5Move.scoreDisplay).toBe('+M1');

    // At ply 5 (White played Qh5#):
    const qh5Move = model.classifiedMoves[4];
    console.log('PLY 5 (Qh5#) scoreDisplay:', qh5Move.scoreDisplay);
    console.log('PLY 5 (Qh5#) score:', qh5Move.score);
    expect(qh5Move.scoreDisplay).toBe('#');
  });
});
