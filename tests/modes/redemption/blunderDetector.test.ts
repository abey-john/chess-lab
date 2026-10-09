import { describe, it, expect } from 'vitest';
import type { EngineService, EvalScore } from '../../../src/engine/types';
import { checkMoveForBlunder } from '../../../src/modes/redemption/blunderDetector';

describe('blunderDetector', () => {
  function createMockEngine(scores: EvalScore[]): EngineService {
    let callIdx = 0;
    return {
      getBotMove: async () => 'e2e4',
      getCandidates: async () => [],
      evaluate: async () => {
        const score = scores[callIdx++] ?? { kind: 'cp', value: 0 };
        return { score, depth: 10 };
      },
      stop: () => {},
      dispose: () => {},
    };
  }

  it('detects a blunder when win probability drops by >= 20%', async () => {
    // Before move: equal position (+0 cp -> ~50% win prob)
    // After move: opponent has huge advantage (+500 cp from opponent perspective -> opponent has ~99% win prob, so moving side has ~1% win prob)
    // Drop is ~49 percentage points >= 20%
    const mockEngine = createMockEngine([
      { kind: 'cp', value: 0 },
      { kind: 'cp', value: 500 },
    ]);

    const result = await checkMoveForBlunder(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      mockEngine
    );

    expect(result.isBlunder).toBe(true);
    expect(result.quality).toBe('blunder');
    expect(result.drop).toBeGreaterThanOrEqual(20);
  });

  it('detects mate-in-1 blunder', async () => {
    // Before move: White is fine (+100 cp -> ~60% win prob)
    // After move: Opponent has mate in 1 (mate: 1 from opponent perspective -> opponent has 100% win prob)
    const mockEngine = createMockEngine([
      { kind: 'cp', value: 100 },
      { kind: 'mate', value: 1 },
    ]);

    const result = await checkMoveForBlunder(
      'fenBefore',
      'fenAfter',
      mockEngine
    );

    expect(result.isBlunder).toBe(true);
    expect(result.quality).toBe('blunder');
    expect(result.drop).toBeGreaterThanOrEqual(50);
  });

  it('does not flag a solid or good move as a blunder', async () => {
    // Before move: +50 cp (~56% win prob)
    // After move: -20 cp from opponent perspective -> moving side is +20 cp (~52% win prob)
    // Drop is ~4 percentage points -> 'good'
    const mockEngine = createMockEngine([
      { kind: 'cp', value: 50 },
      { kind: 'cp', value: -20 },
    ]);

    const result = await checkMoveForBlunder(
      'fenBefore',
      'fenAfter',
      mockEngine
    );

    expect(result.isBlunder).toBe(false);
    expect(result.quality).toBe('good');
    expect(result.drop).toBeLessThan(5);
  });

  it('uses cachedBeforeScore when provided and avoids first evaluate call', async () => {
    // Only 1 score needed for after move
    const mockEngine = createMockEngine([
      { kind: 'cp', value: 600 },
    ]);

    const cachedBefore: EvalScore = { kind: 'cp', value: 0 };
    const result = await checkMoveForBlunder(
      'fenBefore',
      'fenAfter',
      mockEngine,
      cachedBefore
    );

    expect(result.isBlunder).toBe(true);
    expect(result.beforeScore).toEqual(cachedBefore);
  });
});
