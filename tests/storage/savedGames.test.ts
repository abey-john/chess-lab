import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearSavedGames, deleteSavedGame, getSavedGame, loadSavedGames, saveGame, updateSavedGameAnalysis } from '../../src/storage/savedGames';
import type { SavedGame } from '../../src/game/types';
import { STORAGE_KEY_GAMES } from '../../src/logic/config';

describe('savedGames storage', () => {
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
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  const dummySavedGame: SavedGame = {
    version: 1,
    id: 'game-456',
    mode: 'standard',
    startedAt: '2026-10-04T12:00:00.000Z',
    config: {
      mode: 'standard',
      playerColor: 'white',
      elo: 1500,
      botDelay: true,
    },
    result: '1-0',
    resultReason: 'White won by checkmate',
    pgn: '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0',
    tags: [
      { ply: 1, fenBefore: 'start', san: 'e4', by: 'player' },
      { ply: 2, fenBefore: 'fen1', san: 'e5', by: 'bot' },
    ],
  };

  it('saves and loads games correctly', () => {
    saveGame(dummySavedGame);
    const loaded = loadSavedGames();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('game-456');

    const single = getSavedGame('game-456');
    expect(single).toEqual(dummySavedGame);
  });

  it('updates cached analysis on a saved game', () => {
    saveGame(dummySavedGame);

    const dummyAnalysis = [
      { ply: 0, score: { kind: 'cp' as const, value: 20 }, depth: 14 },
      { ply: 1, score: { kind: 'cp' as const, value: 15 }, depth: 14 },
    ];

    updateSavedGameAnalysis('game-456', dummyAnalysis);

    const updated = getSavedGame('game-456');
    expect(updated?.analysis).toEqual(dummyAnalysis);
  });

  it('limits saved games to max 50 games', () => {
    for (let i = 0; i < 55; i++) {
      saveGame({
        ...dummySavedGame,
        id: `game-${i}`,
      });
    }

    const loaded = loadSavedGames();
    expect(loaded).toHaveLength(50);
    expect(loaded[0].id).toBe('game-54'); // Most recent game first
  });

  it('deletes a single saved game correctly', () => {
    saveGame(dummySavedGame);
    saveGame({ ...dummySavedGame, id: 'game-789' });
    expect(loadSavedGames()).toHaveLength(2);

    deleteSavedGame('game-456');
    const remaining = loadSavedGames();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('game-789');
  });

  it('handles corrupt storage gracefully', () => {
    localStorage.setItem(STORAGE_KEY_GAMES, 'corrupt-json{{{');
    expect(loadSavedGames()).toEqual([]);

    clearSavedGames();
    expect(loadSavedGames()).toEqual([]);
  });
});
