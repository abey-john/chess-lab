import { expect, test } from '@playwright/test';
import type { SavedGame } from '../../src/game/types';

test.use({ browserName: 'firefox' });

test('Redemption Mode post-game review screen and ModeReviewExtras breakdown', async ({
  page,
}) => {
  await page.goto('http://localhost:5173/chess-lab/');

  // Clean up any stale state
  await page.evaluate(() => {
    localStorage.clear();
  });

  // Inject a mock completed Redemption Mode game with analysis into localStorage
  const mockRedemptionGame: SavedGame = {
    version: 1,
    id: 'e2e-redemption-test-game',
    mode: 'redemption',
    startedAt: '2026-10-08T15:30:00.000Z',
    config: {
      mode: 'redemption',
      playerColor: 'white',
      elo: 1600,
      botDelay: false,
      lives: 3,
    },
    result: '0-1',
    resultReason: 'checkmate',
    pgn: '1. e4 e5 2. f4 exf4 3. g4 Qh4#',
    tags: [
      { ply: 1, fenBefore: 'start', san: 'e4', by: 'player' },
      { ply: 2, fenBefore: 'fen1', san: 'e5', by: 'bot' },
      { ply: 3, fenBefore: 'fen2', san: 'f4', by: 'player' },
      { ply: 4, fenBefore: 'fen3', san: 'exf4', by: 'bot' },
      {
        ply: 5,
        fenBefore: 'fen4',
        san: 'g4',
        by: 'player',
        redemption: {
          attempted: false,
          outcome: 'accepted',
          puzzleId: 'puzzle_test_01',
          puzzleRating: 1580,
        },
      },
      { ply: 6, fenBefore: 'fen5', san: 'Qh4#', by: 'bot' },
    ],
    strategyState: {
      livesRemaining: 3,
      usedPuzzleIds: ['puzzle_test_01'],
      redemptionEvents: [
        {
          blunderPly: 5,
          san: 'g4',
          puzzleId: 'puzzle_test_01',
          puzzleRating: 1580,
          outcome: 'accepted',
          timeSpentMs: 3800,
        },
      ],
    },
    analysis: [
      { ply: 0, score: { kind: 'cp', value: 0 }, depth: 14 },
      { ply: 1, score: { kind: 'cp', value: 0 }, depth: 14 },
      { ply: 2, score: { kind: 'cp', value: 0 }, depth: 14 },
      { ply: 3, score: { kind: 'cp', value: -20 }, depth: 14 },
      { ply: 4, score: { kind: 'cp', value: 20 }, depth: 14 },
      { ply: 5, score: { kind: 'cp', value: -850 }, depth: 14 }, // Blunder
      { ply: 6, score: { kind: 'mate', value: 0 }, depth: 14 },
    ],
  };

  await page.evaluate((game) => {
    localStorage.setItem('chesslab:games:v1', JSON.stringify([game]));
  }, mockRedemptionGame);

  // Reload page to read the mock game into SetupScreen past games
  await page.reload();

  const pastGamesList = page.locator('.past-games-list');
  await expect(pastGamesList).toBeVisible();
  await expect(pastGamesList).toContainText('Redemption');

  // Click Review
  const reviewBtn = page.getByRole('button', { name: /Review/i });
  await reviewBtn.click();

  // 1. Verify Review Screen loaded
  await expect(page.locator('.review-header')).toBeVisible();
  await expect(page.locator('.review-mode-badge')).toHaveText('Redemption');

  // 2. Verify EvalGraph redemption indicator and legend
  const graphLegend = page.locator('.graph-legend');
  await expect(graphLegend).toContainText('Redemption');
  const redemptionMarker = page.locator('.node-marker.redemption-marker');
  await expect(redemptionMarker).toBeVisible();

  // 3. Verify ModeReviewExtras Redemption breakdown section
  const redemptionSection = page.locator('.redemption-review-card');
  await expect(redemptionSection).toBeVisible();
  await expect(redemptionSection.locator('.redemption-review-title')).toHaveText(
    '🔥 Redemption Mode Breakdown'
  );

  // Check stat boxes
  await expect(redemptionSection.locator('.redemption-stat-box.total .stat-num')).toHaveText('1');
  await expect(redemptionSection.locator('.redemption-stat-box.accepted .stat-num')).toHaveText('1');
  await expect(redemptionSection.locator('.redemption-stat-box.solved .stat-num')).toHaveText('0');
  await expect(redemptionSection.locator('.redemption-stat-box.failed .stat-num')).toHaveText('0');
  await expect(redemptionSection.locator('.redemption-stat-box.lives .stat-num')).toHaveText('3');

  // Check redemption table details
  const redemptionRow = redemptionSection.locator('.redemption-table tbody tr').first();
  await expect(redemptionRow).toContainText('3. g4');
  await expect(redemptionRow).toContainText('1580');
  await expect(redemptionRow).toContainText('Accepted ⚡');
  await expect(redemptionRow).toContainText('0 Lives');
  await expect(redemptionRow).toContainText('3.8s');

  // Click Inspect 🔍
  const inspectBtn = redemptionRow.locator('.redemption-jump-btn');
  await inspectBtn.click();

  // Verify board jumped to position at blunder (ply 5)
  await expect(page.locator('.graph-active-readout')).toContainText('Ply 5');

  // Capture full screenshot of Redemption Mode Review Screen
  await page.screenshot({ path: 'tests/e2e/redemption_review_screen.png', fullPage: true });
});
