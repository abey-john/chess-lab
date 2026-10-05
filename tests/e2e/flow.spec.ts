import { expect, test } from '@playwright/test';

test.use({ browserName: 'firefox' });

test('Milestone 4 full flow: setup screen, play as Black, in-progress resume, draw offer, and history browsing', async ({
  page,
}) => {
  await page.goto('http://localhost:5173/chess-lab/');

  // 1. Verify Setup Screen
  await expect(page.locator('.logo-title')).toHaveText('chess-lab');
  await expect(page.locator('.setup-card-title')).toHaveText('New Game Setup');

  // Verify color buttons: White, Random, Black
  const blackBtn = page.getByRole('button', { name: /Black/i });
  await blackBtn.click();
  await expect(blackBtn).toHaveClass(/active/);

  // Set Elo to 1600
  const eloSlider = page.locator('.elo-slider');
  await eloSlider.fill('1600');
  await expect(page.locator('.elo-number')).toHaveText('1600');

  // Start game as Black
  const startBtn = page.getByRole('button', { name: /Start Game/i });
  await startBtn.click();

  // 2. Playing as Black: Verify orientation and bot plays 1st move
  await expect(page.locator('.cg-wrap')).toHaveClass(/orientation-black/);
  await expect(page.locator('.game-info-card')).toContainText(/black/i);
  await expect(page.locator('.game-info-card')).toContainText('1600 Elo');

  // Bot plays White's move automatically
  await expect(page.locator('.move-table tbody tr:first-child .white-move')).not.toBeEmpty({
    timeout: 15000,
  });
  await expect(page.locator('.status-text')).toContainText('Your turn');

  // Take screenshot of bot having made the first move as White
  await page.screenshot({ path: 'tests/e2e/bot_white_first_move.png' });

  // 3. Test In-Progress Persistence & Resume
  // Reload the browser page mid-game
  await page.reload();

  // SetupScreen should display the "In-Progress Game Found" resume card
  const resumeCard = page.locator('.resume-card');
  await expect(resumeCard).toBeVisible();
  await expect(resumeCard.locator('.resume-badge')).toHaveText('In-Progress Game Found');
  await expect(resumeCard).toContainText(/black/i);
  await expect(resumeCard).toContainText('1600');

  // Click Resume Game
  const resumeBtn = resumeCard.getByRole('button', { name: /Resume Game/i });
  await resumeBtn.click();

  // Verify position and move history restored on GameScreen
  await expect(page.locator('.cg-wrap')).toHaveClass(/orientation-black/);
  await expect(page.locator('.move-table tbody tr:first-child .white-move')).not.toBeEmpty();
  await expect(page.locator('.status-text')).toContainText('Your turn');

  // 4. Test History Browsing
  // Click on the first move in MoveList
  const firstMoveCell = page.locator('.move-table tbody tr:first-child .white-move');
  await firstMoveCell.click();

  // Banner should indicate read-only history browsing
  await expect(page.locator('.history-browsing-banner')).toBeVisible();
  await expect(page.locator('.browsing-label')).toContainText('Browsing: Ply 1 (Read-only)');

  // Click Jump to Live
  const jumpLiveBtn = page.locator('.jump-live-btn');
  await jumpLiveBtn.click();
  await expect(page.locator('.history-browsing-banner')).not.toBeVisible();

  // 5. Test Offer Draw
  const offerDrawBtn = page.getByRole('button', { name: /Offer Draw/i });
  await offerDrawBtn.click();

  // A draw toast appears (either offering or declined)
  await expect(page.locator('.draw-toast')).toBeVisible();

  // 6. Test Return to Setup and Discard
  const setupNavBtn = page.locator('.setup-nav-btn');
  await setupNavBtn.click();

  // Verify back on SetupScreen with resume card still available
  await expect(page.locator('.setup-card-title')).toHaveText('New Game Setup');
  await expect(page.locator('.resume-card')).toBeVisible();

  // Discard the in-progress game
  const discardBtn = page.locator('.discard-btn');
  await discardBtn.click();

  // Resume card should be gone
  await expect(page.locator('.resume-card')).not.toBeVisible();
});
