import { describe, expect, it } from 'vitest';
import {
  evalScoreToCp,
  evalScoreToWhiteWinProb,
  evalScoreToWinProb,
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
    expect(evalScoreToCp({ kind: 'mate', value: -1 })).toBe(-10000);
    expect(evalScoreToCp({ kind: 'mate', value: -5 })).toBe(-10000);

    expect(evalScoreToWinProb({ kind: 'mate', value: 1 })).toBeCloseTo(100, 1);
    expect(evalScoreToWinProb({ kind: 'mate', value: -1 })).toBeCloseTo(0, 1);
  });

  it('converts to White win percentage correctly based on side to move', () => {
    // Advantage +100 cp for White
    expect(evalScoreToWhiteWinProb({ kind: 'cp', value: 100 }, 'white')).toBeCloseTo(59.1, 1);

    // Advantage +100 cp for Black (means Black's win% is ~59.1%, so White's is ~40.9%)
    expect(evalScoreToWhiteWinProb({ kind: 'cp', value: 100 }, 'black')).toBeCloseTo(40.9, 1);

    // Mate in 1 for White
    expect(evalScoreToWhiteWinProb({ kind: 'mate', value: 1 }, 'white')).toBeCloseTo(100, 1);

    // Mate in 1 for Black
    expect(evalScoreToWhiteWinProb({ kind: 'mate', value: 1 }, 'black')).toBeCloseTo(0, 1);
  });
});
