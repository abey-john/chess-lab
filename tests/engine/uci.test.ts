import { describe, expect, it } from 'vitest';
import { parseBestmoveLine, parseCandidates, parseInfoLine } from '../../src/engine/uci';

describe('UCI parsing', () => {
  describe('parseInfoLine', () => {
    it('parses standard info line with centipawn score and PV', () => {
      const line = 'info depth 14 seldepth 20 multipv 1 score cp 35 nodes 15234 nps 304680 time 50 pv e2e4 e7e5 g1f3';
      const parsed = parseInfoLine(line);

      expect(parsed).not.toBeNull();
      expect(parsed?.depth).toBe(14);
      expect(parsed?.seldepth).toBe(20);
      expect(parsed?.multipv).toBe(1);
      expect(parsed?.score).toEqual({ kind: 'cp', value: 35 });
      expect(parsed?.nodes).toBe(15234);
      expect(parsed?.nps).toBe(304680);
      expect(parsed?.time).toBe(50);
      expect(parsed?.pv).toEqual(['e2e4', 'e7e5', 'g1f3']);
    });

    it('parses mate score lines correctly', () => {
      const mateIn3 = 'info depth 12 multipv 1 score mate 3 pv f7f8q g8h7 f8f5';
      const parsed3 = parseInfoLine(mateIn3);
      expect(parsed3?.score).toEqual({ kind: 'mate', value: 3 });
      expect(parsed3?.pv[0]).toBe('f7f8q');

      const mateInNeg2 = 'info depth 10 multipv 2 score mate -2 pv e1e2 d8d2';
      const parsedNeg2 = parseInfoLine(mateInNeg2);
      expect(parsedNeg2?.score).toEqual({ kind: 'mate', value: -2 });
      expect(parsedNeg2?.multipv).toBe(2);
    });

    it('defaults multipv to 1 if missing in single-PV mode', () => {
      const line = 'info depth 10 score cp -45 pv d7d5 c2c4';
      const parsed = parseInfoLine(line);
      expect(parsed?.multipv).toBe(1);
      expect(parsed?.score).toEqual({ kind: 'cp', value: -45 });
    });

    it('returns null for non-info or incomplete lines', () => {
      expect(parseInfoLine('')).toBeNull();
      expect(parseInfoLine('Stockfish 16 by the Stockfish developers')).toBeNull();
      expect(parseInfoLine('uciok')).toBeNull();
      expect(parseInfoLine('info currmove e2e4 currmovenumber 1')).toBeNull(); // no score / depth
    });
  });

  describe('parseBestmoveLine', () => {
    it('parses bestmove and optional ponder move', () => {
      expect(parseBestmoveLine('bestmove e2e4 ponder e7e5')).toEqual({
        bestmove: 'e2e4',
        ponder: 'e7e5',
      });

      expect(parseBestmoveLine('bestmove d2d4')).toEqual({
        bestmove: 'd2d4',
        ponder: undefined,
      });

      expect(parseBestmoveLine('bestmove e7e8q')).toEqual({
        bestmove: 'e7e8q',
        ponder: undefined,
      });

      expect(parseBestmoveLine('readyok')).toBeNull();
    });
  });

  describe('parseCandidates (MultiPV)', () => {
    it('keeps the last info line per multipv index at the highest depth', () => {
      const uciStream = [
        // Depth 12 lines (should be ignored because depth 14 is reached)
        'info depth 12 multipv 1 score cp 20 pv e2e4',
        'info depth 12 multipv 2 score cp 10 pv d2d4',

        // Depth 14 lines: earlier intermediate line for multipv 1
        'info depth 14 multipv 1 score cp 30 pv e2e4 e7e5',
        // Depth 14 line for multipv 2
        'info depth 14 multipv 2 score cp 15 pv d2d4 d7d5',
        // Depth 14 line for multipv 3
        'info depth 14 multipv 3 score cp -5 pv c2c4 c7c5',
        // Later updated line for multipv 1 at depth 14 (must keep this one!)
        'info depth 14 multipv 1 score cp 38 pv e2e4 e7e5 g1f3 b8c6',
        // Noise lines
        'info currmove g1f3 currmovenumber 3',
        'bestmove e2e4',
      ];

      const candidates = parseCandidates(uciStream);

      expect(candidates).toHaveLength(3);

      // Rank 1: should be the last line for multipv 1 at depth 14
      expect(candidates[0]).toEqual({
        rank: 1,
        move: 'e2e4',
        score: { kind: 'cp', value: 38 },
      });

      // Rank 2
      expect(candidates[1]).toEqual({
        rank: 2,
        move: 'd2d4',
        score: { kind: 'cp', value: 15 },
      });

      // Rank 3
      expect(candidates[2]).toEqual({
        rank: 3,
        move: 'c2c4',
        score: { kind: 'cp', value: -5 },
      });
    });

    it('returns empty array when no info lines with PV are present', () => {
      expect(parseCandidates([])).toEqual([]);
      expect(parseCandidates(['readyok', 'bestmove e2e4'])).toEqual([]);
    });
  });
});
