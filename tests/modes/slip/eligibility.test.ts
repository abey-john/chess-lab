import { describe, expect, it } from 'vitest';
import type { Candidate } from '../../../src/engine/types';
import {
  checkPostSearchEligibility,
  checkPreSearchEligibility,
} from '../../../src/modes/slip/eligibility';

describe('slip eligibility', () => {
  it('checkPreSearchEligibility defers during opening grace period', () => {
    expect(checkPreSearchEligibility(0, 20)).toEqual({ eligible: false, reason: 'opening' });
    expect(checkPreSearchEligibility(5, 20)).toEqual({ eligible: false, reason: 'opening' });
    expect(checkPreSearchEligibility(6, 20)).toEqual({ eligible: true });
  });

  it('checkPreSearchEligibility defers forced positions with < 3 legal moves', () => {
    expect(checkPreSearchEligibility(7, 2)).toEqual({ eligible: false, reason: 'forced' });
    expect(checkPreSearchEligibility(7, 1)).toEqual({ eligible: false, reason: 'forced' });
    expect(checkPreSearchEligibility(7, 3)).toEqual({ eligible: true });
  });

  it('checkPostSearchEligibility defers if candidate count < 3', () => {
    const candidates: Candidate[] = [
      { move: 'e2e4', rank: 1, score: { kind: 'cp', value: 30 } },
      { move: 'd2d4', rank: 2, score: { kind: 'cp', value: 20 } },
    ];
    expect(checkPostSearchEligibility(candidates)).toEqual({ eligible: false, reason: 'forced' });
  });

  it('checkPostSearchEligibility defers if position is decided (> 90% or < 10% win rate)', () => {
    // Overwhelming winning position (+800 cp -> ~99% win)
    const winningCandidates: Candidate[] = [
      { move: 'e2e4', rank: 1, score: { kind: 'cp', value: 800 } },
      { move: 'd2d4', rank: 2, score: { kind: 'cp', value: 750 } },
      { move: 'c2c4', rank: 3, score: { kind: 'cp', value: 700 } },
    ];
    expect(checkPostSearchEligibility(winningCandidates)).toEqual({
      eligible: false,
      reason: 'decided',
    });

    // Overwhelming losing position (-800 cp -> ~1% win)
    const losingCandidates: Candidate[] = [
      { move: 'e2e4', rank: 1, score: { kind: 'cp', value: -800 } },
      { move: 'd2d4', rank: 2, score: { kind: 'cp', value: -820 } },
      { move: 'c2c4', rank: 3, score: { kind: 'cp', value: -850 } },
    ];
    expect(checkPostSearchEligibility(losingCandidates)).toEqual({
      eligible: false,
      reason: 'decided',
    });

    // Balanced game (+30 cp -> ~54% win)
    const balancedCandidates: Candidate[] = [
      { move: 'e2e4', rank: 1, score: { kind: 'cp', value: 30 } },
      { move: 'd2d4', rank: 2, score: { kind: 'cp', value: 25 } },
      { move: 'g1f3', rank: 3, score: { kind: 'cp', value: 20 } },
    ];
    expect(checkPostSearchEligibility(balancedCandidates)).toEqual({ eligible: true });
  });
});
