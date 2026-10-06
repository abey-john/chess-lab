import { describe, expect, it } from 'vitest';
import { classifyReply } from '../../../src/modes/slip/classifyReply';

describe('classifyReply', () => {
  it('returns n/a when no reply is played', () => {
    expect(classifyReply(50, 70, null)).toBe('n/a');
  });

  it('returns n/a when theoretical gain is below MIN_MEANINGFUL_GAIN (3%)', () => {
    // Slip only gave player a 1% advantage
    expect(classifyReply(50, 51.5, 51.5)).toBe('n/a');
  });

  it('returns capitalized when player captures advantage within tolerance', () => {
    // Before slip: 40%, After slip (best): 60%
    // Player reply gives: 58% (loss vs optimum is 2% <= 3% tolerance)
    expect(classifyReply(40, 60, 58)).toBe('capitalized');
    expect(classifyReply(40, 60, 60)).toBe('capitalized');
  });

  it('returns squandered when player fails to capitalize and finishes worse than u0', () => {
    // Before slip: 40%, After slip (best): 60%
    // Player reply blunders back: 35% (< 40%)
    expect(classifyReply(40, 60, 35)).toBe('squandered');
  });

  it('returns missed when player does not capitalize but remains at or above u0', () => {
    // Before slip: 40%, After slip (best): 60%
    // Player reply gives: 45% (didn't capitalize, but didn't drop below 40%)
    expect(classifyReply(40, 60, 45)).toBe('missed');
  });
});
