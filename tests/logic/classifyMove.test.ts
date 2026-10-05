import { describe, expect, it } from 'vitest';
import { classifyMove, getQualityForDrop } from '../../src/logic/classifyMove';

describe('classifyMove logic', () => {
  it('correctly maps severity bands at boundaries', () => {
    expect(getQualityForDrop(0)).toBe('good');
    expect(getQualityForDrop(4.999)).toBe('good');
    expect(getQualityForDrop(5.0)).toBe('inaccuracy');
    expect(getQualityForDrop(7.5)).toBe('inaccuracy');
    expect(getQualityForDrop(9.999)).toBe('inaccuracy');
    expect(getQualityForDrop(10.0)).toBe('mistake');
    expect(getQualityForDrop(15.0)).toBe('mistake');
    expect(getQualityForDrop(19.999)).toBe('mistake');
    expect(getQualityForDrop(20.0)).toBe('blunder');
    expect(getQualityForDrop(45.0)).toBe('blunder');
  });

  it('correctly handles perspective flipping between moves', () => {
    // White is to move and eval is +100 cp (White win% ~59.1%).
    // White plays the best move. After the move, Black is to move and eval is -100 cp (from Black's perspective).
    // Black's win% is ~40.9%, so White's win% after move is 100 - 40.9% = 59.1%.
    // Drop should be ~0, quality should be 'good'.
    const goodMove = classifyMove(
      { kind: 'cp', value: 100 },
      { kind: 'cp', value: -100 }
    );
    expect(goodMove.drop).toBeCloseTo(0, 1);
    expect(goodMove.quality).toBe('good');

    // Moving side blunders:
    // Before move: +300 cp (win% ~75%)
    // After move: Opponent is to move and has +300 cp (win% ~75% for opponent -> moving side win% 25%)
    // Win% drop: ~50 points -> blunder
    const blunderMove = classifyMove(
      { kind: 'cp', value: 300 },
      { kind: 'cp', value: 300 }
    );
    expect(blunderMove.drop).toBeGreaterThan(40);
    expect(blunderMove.quality).toBe('blunder');
  });

  it('clamps negative drop to 0 if position somehow improved', () => {
    // If before was 0 cp (50%) and after was -200 cp for opponent (opp has 32%, moving side has 68%)
    const improved = classifyMove(
      { kind: 'cp', value: 0 },
      { kind: 'cp', value: -200 }
    );
    expect(improved.drop).toBe(0);
    expect(improved.quality).toBe('good');
  });
});
