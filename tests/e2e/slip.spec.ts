import { expect, test } from '@playwright/test';

test.use({ browserName: 'firefox' });

test('Slip Mode UI setup and game launch flow', async ({ page }) => {
  await page.goto('http://localhost:5173/chess-lab/');

  // 1. Verify Mode Selector buttons
  const standardBtn = page.getByRole('button', { name: 'Standard Chess' });
  const slipBtn = page.getByRole('button', { name: 'Slip Mode' });
  await expect(standardBtn).toBeVisible();
  await expect(slipBtn).toBeVisible();
  await expect(standardBtn).toHaveClass(/active/);

  // Click Slip Mode
  await slipBtn.click();
  await expect(slipBtn).toHaveClass(/active/);
  await expect(standardBtn).not.toHaveClass(/active/);

  // 2. Verify Slip Options (Severity and Frequency)
  const severityGroup = page.locator('.slip-options-group');
  await expect(severityGroup).toBeVisible();

  // Test Severity selection
  const blunderBtn = page.getByRole('button', { name: 'Blunder' });
  await blunderBtn.click();
  await expect(blunderBtn).toHaveClass(/active/);
  await expect(page.locator('.group-hint').first()).toHaveText('Game-changing error (>20% drop)');

  // Test Frequency selection
  const frequentBtn = page.getByRole('button', { name: 'Frequent' });
  await frequentBtn.click();
  await expect(frequentBtn).toHaveClass(/active/);
  await expect(page.locator('.group-hint').nth(1)).toHaveText('Every 3–4 bot moves');

  // Select Black
  const blackBtn = page.getByRole('button', { name: /Black/i });
  await blackBtn.click();

  // Capture screenshot of Slip Mode Setup screen
  await page.screenshot({ path: 'tests/e2e/slip_setup_screen.png' });

  // 3. Start Slip Game
  const startBtn = page.getByRole('button', { name: /Start Game/i });
  await startBtn.click();

  // Verify playing screen is reached
  await expect(page.locator('.cg-wrap')).toBeVisible();

  // Wait for bot to play White's opening move
  await expect(page.locator('.move-table tbody tr:first-child .white-move')).not.toBeEmpty({
    timeout: 15000,
  });

  // 4. Test In-Progress persistence for Slip Mode
  await page.reload();

  const resumeCard = page.locator('.resume-card');
  await expect(resumeCard).toBeVisible();
  await expect(resumeCard).toContainText('Slip Mode');
  await expect(resumeCard).toContainText('blunder');
  await expect(resumeCard).toContainText('frequent');

  // Discard to clean up
  await page.getByRole('button', { name: /Discard/i }).click();
  await expect(resumeCard).not.toBeVisible();
});
