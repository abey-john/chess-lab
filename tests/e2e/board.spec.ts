import { expect, test } from '@playwright/test';

test.use({ browserName: 'firefox' });

test('interact with board, play moves, flip orientation, and resign in Firefox', async ({ page }) => {
  await page.goto('http://localhost:5173/chess-lab/');

  await expect(page.locator('.logo-title')).toHaveText('chess-lab');

  // Start game from SetupScreen
  await page.getByRole('button', { name: /Start Game/i }).click();

  await expect(page.locator('.status-text')).toContainText('Your turn');

  const board = page.locator('cg-board');
  await expect(board).toBeVisible();

  const box = await board.boundingBox();
  expect(box).not.toBeNull();
  const w = box!.width;
  const h = box!.height;
  expect(w).toBeGreaterThan(300);
  expect(h).toBeGreaterThan(300);

  const sqW = w / 8;
  const sqH = h / 8;

  const clickSquare = async (sq: string) => {
    const file = sq.charCodeAt(0) - 97;
    const rank = parseInt(sq[1], 10);
    const row = 8 - rank;
    const x = box!.x + (file + 0.5) * sqW;
    const y = box!.y + (row + 0.5) * sqH;
    await page.mouse.click(x, y);
    await page.waitForTimeout(250);
  };

  // 1. e4
  await clickSquare('e2');
  await clickSquare('e4');

  await expect(page.locator('.move-table tbody tr:first-child .white-move')).toHaveText('e4');

  // Wait for bot move
  await expect(page.locator('.move-table tbody tr:first-child .black-move')).not.toBeEmpty({
    timeout: 15000,
  });
  await expect(page.locator('.status-text')).toContainText('Your turn');

  // Take screenshot of active game after 1. e4 and bot response
  await page.screenshot({ path: 'tests/e2e/e4_bot_played.png' });

  // Test Flip Board
  const flipBtn = page.getByRole('button', { name: /Flip Board/i });
  await flipBtn.click();
  await expect(page.locator('.cg-wrap')).toHaveClass(/orientation-black/);

  await page.screenshot({ path: 'tests/e2e/flipped_board.png' });

  await flipBtn.click();
  await expect(page.locator('.cg-wrap')).toHaveClass(/orientation-white/);

  // Test Resign
  const resignBtn = page.getByRole('button', { name: /Resign/i });
  await resignBtn.click();

  const banner = page.locator('.game-over-banner');
  await expect(banner).toBeVisible();
  await expect(banner.locator('.game-over-badge')).toHaveText('0-1');
  await expect(banner.locator('.game-over-reason')).toContainText('White resigned — Black wins');

  await page.screenshot({ path: 'tests/e2e/game_resigned.png' });

  // Test New Game / Reset
  const newGameBtn = banner.getByRole('button', { name: /New Game/i });
  await newGameBtn.click();

  await expect(banner).not.toBeVisible();
  await expect(page.locator('.status-text')).toContainText('Your turn');
  await expect(page.locator('.empty-history')).toHaveText('Game started. Make a move!');

  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/e2e/game_reset.png' });
});
