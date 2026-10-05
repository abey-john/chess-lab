import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { checkGameOver, getLegalDests, isPromotionMove } from '../../src/game/chessRules';

describe('chessRules', () => {
  it('generates correct legal destinations for starting position', () => {
    const chess = new Chess();
    const dests = getLegalDests(chess);

    // 16 pawn moves (a3, a4, b3, b4...) + 4 knight moves (Na3, Nc3, Nf3, Nh3) = 20 legal moves
    let totalMoves = 0;
    for (const targets of dests.values()) {
      totalMoves += targets.length;
    }
    expect(totalMoves).toBe(20);
    expect(dests.get('e2')).toEqual(['e3', 'e4']);
    expect(dests.get('g1')).toEqual(['f3', 'h3']);
  });

  it('detects pawn promotion moves accurately', () => {
    const chess = new Chess('8/4P3/8/8/8/8/8/4K2k w - - 0 1');
    expect(isPromotionMove(chess, 'e7', 'e8')).toBe(true);
    expect(isPromotionMove(chess, 'e7', 'e6')).toBe(false);

    const blackPromoChess = new Chess('4K2k/8/8/8/8/8/4p3/8 b - - 0 1');
    expect(isPromotionMove(blackPromoChess, 'e2', 'e1')).toBe(true);
  });

  it('detects checkmate', () => {
    // Fool's mate: 1. f3 e5 2. g4 Qh4#
    const chess = new Chess();
    chess.move('f3');
    chess.move('e5');
    chess.move('g4');
    chess.move('Qh4');

    const status = checkGameOver(chess);
    expect(status.isOver).toBe(true);
    expect(status.result).toBe('0-1');
    expect(status.reason).toContain('Checkmate — Black wins');
  });

  it('detects stalemate', () => {
    // Known stalemate position: King on a8 vs King on c7 and Queen on b6
    const chess = new Chess('k7/2K5/1Q6/8/8/8/8/8 b - - 0 1');
    const status = checkGameOver(chess);
    expect(status.isOver).toBe(true);
    expect(status.result).toBe('1/2-1/2');
    expect(status.reason).toBe('Draw by stalemate');
  });

  it('detects threefold repetition', () => {
    const chess = new Chess();
    chess.move('Nf3');
    chess.move('Nf6');
    chess.move('Ng1');
    chess.move('Ng8');
    chess.move('Nf3');
    chess.move('Nf6');
    chess.move('Ng1');
    chess.move('Ng8');

    const status = checkGameOver(chess);
    expect(status.isOver).toBe(true);
    expect(status.result).toBe('1/2-1/2');
    expect(status.reason).toBe('Draw by threefold repetition');
  });

  it('detects insufficient material', () => {
    const chess = new Chess('8/8/8/4k3/8/8/8/4K3 w - - 0 1'); // K vs K
    const status = checkGameOver(chess);
    expect(status.isOver).toBe(true);
    expect(status.result).toBe('1/2-1/2');
    expect(status.reason).toBe('Draw by insufficient material');
  });
});
