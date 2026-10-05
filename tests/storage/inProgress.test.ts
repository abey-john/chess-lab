import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearInProgress, loadInProgress, saveInProgress } from '../../src/storage/inProgress';
import type { InProgressGame } from '../../src/game/types';
import { STORAGE_KEY_IN_PROGRESS } from '../../src/logic/config';

describe('inProgress storage', () => {
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

  const dummyGame: InProgressGame = {
    version: 1,
    id: 'test-game-123',
    mode: 'standard',
    config: {
      mode: 'standard',
      playerColor: 'white',
      elo: 1600,
      botDelay: true,
    },
    startedAt: '2026-10-04T12:00:00.000Z',
    moves: ['e2e4', 'e7e5', 'g1f3'],
    strategyState: {},
  };

  it('saves and loads an in-progress game record correctly', () => {
    saveInProgress(dummyGame);
    const loaded = loadInProgress();

    expect(loaded).toEqual(dummyGame);
  });

  it('clears in-progress game properly', () => {
    saveInProgress(dummyGame);
    expect(loadInProgress()).not.toBeNull();

    clearInProgress();
    expect(loadInProgress()).toBeNull();
  });

  it('gracefully handles missing or corrupted localStorage data', () => {
    expect(loadInProgress()).toBeNull();

    localStorage.setItem(STORAGE_KEY_IN_PROGRESS, 'invalid-json{{{');
    expect(loadInProgress()).toBeNull();

    localStorage.setItem(STORAGE_KEY_IN_PROGRESS, JSON.stringify({ version: 2 }));
    expect(loadInProgress()).toBeNull();

    localStorage.setItem(STORAGE_KEY_IN_PROGRESS, JSON.stringify({ version: 1, invalid: true }));
    expect(loadInProgress()).toBeNull();
  });
});
