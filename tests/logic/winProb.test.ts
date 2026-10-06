import { describe, expect, it } from 'vitest';
import {
  evalScoreToCp,
  evalScoreToWhiteCp,
  evalScoreToWhiteWinProb,
  evalScoreToWinProb,
  formatWhiteScore,
  winPctFromCp,
} from '../../src/logic/winProb';

describe('winProb logic', () => {
  it('calculates win percentage accurately at known centipawn values', () => {
    // At 0 cp, win percentage must be exactly 50%
    expect(winPctFromCp(0)).toBeCloseTo(50.0, 5);

    // Positive centipawns favor side to move
    const win100 = winPctFromCp(100);
    expect(win100).toBeGreaterThan(50);
    // 50 + 50 * (2 / (1 + exp(-0.00368208 * 100)) - 1)
    // -0.368208 -> exp is ~0.691976 -> 2 / 1.691976 = 1.18205 -> -1 = 0.18205 -> 50 + 50*0.18205 = 59.1%
    expect(win100).toBeCloseTo(59.1, 1);

    // Negative centipawns are symmetrical
    const winNeg100 = winPctFromCp(-100);
    expect(winNeg100).toBeCloseTo(100 - win100, 5);

    // Large centipawns approach bounds
    expect(winPctFromCp(5000)).toBeGreaterThan(99.9);
    expect(winPctFromCp(-5000)).toBeLessThan(0.1);
  });

  it('maps mate scores to +/- 10000 cp equivalents', () => {
    expect(evalScoreToCp({ kind: 'cp', value: 150 })).toBe(150);
    expect(evalScoreToCp({ kind: 'mate', value: 3 })).toBe(10000);
    expect(evalScoreToCp({ kind: 'mate', value: 1 })).toBe(10000);
    expect(evalScoreToCp({ kind: 'mate', value: 0 })).toBe(-10000);
    expect(evalScoreToCp({ kind: 'mate', value: -1 })).toBe(-10000);
    expect(evalScoreToCp({ kind: 'mate', value: -5 })).toBe(-10000);

    expect(evalScoreToWinProb({ kind: 'mate', value: 1 })).toBeCloseTo(100, 1);
    expect(evalScoreToWinProb({ kind: 'mate', value: 0 })).toBeCloseTo(0, 1);
    expect(evalScoreToWinProb({ kind: 'mate', value: -1 })).toBeCloseTo(0, 1);
  });

  it('converts to White win percentage correctly based on side to move', () => {
    // When White is to move with +100 cp for the side to move (White advantage)
    expect(evalScoreToWhiteWinProb({ kind: 'cp', value: 100 }, 'white')).toBeCloseTo(59.1, 1);

    // When Black is to move with +100 cp for the side to move (Black advantage -> White is at 40.9%)
    expect(evalScoreToWhiteWinProb({ kind: 'cp', value: 100 }, 'black')).toBeCloseTo(40.9, 1);

    // Mate in 1 for White (White to move)
    expect(evalScoreToWhiteWinProb({ kind: 'mate', value: 1 }, 'white')).toBeCloseTo(100, 1);

    // Mate in 1 for Black (Black to move)
    expect(evalScoreToWhiteWinProb({ kind: 'mate', value: 1 }, 'black')).toBeCloseTo(0, 1);
  });

  it('formats scores from White perspective with + for White, - for Black, and 0.0 for even', () => {
    // evalScoreToWhiteCp
    expect(evalScoreToWhiteCp({ kind: 'cp', value: 150 }, 'white')).toBe(150);
    expect(evalScoreToWhiteCp({ kind: 'cp', value: 150 }, 'black')).toBe(-150);

    // Even position
    expect(formatWhiteScore({ kind: 'cp', value: 0 }, 'white')).toEqual({
      score: 0,
      display: '0.0',
      isMate: false,
    });

    // White advantage (+1.5 pawns when White is to move with +150 cp)
    expect(formatWhiteScore({ kind: 'cp', value: 150 }, 'white')).toEqual({
      score: 1.5,
      display: '+1.5',
      isMate: false,
    });

    // Black advantage (+1.5 pawns for Black when Black is to move with +150 cp -> -1.5 for White)
    expect(formatWhiteScore({ kind: 'cp', value: 150 }, 'black')).toEqual({
      score: -1.5,
      display: '-1.5',
      isMate: false,
    });

    // White delivering mate in 2 (White to move, mate 2)
    expect(formatWhiteScore({ kind: 'mate', value: 2 }, 'white')).toEqual({
      score: 10,
      display: '+M2',
      isMate: true,
    });

    // Black delivering mate in 3 (Black to move, mate 3)
    expect(formatWhiteScore({ kind: 'mate', value: 3 }, 'black')).toEqual({
      score: -10,
      display: '-M3',
      isMate: true,
    });

    // White delivered checkmate on board (Black has no moves and is mated: sideToMove black, value 0)
    expect(formatWhiteScore({ kind: 'mate', value: 0 }, 'black')).toEqual({
      score: 10,
      display: '#',
      isMate: true,
    });

    // Black delivered checkmate on board (White has no moves and is mated: sideToMove white, value 0)
    expect(formatWhiteScore({ kind: 'mate', value: 0 }, 'white')).toEqual({
      score: -10,
      display: '-#',
      isMate: true,
    });

    // Score clamping beyond ±10 pawns
    expect(formatWhiteScore({ kind: 'cp', value: 1500 }, 'white').score).toBe(10);
    expect(formatWhiteScore({ kind: 'cp', value: -1500 }, 'white').score).toBe(-10);
  });
});
