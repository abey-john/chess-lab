import { describe, expect, it } from 'vitest';
import type { Candidate } from '../../../src/engine/types';
import { chooseSlip, resolveSeverity } from '../../../src/modes/slip/chooseSlip';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('chooseSlip', () => {
  it('resolveSeverity maps non-mixed choices directly and rolls for mixed', () => {
    expect(resolveSeverity('blunder', () => 0.5)).toBe('blunder');
    expect(resolveSeverity('inaccuracy', () => 0.5)).toBe('inaccuracy');

    // Mixed distribution: 0.0 - 0.4 -> inaccuracy; 0.4 - 0.8 -> mistake; 0.8 - 1.0 -> blunder
    expect(resolveSeverity('mixed', () => 0.2)).toBe('inaccuracy');
    expect(resolveSeverity('mixed', () => 0.5)).toBe('mistake');
    expect(resolveSeverity('mixed', () => 0.9)).toBe('blunder');
  });

  it('selects a candidate within target severity band with fallbackUsed: none', () => {
    // Best move has winPct ~ 50% (cp 0)
    // inaccuracy: drop 5 to 10% (cp -50 to -85)
    // mistake: drop 10 to 20% (cp -90 to -170)
    // blunder: drop >= 20% (cp <= -180)
    const candidates: Candidate[] = [
      { move: 'e2e4', rank: 1, score: { kind: 'cp', value: 0 } }, // Rank 1 (best)
      { move: 'd2d4', rank: 2, score: { kind: 'cp', value: -60 } }, // Inaccuracy (drop ~ 7.5%)
      { move: 'c2c4', rank: 3, score: { kind: 'cp', value: -120 } }, // Mistake (drop ~ 14.5%)
      { move: 'b1c3', rank: 4, score: { kind: 'cp', value: -300 } }, // Blunder (drop ~ 33%)
    ];

    // Request inaccuracy
    const inacc = chooseSlip(START_FEN, candidates, 'inaccuracy', () => 0);
    expect(inacc).not.toBeNull();
    expect(inacc!.candidate.move).toBe('d2d4');
    expect(inacc!.tag.requestedSeverity).toBe('inaccuracy');
    expect(inacc!.tag.fallbackUsed).toBe('none');
    expect(inacc!.tag.rankPlayed).toBe(2);

    // Request blunder
    const blunder = chooseSlip(START_FEN, candidates, 'blunder', () => 0);
    expect(blunder).not.toBeNull();
    expect(blunder!.candidate.move).toBe('b1c3');
    expect(blunder!.tag.requestedSeverity).toBe('blunder');
    expect(blunder!.tag.fallbackUsed).toBe('none');
    expect(blunder!.tag.rankPlayed).toBe(4);
  });

  it('uses fallback widened when no exact match exists in strict band', () => {
    // Drop is ~11.7% (mistake band is 10-20%), but requested inaccuracy (5-10%).
    // Widened inaccuracy band is 2 to 13%, so 11.7% matches widened!
    const candidates: Candidate[] = [
      { move: 'e2e4', rank: 1, score: { kind: 'cp', value: 0 } },
      { move: 'd2d4', rank: 2, score: { kind: 'cp', value: -130 } }, // Drop ~ 11.7%
    ];

    const res = chooseSlip(START_FEN, candidates, 'inaccuracy', () => 0);
    expect(res).not.toBeNull();
    expect(res!.tag.fallbackUsed).toBe('widened');
  });

  it('uses fallback smaller when widened also fails', () => {
    // Drop is ~4.1% (sub-inaccuracy). Requested blunder (>= 20%).
    // No blunder (>= 20%) or widened blunder (>= 17%) exists, but smaller error (3% to 20%) matches!
    const candidates: Candidate[] = [
      { move: 'e2e4', rank: 1, score: { kind: 'cp', value: 0 } },
      { move: 'd2d4', rank: 2, score: { kind: 'cp', value: -45 } }, // Drop ~ 4.1%
    ];

    const res = chooseSlip(START_FEN, candidates, 'blunder', () => 0);
    expect(res).not.toBeNull();
    expect(res!.tag.fallbackUsed).toBe('smaller');
  });

  it('returns null if no non-best move meets even minimal error threshold', () => {
    const candidates: Candidate[] = [
      { move: 'e2e4', rank: 1, score: { kind: 'cp', value: 0 } },
      { move: 'd2d4', rank: 2, score: { kind: 'cp', value: 0 } }, // Drop 0%
    ];

    const res = chooseSlip(START_FEN, candidates, 'blunder', () => 0);
    expect(res).toBeNull();
  });
});
