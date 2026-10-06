import { expect, test } from '@playwright/test';
import type { SavedGame } from '../../src/game/types';

test.use({ browserName: 'firefox' });

test('Milestone 2.4: Slip Mode post-game review screen and ModeReviewExtras breakdown', async ({
  page,
}) => {
  await page.goto('http://localhost:5173/chess-lab/');

  // Inject a mock completed Slip Mode game with analysis into localStorage
  const mockSlipGame: SavedGame = {
    version: 1,
    id: 'e2e-slip-test-game',
    mode: 'slip',
    startedAt: '2026-10-05T15:30:00.000Z',
    config: {
      mode: 'slip',
      playerColor: 'white',
      elo: 1600,
      botDelay: false,
      severity: 'blunder',
      frequency: 'frequent',
    },
    result: '1-0',
    resultReason: 'checkmate',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O g5 5. Nxg5',
    tags: [
      { ply: 1, fenBefore: 'start', san: 'e4', by: 'player' },
      { ply: 2, fenBefore: 'fen1', san: 'e5', by: 'bot' },
      { ply: 3, fenBefore: 'fen2', san: 'Nf3', by: 'player' },
      { ply: 4, fenBefore: 'fen3', san: 'Nc6', by: 'bot' },
      { ply: 5, fenBefore: 'fen4', san: 'Bc4', by: 'player' },
      { ply: 6, fenBefore: 'fen5', san: 'Bc5', by: 'bot' },
      { ply: 7, fenBefore: 'fen6', san: 'O-O', by: 'player' },
      {
        ply: 8,
        fenBefore: 'fen7',
        san: 'g5',
        by: 'bot',
        slip: {
          requestedSeverity: 'blunder',
          measuredDrop: 28.5,
          measuredSeverity: 'blunder',
          fallbackUsed: 'none',
          rankPlayed: 4,
        },
      },
      { ply: 9, fenBefore: 'fen8', san: 'Nxg5', by: 'player' },
    ],
    analysis: [
      { ply: 0, score: { kind: 'cp', value: 0 }, depth: 14 },
      { ply: 1, score: { kind: 'cp', value: 0 }, depth: 14 },
      { ply: 2, score: { kind: 'cp', value: 0 }, depth: 14 },
      { ply: 3, score: { kind: 'cp', value: 0 }, depth: 14 },
      { ply: 4, score: { kind: 'cp', value: 0 }, depth: 14 },
      { ply: 5, score: { kind: 'cp', value: 0 }, depth: 14 },
      { ply: 6, score: { kind: 'cp', value: 0 }, depth: 14 },
      { ply: 7, score: { kind: 'cp', value: 0 }, depth: 14 },
      { ply: 8, score: { kind: 'cp', value: 320 }, depth: 14 }, // White +3.20 (ply 8)
      { ply: 9, score: { kind: 'cp', value: -320 }, depth: 14 },
    ],
  };

  await page.evaluate((game) => {
    localStorage.setItem('chesslab:games:v1', JSON.stringify([game]));
  }, mockSlipGame);

  // Reload page to read the mock game into SetupScreen past games
  await page.reload();

  const pastGamesList = page.locator('.past-games-list');
  await expect(pastGamesList).toBeVisible();
  await expect(pastGamesList).toContainText('Slip Mode');

  // Click Review
  const reviewBtn = page.getByRole('button', { name: /Review/i });
  await reviewBtn.click();

  // 1. Verify Review Screen loaded
  await expect(page.locator('.review-header')).toBeVisible();
  await expect(page.locator('.review-mode-badge')).toHaveText('Slip Mode');

  // 2. Verify EvalGraph slip indicator
  const graphLegend = page.locator('.graph-legend');
  await expect(graphLegend).toContainText('Bot Slip');
  const slipMarker = page.locator('.node-marker.slip-marker');
  await expect(slipMarker).toBeVisible();

  // 3. Verify ModeReviewExtras section
  const slipSection = page.locator('.slip-review-card');
  await expect(slipSection).toBeVisible();
  await expect(slipSection.locator('.slip-review-title')).toHaveText('🎯 Slip Mode Analysis');

  // Check stat boxes
  await expect(slipSection.locator('.slip-stat-box.total .stat-num')).toHaveText('1');
  await expect(slipSection.locator('.slip-stat-box.capitalized .stat-num')).toHaveText('1');
  await expect(slipSection.locator('.slip-stat-box.missed .stat-num')).toHaveText('0');
  await expect(slipSection.locator('.slip-stat-box.squandered .stat-num')).toHaveText('0');

  // Check slip table details
  const slipRow = slipSection.locator('.slip-table tbody tr').first();
  await expect(slipRow).toContainText('4... g5');
  await expect(slipRow).toContainText('blunder');
  await expect(slipRow).toContainText('-28.5%');
  await expect(slipRow).toContainText('Direct');
  await expect(slipRow).toContainText('Nxg5');
  await expect(slipRow.locator('.verdict-pill')).toHaveText('Capitalized 🎯');

  // Click Inspect 🔍
  const inspectBtn = slipRow.locator('.slip-jump-btn');
  await inspectBtn.click();

  // Verify board jumped to position before the slip (ply 7)
  await expect(page.locator('.graph-active-readout')).toContainText('Ply 7');

  // Capture full screenshot of Slip Mode Review Screen
  await page.screenshot({ path: 'tests/e2e/slip_review_screen.png', fullPage: true });
});
