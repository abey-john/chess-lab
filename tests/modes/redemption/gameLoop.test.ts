import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '../../../src/game/gameStore';
import * as blunderDetector from '../../../src/modes/redemption/blunderDetector';
import type { RedemptionStrategyState } from '../../../src/modes/redemption/types';

describe('Redemption Mode Game Loop', () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    const mockStorage: Storage = {
      getItem: (key: string) => mockStore[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStore[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      clear: () => {
        mockStore = {};
      },
      key: (index: number) => Object.keys(mockStore)[index] ?? null,
      length: Object.keys(mockStore).length,
    };
    (globalThis as any).localStorage = mockStorage;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
    vi.restoreAllMocks();
  });

  it('initializes strategyState with configured lives on game start', () => {
    useGameStore.getState().resetGame({
      mode: 'redemption',
      lives: 3,
      elo: 1600,
      playerColor: 'white',
    });

    const state = useGameStore.getState();
    expect(state.config.mode).toBe('redemption');
    const strat = state.strategyState as RedemptionStrategyState;
    expect(strat.livesRemaining).toBe(3);
    expect(strat.redemptionEvents).toEqual([]);
    expect(strat.usedPuzzleIds).toEqual([]);
  });

  it('initializes with unlimited lives when configured', () => {
    useGameStore.getState().resetGame({
      mode: 'redemption',
      lives: 'unlimited',
      elo: 1800,
      playerColor: 'white',
    });

    const state = useGameStore.getState();
    const strat = state.strategyState as RedemptionStrategyState;
    expect(strat.livesRemaining).toBe('unlimited');
  });

  it('does not trigger redemption on a non-blunder move', async () => {
    vi.spyOn(blunderDetector, 'checkMoveForBlunder').mockResolvedValue({
      isBlunder: false,
      drop: 2,
      quality: 'good',
      beforeWinProb: 50,
      afterWinProb: 48,
      beforeScore: { kind: 'cp', value: 0 },
      afterScore: { kind: 'cp', value: 0 },
    });

    useGameStore.getState().resetGame({
      mode: 'redemption',
      lives: 3,
      elo: 1500,
      playerColor: 'white',
    });

    useGameStore.getState().makeMove('e2', 'e4');

    // Wait a tick for async blunder check
    await new Promise((r) => setTimeout(r, 10));

    const state = useGameStore.getState();
    expect(state.activeRedemption).toBeNull();
    expect(state.history.length).toBe(1);
    expect(state.history[0].san).toBe('e4');
  });

  it('triggers redemption QTE when player makes a blunder', async () => {
    vi.spyOn(blunderDetector, 'checkMoveForBlunder').mockResolvedValue({
      isBlunder: true,
      drop: 35,
      quality: 'blunder',
      beforeWinProb: 50,
      afterWinProb: 15,
      beforeScore: { kind: 'cp', value: 0 },
      afterScore: { kind: 'cp', value: 300 },
    });

    useGameStore.getState().resetGame({
      mode: 'redemption',
      lives: 3,
      elo: 1500,
      playerColor: 'white',
    });

    useGameStore.getState().makeMove('e2', 'e4');

    await new Promise((r) => setTimeout(r, 10));

    const state = useGameStore.getState();
    expect(state.activeRedemption).not.toBeNull();
    expect(state.activeRedemption?.status).toBe('active');
    expect(state.activeRedemption?.blunderPly).toBe(1);
    expect(state.activeRedemption?.blunderMove.san).toBe('e4');
    expect(state.activeRedemption?.timeRemainingMs).toBe(15000);
    expect(state.activeRedemption?.livesRemaining).toBe(3);
    expect(state.activeRedemption?.puzzle).toBeDefined();

    // The used puzzle id was recorded
    const strat = state.strategyState as RedemptionStrategyState;
    expect(strat.usedPuzzleIds.length).toBe(1);
  });

  it('handles "Accept Blunder" without deducting lives', async () => {
    vi.spyOn(blunderDetector, 'checkMoveForBlunder').mockResolvedValue({
      isBlunder: true,
      drop: 40,
      quality: 'blunder',
      beforeWinProb: 50,
      afterWinProb: 10,
      beforeScore: { kind: 'cp', value: 0 },
      afterScore: { kind: 'cp', value: 400 },
    });

    useGameStore.getState().resetGame({
      mode: 'redemption',
      lives: 3,
      elo: 1500,
      playerColor: 'white',
    });

    useGameStore.getState().makeMove('e2', 'e4');
    await new Promise((r) => setTimeout(r, 10));

    expect(useGameStore.getState().activeRedemption).not.toBeNull();

    // User chooses "Accept Blunder"
    useGameStore.getState().acceptBlunder();

    const state = useGameStore.getState();
    expect(state.activeRedemption).toBeNull();

    const strat = state.strategyState as RedemptionStrategyState;
    // Lives must remain 3 (0 lives deducted)
    expect(strat.livesRemaining).toBe(3);
    expect(strat.redemptionEvents.length).toBe(1);
    expect(strat.redemptionEvents[0].outcome).toBe('accepted');

    // Blunder move remains on board
    expect(state.history.length).toBe(1);
    expect(state.history[0].san).toBe('e4');
    expect(state.tags[0].redemption?.attempted).toBe(false);
    expect(state.tags[0].redemption?.outcome).toBe('accepted');
  });

  it('deducts a life on incorrect puzzle move', async () => {
    vi.spyOn(blunderDetector, 'checkMoveForBlunder').mockResolvedValue({
      isBlunder: true,
      drop: 40,
      quality: 'blunder',
      beforeWinProb: 50,
      afterWinProb: 10,
      beforeScore: { kind: 'cp', value: 0 },
      afterScore: { kind: 'cp', value: 400 },
    });

    useGameStore.getState().resetGame({
      mode: 'redemption',
      lives: 3,
      elo: 1500,
      playerColor: 'white',
    });

    useGameStore.getState().makeMove('e2', 'e4');
    await new Promise((r) => setTimeout(r, 10));

    // Submit an illegal or wrong move
    const res = useGameStore.getState().submitRedemptionMove('a1a2');
    expect(res?.success).toBe(false);

    const state = useGameStore.getState();
    expect(state.activeRedemption).toBeNull();

    const strat = state.strategyState as RedemptionStrategyState;
    // 1 life deducted: 3 -> 2
    expect(strat.livesRemaining).toBe(2);
    expect(strat.redemptionEvents.length).toBe(1);
    expect(strat.redemptionEvents[0].outcome).toBe('failed');

    // Blunder move remains on board
    expect(state.tags[0].redemption?.attempted).toBe(true);
    expect(state.tags[0].redemption?.outcome).toBe('failed');
  });

  it('deducts a life on timeout', async () => {
    vi.spyOn(blunderDetector, 'checkMoveForBlunder').mockResolvedValue({
      isBlunder: true,
      drop: 40,
      quality: 'blunder',
      beforeWinProb: 50,
      afterWinProb: 10,
      beforeScore: { kind: 'cp', value: 0 },
      afterScore: { kind: 'cp', value: 400 },
    });

    useGameStore.getState().resetGame({
      mode: 'redemption',
      lives: 3,
      elo: 1500,
      playerColor: 'white',
    });

    useGameStore.getState().makeMove('e2', 'e4');
    await new Promise((r) => setTimeout(r, 10));

    // Timer expires
    useGameStore.getState().tickRedemptionTimer(0);

    const state = useGameStore.getState();
    expect(state.activeRedemption).toBeNull();

    const strat = state.strategyState as RedemptionStrategyState;
    expect(strat.livesRemaining).toBe(2);
    expect(strat.redemptionEvents[0].outcome).toBe('timeout');
    expect(state.tags[0].redemption?.outcome).toBe('timeout');
  });

  it('preserves unlimited lives on failed redemption', async () => {
    vi.spyOn(blunderDetector, 'checkMoveForBlunder').mockResolvedValue({
      isBlunder: true,
      drop: 40,
      quality: 'blunder',
      beforeWinProb: 50,
      afterWinProb: 10,
      beforeScore: { kind: 'cp', value: 0 },
      afterScore: { kind: 'cp', value: 400 },
    });

    useGameStore.getState().resetGame({
      mode: 'redemption',
      lives: 'unlimited',
      elo: 1500,
      playerColor: 'white',
    });

    useGameStore.getState().makeMove('e2', 'e4');
    await new Promise((r) => setTimeout(r, 10));

    useGameStore.getState().failRedemption('failed');

    const state = useGameStore.getState();
    const strat = state.strategyState as RedemptionStrategyState;
    expect(strat.livesRemaining).toBe('unlimited');
  });

  it('successfully solves redemption: undoes blunder and restores board for player turn', async () => {
    vi.spyOn(blunderDetector, 'checkMoveForBlunder').mockResolvedValue({
      isBlunder: true,
      drop: 50,
      quality: 'blunder',
      beforeWinProb: 50,
      afterWinProb: 0,
      beforeScore: { kind: 'cp', value: 0 },
      afterScore: { kind: 'mate', value: 1 },
    });

    useGameStore.getState().resetGame({
      mode: 'redemption',
      lives: 3,
      elo: 1500,
      playerColor: 'white',
    });

    const initialFen = useGameStore.getState().fen;

    // Player makes a blunder move: e2e4
    useGameStore.getState().makeMove('e2', 'e4');
    await new Promise((r) => setTimeout(r, 10));

    const active = useGameStore.getState().activeRedemption;
    expect(active).not.toBeNull();
    expect(active?.blunderMove.fenBefore).toBe(initialFen);

    // Player successfully solves the puzzle
    useGameStore.getState().solveRedemption();

    const state = useGameStore.getState();
    expect(state.activeRedemption).toBeNull();

    // 0 lives deducted
    const strat = state.strategyState as RedemptionStrategyState;
    expect(strat.livesRemaining).toBe(3);
    expect(strat.redemptionEvents.length).toBe(1);
    expect(strat.redemptionEvents[0].outcome).toBe('solved');

    // Board is restored to initial position!
    expect(state.fen).toBe(initialFen);
    expect(state.turn).toBe('white');
    expect(state.history.length).toBe(0);
    expect(state.tags.length).toBe(0);
    expect(state.lastMove).toBeNull();

    // Player can now make a different move!
    const moved = state.makeMove('d2', 'd4');
    expect(moved).toBe(true);
    expect(useGameStore.getState().history[0].san).toBe('d4');
  });

  it('does not trigger redemption when out of lives (0 lives remaining)', async () => {
    const blunderSpy = vi.spyOn(blunderDetector, 'checkMoveForBlunder');

    useGameStore.getState().resetGame({
      mode: 'redemption',
      lives: 1,
      elo: 1500,
      playerColor: 'white',
    });

    // Manually simulate lives down to 0
    useGameStore.setState({
      strategyState: {
        livesRemaining: 0,
        redemptionEvents: [],
        usedPuzzleIds: [],
      },
    });

    useGameStore.getState().makeMove('e2', 'e4');
    await new Promise((r) => setTimeout(r, 10));

    expect(useGameStore.getState().activeRedemption).toBeNull();
    // Blunder detector wasn't even called because player has 0 lives
    expect(blunderSpy).not.toHaveBeenCalled();
  });
});
