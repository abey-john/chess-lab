import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../../src/game/gameStore';

describe('useGameStore', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
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

  it('handles resignation correctly', () => {
    const store = useGameStore.getState();
    store.resign(); // White resigns

    const state = useGameStore.getState();
    expect(state.isGameOver).toBe(true);
    expect(state.result).toBe('0-1');
    expect(state.resultReason).toContain('White resigned');
  });

  it('toggles board orientation', () => {
    const store = useGameStore.getState();
    expect(store.orientation).toBe('white');

    store.toggleOrientation();
    expect(useGameStore.getState().orientation).toBe('black');

    store.toggleOrientation();
    expect(useGameStore.getState().orientation).toBe('white');
  });
});
