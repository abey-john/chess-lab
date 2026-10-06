import { describe, expect, it } from 'vitest';
import {
  initSlipScheduler,
  onSlipDeferred,
  onSlipPlayed,
  sampleRange,
  shouldAttemptSlip,
  stepNormalMove,
} from '../../../src/modes/slip/scheduler';

describe('slip scheduler', () => {
  it('sampleRange generates inclusive values within bounds', () => {
    expect(sampleRange(5, 8, () => 0)).toBe(5);
    expect(sampleRange(5, 8, () => 0.99)).toBe(8);
    expect(sampleRange(5, 8, () => 0.5)).toBe(7);
  });

  it('initSlipScheduler initializes state with configured frequency', () => {
    const rareState = initSlipScheduler('rare', () => 0); // 9-14
    expect(rareState.botMovesUntilSlip).toBe(9);
    expect(rareState.consecutiveDeferrals).toBe(0);
    expect(rareState.botMoveCount).toBe(0);

    const frequentState = initSlipScheduler('frequent', () => 0.99); // 3-4
    expect(frequentState.botMovesUntilSlip).toBe(4);
  });

  it('stepNormalMove decrements countdown and increments botMoveCount', () => {
    let state = { botMovesUntilSlip: 3, consecutiveDeferrals: 0, botMoveCount: 0 };

    expect(shouldAttemptSlip(state)).toBe(false);
    state = stepNormalMove(state);
    expect(state.botMovesUntilSlip).toBe(2);
    expect(state.botMoveCount).toBe(1);

    state = stepNormalMove(state);
    state = stepNormalMove(state);
    expect(state.botMovesUntilSlip).toBe(0);
    expect(shouldAttemptSlip(state)).toBe(true);
  });

  it('onSlipPlayed resets countdown and resets consecutive deferrals', () => {
    const state = { botMovesUntilSlip: 0, consecutiveDeferrals: 2, botMoveCount: 8 };
    const next = onSlipPlayed(state, 'sometimes', () => 0); // 5-8
    expect(next.botMovesUntilSlip).toBe(5);
    expect(next.consecutiveDeferrals).toBe(0);
    expect(next.botMoveCount).toBe(9);
  });

  it('onSlipDeferred handles opening grace period without incrementing deferral cap', () => {
    const state = { botMovesUntilSlip: 0, consecutiveDeferrals: 0, botMoveCount: 2 };
    const next = onSlipDeferred(state, 'opening', 'sometimes', () => 0);

    expect(next.botMovesUntilSlip).toBe(0);
    expect(next.consecutiveDeferrals).toBe(0);
    expect(next.botMoveCount).toBe(3);
  });

  it('onSlipDeferred increments deferral count and resets when reaching cap of 3', () => {
    let state = { botMovesUntilSlip: 0, consecutiveDeferrals: 0, botMoveCount: 7 };

    // Deferral 1
    state = onSlipDeferred(state, 'forced', 'sometimes', () => 0);
    expect(state.botMovesUntilSlip).toBe(0);
    expect(state.consecutiveDeferrals).toBe(1);

    // Deferral 2
    state = onSlipDeferred(state, 'decided', 'sometimes', () => 0);
    expect(state.botMovesUntilSlip).toBe(0);
    expect(state.consecutiveDeferrals).toBe(2);

    // Deferral 3 (Cap reached -> resets countdown!)
    state = onSlipDeferred(state, 'no-candidate', 'sometimes', () => 0); // 5-8
    expect(state.botMovesUntilSlip).toBe(5);
    expect(state.consecutiveDeferrals).toBe(0);
    expect(state.botMoveCount).toBe(10);
  });
});
