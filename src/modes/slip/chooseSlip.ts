import type { Candidate } from '../../engine/types';
import { SEVERITY_BANDS } from '../../logic/config';
import { evalScoreToWinProb } from '../../logic/winProb';
import { BAND_WIDEN, MIN_MEANINGFUL_DROP, MIXED_WEIGHTS } from './config';
import { getPlausibilityMultiplier } from './plausibility';
import type { Severity, SeverityChoice, SlipChoiceResult } from './types';

/**
 * Resolves a SeverityChoice: if 'mixed', samples an option weighted by MIXED_WEIGHTS.
 */
export function resolveSeverity(choice: SeverityChoice, rng: () => number): Severity {
  if (choice !== 'mixed') return choice;

  const roll = rng();
  const inaccuracyThreshold = MIXED_WEIGHTS.inaccuracy;
  const mistakeThreshold = inaccuracyThreshold + MIXED_WEIGHTS.mistake;

  if (roll < inaccuracyThreshold) return 'inaccuracy';
  if (roll < mistakeThreshold) return 'mistake';
  return 'blunder';
}

/**
 * Measures the severity label for a given win% drop.
 */
export function measureSeverity(drop: number): Severity | 'sub-inaccuracy' {
  if (drop < SEVERITY_BANDS.inaccuracy.min) return 'sub-inaccuracy';
  if (drop < SEVERITY_BANDS.mistake.min) return 'inaccuracy';
  if (drop < SEVERITY_BANDS.blunder.min) return 'mistake';
  return 'blunder';
}

interface RankedCandidate {
  candidate: Candidate;
  rank: number; // 1-based index in candidate list
  drop: number; // win% points lost vs best move (bestWin - candWin)
}

/**
 * Weighted random sample from an array of items.
 */
function weightedSample<T>(items: Array<{ item: T; weight: number }>, rng: () => number): T {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  if (totalWeight <= 0) return items[0].item;

  let r = rng() * totalWeight;
  for (const entry of items) {
    if (r <= entry.weight) {
      return entry.item;
    }
    r -= entry.weight;
  }
  return items[items.length - 1].item;
}

/**
 * Implements Section C5:
 * 1. Measure each candidate's drop = bestWin - candWin (excluding rank 1).
 * 2. Keep candidates whose drop falls in target severity band.
 * 3. Fallback 1: widen band by BAND_WIDEN points on both sides.
 * 4. Fallback 2: take any candidate with MIN_MEANINGFUL_DROP <= drop < band.min.
 * 5. Weight survivors by (1 / rank) * plausibility and sample.
 */
export function chooseSlip(
  fen: string,
  candidates: Candidate[],
  requestedSeverity: Severity,
  rng: () => number
): SlipChoiceResult | null {
  if (candidates.length < 2) return null;

  const bestCandidate = candidates[0];
  const bestWin = evalScoreToWinProb(bestCandidate.score);

  // Compute drop for non-best candidates (rank >= 2)
  const rankedNonBest: RankedCandidate[] = [];
  for (let i = 1; i < candidates.length; i++) {
    const cand = candidates[i];
    const candWin = evalScoreToWinProb(cand.score);
    const drop = Math.max(0, bestWin - candWin);
    rankedNonBest.push({
      candidate: cand,
      rank: i + 1,
      drop,
    });
  }

  const band = SEVERITY_BANDS[requestedSeverity];
  const bandMin = (band as { min?: number }).min ?? 0;
  const bandMax = (band as { max?: number }).max ?? Infinity;

  // Attempt 1: Strict band matching
  let pool = rankedNonBest.filter((c) => c.drop >= bandMin && c.drop < bandMax);
  let fallbackUsed: 'none' | 'widened' | 'smaller' = 'none';

  // Attempt 2: Widened band
  if (pool.length === 0) {
    const widenedMin = Math.max(0, bandMin - BAND_WIDEN);
    const widenedMax = bandMax === Infinity ? Infinity : bandMax + BAND_WIDEN;
    pool = rankedNonBest.filter((c) => c.drop >= widenedMin && c.drop < widenedMax);
    if (pool.length > 0) {
      fallbackUsed = 'widened';
    }
  }

  // Attempt 3: Smaller error (only smaller, never larger than requested)
  if (pool.length === 0 && bandMin > MIN_MEANINGFUL_DROP) {
    pool = rankedNonBest.filter((c) => c.drop >= MIN_MEANINGFUL_DROP && c.drop < bandMin);
    if (pool.length > 0) {
      fallbackUsed = 'smaller';
    }
  }

  // If still no candidates found, caller defers
  if (pool.length === 0) {
    return null;
  }

  // Weight survivors by (1 / rank) * plausibility
  const weighted = pool.map((c) => {
    const plausibility = getPlausibilityMultiplier(fen, c.candidate, bestCandidate, requestedSeverity);
    const rankWeight = 1 / c.rank;
    return {
      item: c,
      weight: rankWeight * plausibility,
    };
  });

  const selected = weightedSample(weighted, rng);

  return {
    candidate: selected.candidate,
    tag: {
      requestedSeverity,
      measuredDrop: Math.round(selected.drop * 10) / 10,
      measuredSeverity: measureSeverity(selected.drop),
      fallbackUsed,
      rankPlayed: selected.rank,
    },
  };
}
