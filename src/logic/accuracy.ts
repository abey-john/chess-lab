/**
 * Calculates per-move accuracy percentage (0 to 100) from win% drop,
 * using the formula from chess-lab-plan.md:
 * accuracy = 103.1668 * exp(-0.04354 * drop) - 3.1669
 */
export function calculateMoveAccuracy(drop: number): number {
  if (drop <= 0) {
    return 100;
  }
  const raw = 103.1668 * Math.exp(-0.04354 * drop) - 3.1669;
  return Math.max(0, Math.min(100, Math.round(raw * 10) / 10));
}

/**
 * Calculates per-side accuracy as the arithmetic mean of that side's move accuracies.
 * Returns a number rounded to 1 decimal place.
 */
export function calculateSideAccuracy(moveAccuracies: number[]): number {
  if (moveAccuracies.length === 0) {
    return 100;
  }
  const sum = moveAccuracies.reduce((acc, val) => acc + val, 0);
  const avg = sum / moveAccuracies.length;
  return Math.round(avg * 10) / 10;
}
