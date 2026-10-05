import { expect, test } from '@playwright/test';

test.use({ browserName: 'firefox' });

test('Milestone 5: complete post-game review flow with eval graph, replay, and cached re-entry in Firefox', async ({
  page,
}) => {
  await page.goto('http://localhost:5173/chess-lab/');

  // 1. Start a game from SetupScreen
  await expect(page.locator('.logo-title')).toHaveText('chess-lab');
  const startBtn = page.getByRole('button', { name: /Start Game/i });
  await startBtn.click();

  // 2. Play 1. e4 and wait for Bot response
  const board = page.locator('cg-board');
  await expect(board).toBeVisible();

  const box = await board.boundingBox();
  expect(box).not.toBeNull();
  const sqW = box!.width / 8;
  const sqH = box!.height / 8;

  const clickSquare = async (sq: string) => {
    const file = sq.charCodeAt(0) - 97;
    const rank = parseInt(sq[1], 10);
    const row = 8 - rank;
    const x = box!.x + (file + 0.5) * sqW;
    const y = box!.y + (row + 0.5) * sqH;
    await page.mouse.click(x, y);
    await page.waitForTimeout(200);
  };

  // 1. e4
  await clickSquare('e2');
  await clickSquare('e4');

  // Wait for bot to play
  await expect(page.locator('.move-table tbody tr:first-child .black-move')).not.toBeEmpty({
    timeout: 15000,
  });

  // 3. Resign game to trigger Game Over
  const resignBtn = page.getByRole('button', { name: /Resign/i });
  await resignBtn.click();

  // 4. Game Over Banner: verify and click Review Game
  const banner = page.locator('.game-over-banner');
  await expect(banner).toBeVisible();
  const reviewBtn = banner.getByRole('button', { name: /Review Game/i });
  await expect(reviewBtn).toBeVisible();
  await reviewBtn.click();

  // 5. Review Screen Verification
  await expect(page.locator('.logo-title')).toHaveText('Game Review');

  // Verify Summary card with accuracies
  await expect(page.locator('.review-summary-card')).toBeVisible();
  await expect(page.locator('.white-side .accuracy-badge')).toContainText('% Accuracy');
  await expect(page.locator('.black-side .accuracy-badge')).toContainText('% Accuracy');

  // Verify Eval Graph is rendered
  const evalGraph = page.locator('.eval-graph-container');
  await expect(evalGraph).toBeVisible();
  await expect(evalGraph.locator('.eval-line')).toBeVisible();

  // Verify Move Classification list
  const reviewMoveList = page.locator('.review-move-list');
  await expect(reviewMoveList).toBeVisible();
  await expect(reviewMoveList.locator('.review-move-row')).toHaveCount(2);

  // Take screenshot of Review Screen
  await page.screenshot({ path: 'tests/e2e/review_screen_full.png', fullPage: true });

  // 6. Test board navigation and graph interaction
  const navNextBtn = page.getByRole('button', { name: 'Next Move' });
  await navNextBtn.click();

  // Click on ply 1 in the review table
  const ply1Row = reviewMoveList.locator('.review-move-row').first();
  await ply1Row.click();
  await expect(ply1Row).toHaveClass(/active-row/);

  // 7. Test Back to Setup and Cached Re-entry
  const backBtn = page.getByRole('button', { name: 'Back' });
  await backBtn.click();

  // On SetupScreen, Completed Games card should be visible
  const pastGamesCard = page.locator('.past-games-card');
  await expect(pastGamesCard).toBeVisible();
  await expect(pastGamesCard.locator('.past-game-item')).toHaveCount(1);

  // Click Review from past games list
  const pastReviewBtn = pastGamesCard.locator('.review-link-btn').first();
  await pastReviewBtn.click();

  // ReviewScreen reopens instantly with cached analysis (no progress banner needed)
  await expect(page.locator('.logo-title')).toHaveText('Game Review');
  await expect(page.locator('.review-summary-card')).toBeVisible();
});
