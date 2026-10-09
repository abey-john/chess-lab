import { describe, it, expect } from 'vitest';
import {
  getAllPuzzles,
  getPuzzleById,
  getPuzzleForElo,
  PuzzleSession,
} from '../../../src/modes/redemption/puzzleService';
import type { ChessPuzzle } from '../../../src/modes/redemption/types';

describe('puzzleService', () => {
  describe('Database Integrity', () => {
    it('loads all curated puzzles', () => {
      const puzzles = getAllPuzzles();
      expect(puzzles.length).toBeGreaterThanOrEqual(500);
    });

    it('looks up puzzles by ID', () => {
      const all = getAllPuzzles();
      const first = all[0];
      const p = getPuzzleById(first.id);
      expect(p).toBeDefined();
      expect(p?.id).toBe(first.id);
      expect(p?.rating).toBe(first.rating);

      const missing = getPuzzleById('non-existent');
      expect(missing).toBeUndefined();
    });

    it('verifies that every curated puzzle is 100% playable to completion', () => {
      const puzzles = getAllPuzzles();

      for (const puzzle of puzzles) {
        const session = new PuzzleSession(puzzle);
        expect(session.isComplete()).toBe(false);
        expect(session.isFailed()).toBe(false);

        // Play the player's moves from the solution (even indices: 0, 2, 4...)
        for (let i = 0; i < puzzle.solution.length; i += 2) {
          const playerUci = puzzle.solution[i];
          const result = session.submitMove(playerUci);

          expect(result.success).toBe(true);

          if (i + 2 >= puzzle.solution.length) {
            // Last player move completes the puzzle
            expect(result.isComplete).toBe(true);
            expect(session.isComplete()).toBe(true);
          } else {
            // Intermediate player move has opponent reply
            expect(result.isComplete).toBe(false);
            expect(result.opponentMove).toBeDefined();
            expect(result.opponentMove?.uci).toBe(puzzle.solution[i + 1].toLowerCase());
          }
        }
      }
    });
  });

  describe('getPuzzleForElo', () => {
    it('returns a puzzle within +/- 150 Elo when candidates exist', () => {
      const targetElo = 1500;
      const puzzle = getPuzzleForElo(targetElo);
      expect(Math.abs(puzzle.rating - targetElo)).toBeLessThanOrEqual(150);
    });

    it('respects excludeIds and does not return excluded puzzles', () => {
      const targetElo = 1500;
      const exclude = new Set<string>();

      const first = getPuzzleForElo(targetElo, exclude);
      exclude.add(first.id);

      const second = getPuzzleForElo(targetElo, exclude);
      expect(second.id).not.toBe(first.id);
    });

    it('gracefully handles high or low Elo bounds by returning the closest puzzle', () => {
      const low = getPuzzleForElo(400);
      expect(low).toBeDefined();
      expect(low.rating).toBeLessThanOrEqual(1000);

      const high = getPuzzleForElo(3200);
      expect(high).toBeDefined();
      expect(high.rating).toBeGreaterThanOrEqual(2000);
    });

    it('resets exclusion if all puzzles are excluded', () => {
      const allPuzzles = getAllPuzzles();
      const allIds = new Set(allPuzzles.map((p) => p.id));

      const fallback = getPuzzleForElo(1500, allIds);
      expect(fallback).toBeDefined();
      expect(allIds.has(fallback.id)).toBe(true);
    });
  });

  describe('PuzzleSession', () => {
    const singleMovePuzzle: ChessPuzzle = {
      id: 'test-single',
      fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 b - - 0 1',
      initialMove: 'g7g6', // Black plays g6
      solution: ['a1a8'], // White plays back-rank mate
      rating: 800,
      themes: ['backRank', 'mateIn1'],
    };

    const multiMovePuzzle: ChessPuzzle = {
      id: 'test-multi',
      fen: 'r1bqk2r/pppp1ppp/2n5/4p3/1bB1P1n1/2NP1N2/PPP2PPP/R1BQK2R b KQkq - 2 6',
      initialMove: 'b4c3', // Black takes knight
      solution: [
        'b2c3', // White re-takes: b2c3
        'd7d6', // Black responds: d7d6
        'h2h3', // White pushes pawn: h2h3
      ],
      rating: 1200,
      themes: ['crushing'],
    };

    it('handles single-move puzzle correct resolution with string UCI', () => {
      const session = new PuzzleSession(singleMovePuzzle);
      expect(session.getPlayerColor()).toBe('white');
      expect(session.isComplete()).toBe(false);
      expect(session.isFailed()).toBe(false);

      const res = session.submitMove('a1a8');
      expect(res.success).toBe(true);
      expect(res.isComplete).toBe(true);
      expect(session.isComplete()).toBe(true);
      expect(session.isFailed()).toBe(false);
    });

    it('handles move submission with object format { from, to }', () => {
      const session = new PuzzleSession(singleMovePuzzle);
      const res = session.submitMove({ from: 'a1', to: 'a8' });
      expect(res.success).toBe(true);
      expect(res.isComplete).toBe(true);
    });

    it('fails session when incorrect move is played', () => {
      const session = new PuzzleSession(singleMovePuzzle);
      const res = session.submitMove('a1b1');

      expect(res.success).toBe(false);
      expect(res.isComplete).toBe(false);
      expect(res.error).toBe('Incorrect move');
      expect(session.isFailed()).toBe(true);

      // Attempting another move after failure is rejected
      const nextRes = session.submitMove('a1a8');
      expect(nextRes.success).toBe(false);
      expect(nextRes.error).toBe('Puzzle already failed');
    });

    it('handles multi-move puzzle step by step with intermediate opponent reply', () => {
      const session = new PuzzleSession(multiMovePuzzle);
      expect(session.getPlayerColor()).toBe('white');

      // Step 1: player plays b2c3
      const step1 = session.submitMove('b2c3');
      expect(step1.success).toBe(true);
      expect(step1.isComplete).toBe(false);
      expect(step1.opponentMove).toBeDefined();
      expect(step1.opponentMove?.uci).toBe('d7d6');
      expect(step1.opponentMove?.san).toBe('d6');

      // Step 2: player plays h2h3
      const step2 = session.submitMove('h2h3');
      expect(step2.success).toBe(true);
      expect(step2.isComplete).toBe(true);
      expect(session.isComplete()).toBe(true);
    });

    it('fails on step 2 of a multi-move puzzle if player makes a mistake', () => {
      const session = new PuzzleSession(multiMovePuzzle);

      const step1 = session.submitMove('b2c3');
      expect(step1.success).toBe(true);

      // Step 2 mistake
      const step2 = session.submitMove('a1b1');
      expect(step2.success).toBe(false);
      expect(step2.error).toBe('Incorrect move');
      expect(session.isFailed()).toBe(true);
    });
  });
});
