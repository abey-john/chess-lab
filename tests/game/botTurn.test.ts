import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeBotTurn } from '../../src/game/botTurn';
import { useGameStore } from '../../src/game/gameStore';
import * as engineModule from '../../src/engine/engineService';
import type { EngineService } from '../../src/engine/types';

describe('botTurn orchestration', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame({
      playerColor: 'white',
      elo: 1500,
      botDelay: false,
    });
  });

  it('ignores turn if gameId is stale', async () => {
    const mockEngine: EngineService = {
      getBotMove: vi.fn().mockResolvedValue('e7e5'),
      getCandidates: vi.fn().mockResolvedValue([]),
      evaluate: vi.fn().mockResolvedValue({ score: { kind: 'cp', value: 0 }, depth: 14 }),
      stop: vi.fn(),
      dispose: vi.fn(),
    };

    vi.spyOn(engineModule, 'getSharedEngine').mockReturnValue(mockEngine as any);

    // Call with a fake/stale game ID
    await executeBotTurn('stale-game-id-999');

    expect(mockEngine.getBotMove).not.toHaveBeenCalled();
    expect(useGameStore.getState().history).toHaveLength(0);
  });

  it('executes bot move and tags it correctly when gameId matches and it is bot turn', async () => {
    const mockEngine: EngineService = {
      getBotMove: vi.fn().mockResolvedValue('e7e5'),
      getCandidates: vi.fn().mockResolvedValue([]),
      evaluate: vi.fn().mockResolvedValue({ score: { kind: 'cp', value: 0 }, depth: 14 }),
      stop: vi.fn(),
      dispose: vi.fn(),
    };

    vi.spyOn(engineModule, 'getSharedEngine').mockReturnValue(mockEngine as any);

    const store = useGameStore.getState();
    const currentGameId = store.gameId;

    // Player plays 1. e4
    store.makeMove('e2', 'e4');

    // Bot turn should execute
    await executeBotTurn(currentGameId);

    const updatedState = useGameStore.getState();
    expect(updatedState.history).toHaveLength(2);
    expect(updatedState.history[1].san).toBe('e5');
    expect(updatedState.tags[1].by).toBe('bot');
    expect(updatedState.turn).toBe('white');
  });
});
