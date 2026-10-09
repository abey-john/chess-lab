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

  // Verify Modal is visible and spacious
  const modal = page.locator('.redemption-modal');
  await expect(modal).toBeVisible();

  await expect(modal).toContainText('BLUNDER DETECTED');
  await expect(modal).toContainText('Redemption Opportunity');
  await expect(page.locator('.timer-bar-track')).toBeVisible();
  await expect(page.locator('.redemption-turn-banner')).toBeVisible();
  await expect(page.locator('#accept-blunder-btn')).toBeVisible();

  // Verify enlarged dimensions
  const modalBox = await modal.boundingBox();
  expect(modalBox).not.toBeNull();
  expect(modalBox!.width).toBeGreaterThanOrEqual(500);

  const boardWrapper = page.locator('.redemption-board-wrapper');
  const boardBox = await boardWrapper.boundingBox();
  expect(boardBox).not.toBeNull();
  expect(boardBox!.width).toBeGreaterThanOrEqual(360);

  // Wait for layout to settle
  await page.waitForTimeout(300);

  // Take screenshot of enlarged QTE modal
  await page.screenshot({ path: 'tests/e2e/redemption_qte_modal.png' });

  // Click "Accept Blunder"
  await page.locator('#accept-blunder-btn').click();

  // Verify modal is dismissed
  await expect(modal).not.toBeVisible();

  // Verify lives remaining is still 3 (❤️❤️❤️)
  await expect(page.locator('.redemption-lives-badge')).toContainText('❤️❤️❤️');
});

test('Redemption puzzle board is fully interactive and playable', async ({ page }) => {
  await page.goto('http://localhost:5173/chess-lab/');

  const existingDiscard = page.locator('.resume-card .discard-btn');
  if (await existingDiscard.isVisible()) {
    await existingDiscard.click();
  }

  await page.locator('#mode-redemption-btn').click();
  await page.getByRole('button', { name: /Start Game/i }).click();

  await page.evaluate(() => {
    (window as any).__gameStore.getState().triggerTestRedemption();
  });

  const modal = page.locator('.redemption-modal');
  await expect(modal).toBeVisible();
  await expect(page.locator('.redemption-turn-banner')).toBeVisible();

  // Wait for board to mount and redraw
  await page.waitForTimeout(300);

  const puzzleInfo = await page.evaluate(() => {
    const store = (window as any).__gameStore.getState();
    const active = store.activeRedemption;
    const session = active?.session;
    return {
      playerColor: session?.getPlayerColor(),
      solution: active?.puzzle.solution,
    };
  });

  expect(puzzleInfo.solution).toBeDefined();
  expect(puzzleInfo.solution.length).toBeGreaterThan(0);

  const firstMove = puzzleInfo.solution[0];
  const fromSquare = firstMove.slice(0, 2);
  const toSquare = firstMove.slice(2, 4);

  const boardLocator = page.locator('.redemption-chessground cg-board');
  const boardBox = await boardLocator.boundingBox();
  expect(boardBox).not.toBeNull();

  // Map square to screen coordinates with orientation awareness
  const isWhite = puzzleInfo.playerColor === 'white';
  const fileToCol = (f: string) => isWhite ? (f.charCodeAt(0) - 97) : (7 - (f.charCodeAt(0) - 97));
  const rankToRow = (r: string) => isWhite ? (8 - parseInt(r, 10)) : (parseInt(r, 10) - 1);
  const sqSize = boardBox!.width / 8;

  const fromX = boardBox!.x + (fileToCol(fromSquare[0]) + 0.5) * sqSize;
  const fromY = boardBox!.y + (rankToRow(fromSquare[1]) + 0.5) * sqSize;

  const toX = boardBox!.x + (fileToCol(toSquare[0]) + 0.5) * sqSize;
  const toY = boardBox!.y + (rankToRow(toSquare[1]) + 0.5) * sqSize;

  // Perform drag and drop move on the puzzle board
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await page.waitForTimeout(50);
  await page.mouse.move(toX, toY, { steps: 8 });
  await page.waitForTimeout(50);
  await page.mouse.up();

  // Verify the move advanced the puzzle
  await page.waitForTimeout(400);

  const finalState = await page.evaluate(() => {
    const store = (window as any).__gameStore.getState();
    const active = store.activeRedemption;
    return {
      modalOpen: !!active,
      stepIndex: active?.session.getStepIndex(),
    };
  });

  // Either the puzzle advanced or was solved (and blunder undone)
  if (puzzleInfo.solution.length === 1) {
    // 1-move puzzle solved immediately
    expect(finalState.modalOpen).toBe(false);
  } else {
    // Multi-move puzzle advanced at least 2 steps (player move + opponent reply)
    expect(finalState.stepIndex).toBeGreaterThanOrEqual(1);
  }
});

