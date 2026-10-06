import { describe, expect, it, vi } from 'vitest';
import type { EngineService } from '../../../src/engine/types';
import type { BotTurnContext, GameConfig } from '../../../src/game/types';
import { OPENING_GRACE_BOT_MOVES } from '../../../src/modes/slip/config';
import { SlipBotStrategy } from '../../../src/modes/slip/strategy';
import type { SlipStrategyState } from '../../../src/modes/slip/types';

describe('SlipBotStrategy', () => {
  const strategy = new SlipBotStrategy();

  const slipConfig: GameConfig = {
    mode: 'slip',
    playerColor: 'white',
    elo: 1500,
    botDelay: false,
    severity: 'mistake',
    frequency: 'sometimes',
  };

  const createMockEngine = (overrides?: Partial<EngineService>): EngineService => ({
    getBotMove: vi.fn().mockResolvedValue('g1f3'),
    getCandidates: vi.fn().mockResolvedValue([
      { rank: 1, move: 'e2e4', score: { kind: 'cp', value: 20 }, pv: ['e2e4'] },
      { rank: 2, move: 'd2d4', score: { kind: 'cp', value: 10 }, pv: ['d2d4'] },
      { rank: 3, move: 'g1f3', score: { kind: 'cp', value: -100 }, pv: ['g1f3'] },
    ]),
    evaluate: vi.fn().mockResolvedValue({ score: { kind: 'cp', value: 0 }, depth: 14 }),
    stop: vi.fn(),
    dispose: vi.fn(),
    ...overrides,
  });

  const createContext = (
    fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    engine = createMockEngine(),
    rng = () => 0.5
  ): BotTurnContext => ({
    fen,
    moves: [],
    config: slipConfig,
    engine,
    rng,
    gameId: 'test-game',
  });

  it('initializes scheduler state with frequency bounds', () => {
    // rng = 0.5 with 'sometimes' [5, 8] -> 5 + floor(0.5 * 4) = 7
    const state = strategy.init(slipConfig, () => 0.5);
    expect(state.botMovesUntilSlip).toBe(7);
    expect(state.consecutiveDeferrals).toBe(0);
    expect(state.botMoveCount).toBe(0);
  });

  it('plays normal move and decrements counter when botMovesUntilSlip > 0', async () => {
    const engine = createMockEngine({ getBotMove: vi.fn().mockResolvedValue('c2c4') });
    const ctx = createContext(undefined, engine);
    const state: SlipStrategyState = {
      botMovesUntilSlip: 3,
      consecutiveDeferrals: 0,
      botMoveCount: 1,
    };

    const { result, nextState } = await strategy.playTurn(ctx, state);

    expect(engine.getBotMove).toHaveBeenCalled();
    expect(engine.getCandidates).not.toHaveBeenCalled();
    expect(result.move).toBe('c2c4');
    expect(result.tag?.slip).toBeUndefined();
    expect(nextState.botMovesUntilSlip).toBe(2);
    expect(nextState.botMoveCount).toBe(2);
  });

  it('defers slip during opening grace period without counting against deferral cap', async () => {
    const engine = createMockEngine({ getBotMove: vi.fn().mockResolvedValue('e2e4') });
    const ctx = createContext(undefined, engine);
    const state: SlipStrategyState = {
      botMovesUntilSlip: 0,
      consecutiveDeferrals: 0,
      botMoveCount: 2, // Less than OPENING_GRACE_BOT_MOVES (6)
    };

    const { result, nextState } = await strategy.playTurn(ctx, state);

    expect(engine.getBotMove).toHaveBeenCalled();
    expect(engine.getCandidates).not.toHaveBeenCalled();
    expect(result.move).toBe('e2e4');
    expect(result.tag?.slip).toBeUndefined();
    // Opening deferral stays at 0 moves until slip, 0 deferrals counted
    expect(nextState.botMovesUntilSlip).toBe(0);
    expect(nextState.consecutiveDeferrals).toBe(0);
    expect(nextState.botMoveCount).toBe(3);
  });

  it('defers slip in forced position (< 3 legal moves) and increments deferrals', async () => {
    // Position with exactly 1 legal move: White Kh1 can only move to g1
    const forcedFen = '8/8/8/8/8/5k2/3q4/7K w - - 0 1';
    const engine = createMockEngine({ getBotMove: vi.fn().mockResolvedValue('h1g1') });
    const ctx = createContext(forcedFen, engine);
    const state: SlipStrategyState = {
      botMovesUntilSlip: 0,
      consecutiveDeferrals: 0,
      botMoveCount: OPENING_GRACE_BOT_MOVES + 1,
    };

    const { result, nextState } = await strategy.playTurn(ctx, state);

    expect(engine.getBotMove).toHaveBeenCalled();
    expect(engine.getCandidates).not.toHaveBeenCalled();
    expect(result.move).toBe('h1g1');
    expect(result.tag?.slip).toBeUndefined();
    expect(nextState.botMovesUntilSlip).toBe(0);
    expect(nextState.consecutiveDeferrals).toBe(1);
  });

  it('plays slip move and resets scheduler when eligible candidates exist', async () => {
    // Normal middle game position
    const fen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5';
    // Best move cp 30 (~54%), candidate 3 cp -150 (~32% -> drop ~22% which is blunder/mistake)
    const engine = createMockEngine({
      getCandidates: vi.fn().mockResolvedValue([
        { rank: 1, move: 'd2d3', score: { kind: 'cp', value: 30 }, pv: ['d2d3'] },
        { rank: 2, move: 'e1g1', score: { kind: 'cp', value: 25 }, pv: ['e1g1'] },
        { rank: 3, move: 'c4f7', score: { kind: 'cp', value: -120 }, pv: ['c4f7'] },
      ]),
    });

    const ctx = createContext(fen, engine, () => 0.1);
    const state: SlipStrategyState = {
      botMovesUntilSlip: 0,
      consecutiveDeferrals: 1,
      botMoveCount: OPENING_GRACE_BOT_MOVES + 2,
    };

    const { result, nextState } = await strategy.playTurn(ctx, state);

    expect(engine.getCandidates).toHaveBeenCalled();
    expect(result.tag?.slip).toBeDefined();
    expect(result.tag?.slip?.rankPlayed).toBeGreaterThanOrEqual(2);
    // After slip played, consecutiveDeferrals resets to 0 and countdown is renewed
    expect(nextState.consecutiveDeferrals).toBe(0);
    expect(nextState.botMovesUntilSlip).toBeGreaterThan(0);
    expect(nextState.botMoveCount).toBe(OPENING_GRACE_BOT_MOVES + 3);
  });

  it('resets countdown when consecutive deferrals reach DEFERRAL_CAP (3)', async () => {
    // Forced position deferring for the 3rd consecutive time
    const forcedFen = '8/8/8/8/8/5k2/3q4/7K w - - 0 1';
    const engine = createMockEngine();
    const ctx = createContext(forcedFen, engine);
    const state: SlipStrategyState = {
      botMovesUntilSlip: 0,
      consecutiveDeferrals: 2, // will become 3 -> reach cap
      botMoveCount: 10,
    };

    const { nextState } = await strategy.playTurn(ctx, state);

    // Aborted slip cycle: counter reset, deferrals reset to 0
    expect(nextState.consecutiveDeferrals).toBe(0);
    expect(nextState.botMovesUntilSlip).toBeGreaterThan(0);
  });
});
