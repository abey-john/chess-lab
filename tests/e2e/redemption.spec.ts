import { expect, test } from '@playwright/test';

test.use({ browserName: 'firefox' });

test('Redemption Mode UI setup and game launch flow', async ({ page }) => {
  await page.goto('http://localhost:5173/chess-lab/');

  // Clean up any stale in-progress game before running
  const existingDiscard = page.locator('.resume-card .discard-btn');
  if (await existingDiscard.isVisible()) {
    await existingDiscard.click();
  }

  // 1. Verify Mode Selector buttons
  const standardBtn = page.getByRole('button', { name: 'Standard Chess' });
  const slipBtn = page.getByRole('button', { name: 'Slip Mode' });
  const redemptionBtn = page.locator('#mode-redemption-btn');

  await expect(standardBtn).toBeVisible();
  await expect(slipBtn).toBeVisible();
  await expect(redemptionBtn).toBeVisible();
  await expect(standardBtn).toHaveClass(/active/);

  // Click Redemption Mode
  await redemptionBtn.click();
  await expect(redemptionBtn).toHaveClass(/active/);
  await expect(standardBtn).not.toHaveClass(/active/);

  // 2. Verify Redemption Options (Lives selector)
  const optionsGroup = page.locator('.redemption-options-group');
  await expect(optionsGroup).toBeVisible();

  const lives1Btn = page.locator('#lives-1-btn');
  const lives3Btn = page.locator('#lives-3-btn');
  const livesUnlimitedBtn = page.locator('#lives-unlimited-btn');

  await expect(lives1Btn).toBeVisible();
  await expect(lives3Btn).toBeVisible();
  await expect(livesUnlimitedBtn).toBeVisible();
  // Default is 3 lives
  await expect(lives3Btn).toHaveClass(/active/);

  // Test selecting 1 Life
  await lives1Btn.click();
  await expect(lives1Btn).toHaveClass(/active/);
  await expect(page.locator('.group-hint').first()).toHaveText('Hardcore: 1 redo chance');

  // Test selecting Unlimited
  await livesUnlimitedBtn.click();
  await expect(livesUnlimitedBtn).toHaveClass(/active/);
  await expect(page.locator('.group-hint').first()).toHaveText('Casual / Training: Unlimited redos');

  // Switch back to 3 Lives
  await lives3Btn.click();
  await expect(lives3Btn).toHaveClass(/active/);

  // Select Black so bot makes the first move
  const blackBtn = page.getByRole('button', { name: /Black/i });
  await blackBtn.click();

  // Capture screenshot of Redemption Setup Screen
  await page.screenshot({ path: 'tests/e2e/redemption_setup_screen.png' });

  // 3. Start Game
  const startBtn = page.getByRole('button', { name: /Start Game/i });
  await startBtn.click();

  // Verify playing screen is reached
  await expect(page.locator('.chessground-container')).toBeVisible();

  // Verify Mode and Lives in sidebar info card
  const infoCard = page.locator('.game-info-card');
  await expect(infoCard).toContainText('redemption');
  await expect(page.locator('.redemption-lives-badge')).toBeVisible();
  await expect(page.locator('.redemption-lives-badge')).toContainText('❤️❤️❤️');

  // Wait for bot to play White's opening move
  await expect(page.locator('.move-table tbody tr:first-child .white-move')).not.toBeEmpty({
    timeout: 15000,
  });

  // 4. Test In-Progress persistence
  await page.reload();

  const resumeCard = page.locator('.resume-card');
  await expect(resumeCard).toBeVisible();
  await expect(resumeCard).toContainText(/redemption/i);

  // Discard to clean up
  await page.getByRole('button', { name: /Discard/i }).click();
  await expect(resumeCard).not.toBeVisible();
});

test('Redemption QTE modal renders correctly and Accept Blunder works', async ({ page }) => {
  await page.goto('http://localhost:5173/chess-lab/');

  const existingDiscard = page.locator('.resume-card .discard-btn');
  if (await existingDiscard.isVisible()) {
    await existingDiscard.click();
  }

  // Start Redemption mode
  await page.locator('#mode-redemption-btn').click();
  await page.getByRole('button', { name: /Start Game/i }).click();
  await expect(page.locator('.chessground-container')).toBeVisible();

  // Trigger active redemption cleanly using real puzzle session
  await page.evaluate(() => {
    (window as any).__gameStore.getState().triggerTestRedemption();
  });

  // Verify Modal is visible
  const modal = page.locator('.redemption-modal');
  await expect(modal).toBeVisible();

  await expect(modal).toContainText('BLUNDER DETECTED');
  await expect(modal).toContainText('Redemption Opportunity');
  await expect(page.locator('.timer-bar-track')).toBeVisible();
  await expect(page.locator('#accept-blunder-btn')).toBeVisible();

  // Wait for fade-in animation to complete
  await page.waitForTimeout(300);

  // Take screenshot of QTE modal
  await page.screenshot({ path: 'tests/e2e/redemption_qte_modal.png' });

  // Click "Accept Blunder"
  await page.locator('#accept-blunder-btn').click();

  // Verify modal is dismissed
  await expect(modal).not.toBeVisible();

  // Verify lives remaining is still 3 (❤️❤️❤️)
  await expect(page.locator('.redemption-lives-badge')).toContainText('❤️❤️❤️');
});
