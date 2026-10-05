import { describe, expect, it, vi } from 'vitest';
import { startAnalysis } from '../../src/review/analyzeGame';
import type { EngineService } from '../../src/engine/types';
import type { SavedGame } from '../../src/game/types';

describe('startAnalysis post-game pass', () => {
  const dummyGame: SavedGame = {
    version: 1,
    id: 'test-game',
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

  it('evaluates all positions sequentially and reports progress', async () => {
    const mockEngine: EngineService = {
      getBotMove: vi.fn(),
      getCandidates: vi.fn(),
      evaluate: vi.fn().mockImplementation(async (_fen, depth) => ({
        score: { kind: 'cp', value: 15 },
        depth,
      })),
      stop: vi.fn(),
      dispose: vi.fn(),
    };

    const progressUpdates: number[] = [];
    const task = startAnalysis(dummyGame, mockEngine, (p) => {
      progressUpdates.push(p.percent);
    });

    const evals = await task.promise;

    // 2 moves + 1 starting position = 3 evaluations
    expect(evals).toHaveLength(3);
    expect(evals[0].ply).toBe(0);
    expect(evals[1].ply).toBe(1);
    expect(evals[2].ply).toBe(2);

    expect(mockEngine.evaluate).toHaveBeenCalledTimes(3);
    expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
  });

  it('uses cached evaluations without querying the engine', async () => {
    const mockEngine: EngineService = {
      getBotMove: vi.fn(),
      getCandidates: vi.fn(),
      evaluate: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
    };

    const cachedGame: SavedGame = {
      ...dummyGame,
      analysis: [
        { ply: 0, score: { kind: 'cp', value: 20 }, depth: 14 },
        { ply: 1, score: { kind: 'cp', value: 15 }, depth: 14 },
        { ply: 2, score: { kind: 'cp', value: -10 }, depth: 14 },
      ],
    };

    const progressUpdates: number[] = [];
    const task = startAnalysis(cachedGame, mockEngine, (p) => {
      progressUpdates.push(p.percent);
    });

    const evals = await task.promise;

    expect(evals).toHaveLength(3);
    expect(mockEngine.evaluate).not.toHaveBeenCalled();
    expect(progressUpdates).toContain(100);
  });

  it('supports cancelling in-flight analysis', async () => {
    const mockEngine: EngineService = {
      getBotMove: vi.fn(),
      getCandidates: vi.fn(),
      evaluate: vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ score: { kind: 'cp', value: 0 }, depth: 14 }), 50))
      ),
      stop: vi.fn(),
      dispose: vi.fn(),
    };

    const task = startAnalysis(dummyGame, mockEngine);
    task.cancel();

    await expect(task.promise).rejects.toThrow('Analysis cancelled');
    expect(mockEngine.stop).toHaveBeenCalled();
  });
});
