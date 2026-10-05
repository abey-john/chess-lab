import { describe, expect, it } from 'vitest';
import { calculateMoveAccuracy, calculateSideAccuracy } from '../../src/logic/accuracy';

describe('accuracy logic', () => {
  it('calculates move accuracy with formula from plan', () => {
    // 0 drop = 100% accuracy
    expect(calculateMoveAccuracy(0)).toBe(100);
    expect(calculateMoveAccuracy(-2)).toBe(100);

    // Moderate drop
    const acc5 = calculateMoveAccuracy(5);
    expect(acc5).toBeGreaterThan(70);
    expect(acc5).toBeLessThan(90);

    // Large blunder
    const acc50 = calculateMoveAccuracy(50);
    expect(acc50).toBeLessThan(15);
    expect(acc50).toBeGreaterThanOrEqual(0);

    // Extreme drop clamped to 0
    expect(calculateMoveAccuracy(100)).toBe(0);
  });

  it('calculates side average accuracy', () => {
    expect(calculateSideAccuracy([])).toBe(100);
    expect(calculateSideAccuracy([100, 100, 100])).toBe(100);
    expect(calculateSideAccuracy([80, 90])).toBe(85);
    expect(calculateSideAccuracy([75.5, 82.3])).toBeCloseTo(78.9, 1);
  });
});
