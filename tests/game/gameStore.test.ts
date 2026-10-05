import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../../src/game/gameStore';
import * as engineModule from '../../src/engine/engineService';
import type { EngineService } from '../../src/engine/types';
import { clearInProgress, loadInProgress } from '../../src/storage/inProgress';

describe('useGameStore', () => {
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

    useGameStore.getState().resetGame();
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
    vi.restoreAllMocks();
  });

  it('handles standard moves and turns correctly', () => {
    const store = useGameStore.getState();
    expect(store.turn).toBe('white');
    expect(store.history).toHaveLength(0);

    // 1. e4
    const success1 = store.makeMove('e2', 'e4');
    expect(success1).toBe(true);

    const state1 = useGameStore.getState();
    expect(state1.turn).toBe('black');
    expect(state1.history).toHaveLength(1);
    expect(state1.history[0].san).toBe('e4');

    // 1... e5
    const success2 = state1.makeMove('e7', 'e5');
    expect(success2).toBe(true);

    const state2 = useGameStore.getState();
    expect(state2.turn).toBe('white');
    expect(state2.history).toHaveLength(2);
    expect(state2.history[1].san).toBe('e5');
  });

  it('rejects illegal moves', () => {
    const store = useGameStore.getState();
    const success = store.makeMove('e2', 'e5'); // illegal jump
    expect(success).toBe(false);
    expect(useGameStore.getState().turn).toBe('white');
  });

  it('handles pawn promotion workflow', () => {
    const store = useGameStore.getState();
    // Load a custom position with a pawn on e7 ready to promote
    store.chess.load('8/4P3/8/8/8/8/8/4K2k w - - 0 1');
    useGameStore.setState({
      fen: store.chess.fen(),
      turn: 'white',
      dests: new Map([['e7', ['e8']]]),
    });

    // Make move without promotion -> triggers pendingPromotion
    const success = useGameStore.getState().makeMove('e7', 'e8');
    expect(success).toBe(true);
    expect(useGameStore.getState().pendingPromotion).toEqual({ from: 'e7', to: 'e8' });

    // Resolve promotion to queen
    const resolved = useGameStore.getState().resolvePromotion('q');
    expect(resolved).toBe(true);

    const finalState = useGameStore.getState();
    expect(finalState.pendingPromotion).toBeNull();
    expect(finalState.history[0].san).toBe('e8=Q');
    expect(finalState.turn).toBe('black');
  });

  it('handles resignation and clears in-progress record', () => {
    const store = useGameStore.getState();
    store.makeMove('e2', 'e4');
    expect(loadInProgress()).not.toBeNull();

    store.resign(); // White resigns

    const state = useGameStore.getState();
    expect(state.isGameOver).toBe(true);
    expect(state.result).toBe('0-1');
    expect(state.resultReason).toContain('White resigned');
    expect(loadInProgress()).toBeNull();
  });

  it('toggles board orientation', () => {
    const store = useGameStore.getState();
    expect(store.orientation).toBe('white');

    store.toggleOrientation();
    expect(useGameStore.getState().orientation).toBe('black');

    store.toggleOrientation();
    expect(useGameStore.getState().orientation).toBe('white');
  });

  it('handles screen transitions between setup and playing', () => {
    const store = useGameStore.getState();
    store.goToSetup();
    expect(useGameStore.getState().screen).toBe('setup');

    store.startGame({ playerColor: 'white', elo: 1800 });
    const playingState = useGameStore.getState();
    expect(playingState.screen).toBe('playing');
    expect(playingState.config.elo).toBe(1800);
    expect(playingState.config.playerColor).toBe('white');
  });

  it('saves in-progress game to storage and resumes correctly', () => {
    const store = useGameStore.getState();
    store.startGame({ playerColor: 'white', elo: 1700 });

    // Play 1. e4 e5
    store.makeMove('e2', 'e4');
    store.makeMove('e7', 'e5');

    const inProgress = loadInProgress();
    expect(inProgress).not.toBeNull();
    expect(inProgress!.moves).toEqual(['e2e4', 'e7e5']);
    expect(inProgress!.config.elo).toBe(1700);

    // Simulate app reload by wiping in-memory Zustand state
    useGameStore.setState({
      history: [],
      tags: [],
      screen: 'setup',
    });
    expect(useGameStore.getState().history).toHaveLength(0);

    // Resume game
    const resumeSuccess = store.resumeGame();
    expect(resumeSuccess).toBe(true);

    const resumedState = useGameStore.getState();
    expect(resumedState.history).toHaveLength(2);
    expect(resumedState.history[0].san).toBe('e4');
    expect(resumedState.history[1].san).toBe('e5');
    expect(resumedState.turn).toBe('white');
    expect(resumedState.screen).toBe('playing');
  });

  it('handles draw offers correctly based on engine evaluation threshold', async () => {
    const mockEngine: EngineService = {
      getBotMove: vi.fn(),
      getCandidates: vi.fn(),
      evaluate: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
    };
    vi.spyOn(engineModule, 'getSharedEngine').mockReturnValue(mockEngine as any);

    // Case 1: Eval is equal (|eval| <= 50cp) -> Bot accepts draw
    (mockEngine.evaluate as any).mockResolvedValueOnce({
      score: { kind: 'cp', value: 20 },
      depth: 10,
    });

    const accepted = await useGameStore.getState().offerDraw();
    expect(accepted).toBe(true);
    const stateAccepted = useGameStore.getState();
    expect(stateAccepted.isGameOver).toBe(true);
    expect(stateAccepted.result).toBe('1/2-1/2');
    expect(stateAccepted.resultReason).toBe('Draw agreed');

    // Reset game for Case 2
    useGameStore.getState().resetGame();

    // Case 2: Eval is unequal (|eval| > 50cp) -> Bot declines draw
    (mockEngine.evaluate as any).mockResolvedValueOnce({
      score: { kind: 'cp', value: 150 },
      depth: 10,
    });

    const declined = await useGameStore.getState().offerDraw();
    expect(declined).toBe(false);
    const stateDeclined = useGameStore.getState();
    expect(stateDeclined.isGameOver).toBe(false);
    expect(stateDeclined.drawOfferStatus).toBe('declined');
  });

  it('handles read-only history browsing during active game', () => {
    const store = useGameStore.getState();
    store.makeMove('e2', 'e4');
    store.makeMove('e7', 'e5');

    expect(store.viewingPly).toBeNull();
    expect(store.hasNewMoveSinceHistoryBrowsed).toBe(false);

    // Browse to start position (ply 0)
    store.setViewingPly(0);
    expect(useGameStore.getState().viewingPly).toBe(0);

    // Browse to ply 1 (1. e4)
    store.setViewingPly(1);
    expect(useGameStore.getState().viewingPly).toBe(1);

    // Jump back to live
    store.setViewingPly(null);
    expect(useGameStore.getState().viewingPly).toBeNull();
  });
});
