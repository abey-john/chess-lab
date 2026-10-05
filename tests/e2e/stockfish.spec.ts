import { expect, test } from '@playwright/test';

test.use({ browserName: 'firefox' });

test('stockfish worker initializes and responds to UCI commands', async ({ page }) => {
  await page.goto('http://localhost:5173/chess-lab/');

  const uciResponses = await page.evaluate(async (engineUrl) => {
    return new Promise<string[]>((resolve, reject) => {
      const worker = new Worker(engineUrl);
      const lines: string[] = [];

      worker.onmessage = (e) => {
        lines.push(e.data);
        if (e.data === 'uciok') {
          worker.terminate();
          resolve(lines);
        }
      };

      worker.onerror = (err) => {
        reject(err.message || 'Worker error');
      };

      worker.postMessage('uci');

      setTimeout(() => {
        worker.terminate();
        resolve(lines);
      }, 5000);
    });
  }, 'http://localhost:5173/chess-lab/engine/stockfish-nnue-16-single.js');

  console.log('UCI OUTPUT COUNT:', uciResponses.length);
  const uciOk = uciResponses.includes('uciok');
  console.log('HAS uciok:', uciOk);

  const eloLine = uciResponses.find((l) => l.includes('UCI_Elo'));
  console.log('ELO OPTION:', eloLine);

  const limitLine = uciResponses.find((l) => l.includes('UCI_LimitStrength'));
  console.log('LIMIT OPTION:', limitLine);

  expect(uciOk).toBe(true);
});