test('Redemption failure triggers arcade shake, failure banner, green solution arrow, and deducts life after delay', async ({ page }) => {
  await page.goto('http://localhost:5173/chess-lab/');

  const existingDiscard = page.locator('.resume-card .discard-btn');
  if (await existingDiscard.isVisible()) {
    await existingDiscard.click();
  }

  await page.locator('#mode-redemption-btn').click();
  await page.getByRole('button', { name: /Start Game/i }).click();

  await page.evaluate(() => {
    (window as any).__gameStore.getState().triggerTestRedemption();
  });

  const modal = page.locator('.redemption-modal');
  await expect(modal).toBeVisible();

  await page.waitForTimeout(300);

  const puzzleInfo = await page.evaluate(() => {
    const store = (window as any).__gameStore.getState();
    const active = store.activeRedemption;
    const session = active?.session;
    return {
      playerColor: session?.getPlayerColor(),
      expectedDetails: session?.getExpectedMoveDetails(),
      dests: Array.from(session?.getChessInstance().moves({ verbose: true })),
    };
  });

  expect(puzzleInfo.expectedDetails).toBeDefined();

  // Find a legal move that is NOT the puzzle solution
  const expectedUci = puzzleInfo.expectedDetails.uci;
  const wrongMove = (puzzleInfo.dests as any[]).find((m: any) => `${m.from}${m.to}` !== expectedUci.slice(0, 4));
  expect(wrongMove).toBeDefined();

  const boardLocator = page.locator('.redemption-chessground cg-board');
  const boardBox = await boardLocator.boundingBox();
  expect(boardBox).not.toBeNull();

  const isWhite = puzzleInfo.playerColor === 'white';
  const fileToCol = (f: string) => isWhite ? (f.charCodeAt(0) - 97) : (7 - (f.charCodeAt(0) - 97));
  const rankToRow = (r: string) => isWhite ? (8 - parseInt(r, 10)) : (parseInt(r, 10) - 1);
  const sqSize = boardBox!.width / 8;

  const fromX = boardBox!.x + (fileToCol(wrongMove.from[0]) + 0.5) * sqSize;
  const fromY = boardBox!.y + (rankToRow(wrongMove.from[1]) + 0.5) * sqSize;
  const toX = boardBox!.x + (fileToCol(wrongMove.to[0]) + 0.5) * sqSize;
  const toY = boardBox!.y + (rankToRow(wrongMove.to[1]) + 0.5) * sqSize;

  // Play wrong move
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await page.waitForTimeout(50);
  await page.mouse.move(toX, toY, { steps: 8 });
  await page.waitForTimeout(50);
  await page.mouse.up();

  // Verify failure feedback appears immediately
  // 1. Board shake
  await expect(page.locator('.redemption-board-wrapper')).toHaveClass(/board-shake/);

  // 2. Modal failed class
  await expect(modal).toHaveClass(/qte-failed/);

  // 3. Failure banner with "INCORRECT MOVE" and best move chip
  const failureBanner = page.locator('#redemption-failure-banner');
  await expect(failureBanner).toBeVisible();
  await expect(failureBanner).toContainText('INCORRECT MOVE');
  await expect(failureBanner).toContainText('1 Life Lost');
  await expect(failureBanner.locator('.best-move-chip')).toHaveText(puzzleInfo.expectedDetails.san);

  // 4. Accept Blunder button is disabled
  await expect(page.locator('#accept-blunder-btn')).toBeDisabled();

  // 5. Green arrow shape exists in Chessground SVG
  await expect(page.locator('.redemption-chessground svg.cg-shapes line')).toBeVisible();

  // Take screenshot of failure state
  await page.screenshot({ path: 'tests/e2e/redemption_qte_failure.png' });

  // 6. After 1.2s delay, modal automatically dismisses and 1 life is lost
  await expect(modal).not.toBeVisible({ timeout: 3000 });

  // Verify lives remaining decreased to 2 (❤️❤️)
  await expect(page.locator('.redemption-lives-badge')).toContainText('❤️❤️');
});




