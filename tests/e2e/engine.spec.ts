import { expect, test } from '@playwright/test';

test.use({ browserName: 'firefox' });

test('EngineService evaluates, generates candidates, and plays bot turns in Firefox', async ({ page }) => {
  await page.goto('http://localhost:5173/chess-lab/');

  // 1. Test EngineService methods directly in the browser context
  const engineResults = await page.evaluate(async () => {
    // Import engine service dynamically from bundle
    const { DefaultEngineService } = await import('/chess-lab/src/engine/engineService.ts');
    const engine = new DefaultEngineService();

    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    // Test evaluate
    const evalResult = await engine.evaluate(startFen, 8);

    // Test getCandidates (MultiPV = 3)
    const candidates = await engine.getCandidates(startFen, 3);

    // Test getBotMove at Elo 1500
    const botMove = await engine.getBotMove(startFen, 1500);

    engine.dispose();

    return {
      evalResult,
      candidates,
      botMove,
    };
  });

  console.log('ENGINE TEST RESULTS:', JSON.stringify(engineResults, null, 2));

  // Verify evaluate
  expect(engineResults.evalResult).toBeDefined();
  expect(engineResults.evalResult.depth).toBeGreaterThanOrEqual(8);
  expect(engineResults.evalResult.score).toBeDefined();

  // Verify getCandidates returns sorted candidates
  expect(engineResults.candidates.length).toBeGreaterThanOrEqual(1);
  expect(engineResults.candidates[0].rank).toBe(1);
  expect(engineResults.candidates[0].move).toBeDefined();

  // Verify getBotMove
  expect(engineResults.botMove).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/);

  // 2. Test live interactive game vs Stockfish Bot on the UI
  await page.reload();

  await expect(page.locator('.logo-title')).toHaveText('chess-lab');
  await expect(page.locator('.status-text')).toContainText('Your turn');

  // Verify Elo slider and initial value
  await expect(page.locator('.elo-value')).toHaveText('1500');

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

  // Human plays 1. e4
  await clickSquare('e2');
  await clickSquare('e4');

  // Verify Move List has White's 1. e4
  await expect(page.locator('.move-table tbody tr:first-child .white-move')).toHaveText('e4');

  // Wait for the Stockfish bot to respond (thinking badge appears and clears, or Black's move appears)
  await expect(page.locator('.move-table tbody tr:first-child .black-move')).not.toBeEmpty({
    timeout: 15000,
  });

  // Verify turn switches back to player
  await expect(page.locator('.status-text')).toContainText('Your turn');

  // Take screenshot of live game against Stockfish bot
  await page.screenshot({ path: 'tests/e2e/live_bot_game.png' });

  // Adjust Elo slider to 2000
  const eloSlider = page.locator('.elo-slider');
  await eloSlider.fill('2000');
  await expect(page.locator('.elo-value')).toHaveText('2000');
});
