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

test('evaluate moves 103 to 117 of user game', async ({ page }) => {
  await page.goto('http://localhost:5173/chess-lab/');

  const { Chess } = await import('chess.js');
  const moves = [
    'e4','c6','d4','Nf6','e5','Ng8','Nf3','d5','exd6','Nf6','dxe7','Qxe7+','Qe2','h6','Nc3','Qxe2+','Bxe2','Be6','O-O','Be7','Re1','Na6','a4','Nb4','Na2','a5','Nxb4','Bxb4','c3','Be7','c4','b6','d5','Bd7','dxc6','h5','cxd7+','Nxd7','c5','Nxc5','b4','axb4','Bb2','O-O-O','Bxg7','Rhf8','Bxf8','Bxf8','Rec1','Bh6','Rc2','b3','Rc3','Kb7','a5','Bg7','Rc4','Bxa1','axb6','Re8','Rxc5','Re6','h4','Rxe2','Rxh5','Kxb6','Rh6+','Kb5','Rh5+','Re5','Rxe5+','Bxe5','Nd2','Kc5','Nxb3+','Kd6','h5','Kd5','h6','Bd6','h7','Be5','f4','Bc3','Nd2','Ke6','Ne4','Ba1','g4','f6','Nxf6','Bxf6','g5','Bc3','Kg2','Bd4','Kf3','Kf5','Kg3','Bf6','gxf6','Kxf6','h8=Q+','Ke7','Qe5+','Kd7','f5','Kc8','f6','Kd7','f7','Kc8','f8=Q+','Kb7','Qb5+','Ka7','Qfb8#'
  ];
  const chess = new Chess();
  const positions: { ply: number; san: string; fen: string }[] = [];
  for (let i = 0; i < moves.length; i++) {
    chess.move(moves[i]);
    positions.push({ ply: i + 1, san: moves[i], fen: chess.fen() });
  }

  const results = await page.evaluate(async ({ engineUrl, endgamePositions }) => {
    const worker = new Worker(engineUrl);
    await new Promise((res) => {
      worker.onmessage = (e) => {
        if (e.data === 'uciok') worker.postMessage('isready');
        if (e.data === 'readyok') res(null);
      };
      worker.postMessage('uci');
    });

    const evaluated = [];
    for (const pos of endgamePositions) {
      const lines = await new Promise<string[]>((res) => {
        const out: string[] = [];
        worker.onmessage = (e) => {
          out.push(e.data);
          if (e.data.startsWith('bestmove')) res(out);
        };
        worker.postMessage(`position fen ${pos.fen}`);
        worker.postMessage('go depth 12');
      });

      const lastLine = lines.filter(l => l.includes('score')).pop();
      evaluated.push({ ply: pos.ply, san: pos.san, fen: pos.fen, lastLine });
    }
    worker.terminate();
    return evaluated;
  }, {
    engineUrl: 'http://localhost:5173/chess-lab/engine/stockfish-nnue-16-single.js',
    endgamePositions: positions.slice(102), // plies 103 to 117
  });

  console.log('EVALUATED ENDGAME MOVES:\n', JSON.stringify(results, null, 2));
});

test('render review screen for user game and inspect move table scores', async ({ page }) => {
  const { Chess } = await import('chess.js');
  const moves = [
    'e4','c6','d4','Nf6','e5','Ng8','Nf3','d5','exd6','Nf6','dxe7','Qxe7+','Qe2','h6','Nc3','Qxe2+','Bxe2','Be6','O-O','Be7','Re1','Na6','a4','Nb4','Na2','a5','Nxb4','Bxb4','c3','Be7','c4','b6','d5','Bd7','dxc6','h5','cxd7+','Nxd7','c5','Nxc5','b4','axb4','Bb2','O-O-O','Bxg7','Rhf8','Bxf8','Bxf8','Rec1','Bh6','Rc2','b3','Rc3','Kb7','a5','Bg7','Rc4','Bxa1','axb6','Re8','Rxc5','Re6','h4','Rxe2','Rxh5','Kxb6','Rh6+','Kb5','Rh5+','Re5','Rxe5+','Bxe5','Nd2','Kc5','Nxb3+','Kd6','h5','Kd5','h6','Bd6','h7','Be5','f4','Bc3','Nd2','Ke6','Ne4','Ba1','g4','f6','Nxf6','Bxf6','g5','Bc3','Kg2','Bd4','Kf3','Kf5','Kg3','Bf6','gxf6','Kxf6','h8=Q+','Ke7','Qe5+','Kd7','f5','Kc8','f6','Kd7','f7','Kc8','f8=Q+','Kb7','Qb5+','Ka7','Qfb8#'
  ];
  const chess = new Chess();
  const tags: any[] = [];
  for (let i = 0; i < moves.length; i++) {
    const fenBefore = chess.fen();
    chess.move(moves[i]);
    tags.push({
      ply: i + 1,
      fenBefore,
      san: moves[i],
      by: i % 2 === 0 ? 'player' : 'bot',
    });
  }

  // Pre-populate analysis matching Stockfish evaluations
  const analysis: any[] = [{ ply: 0, score: { kind: 'cp', value: 20 }, depth: 12 }];
  for (let i = 1; i <= 102; i++) {
    analysis.push({ ply: i, score: { kind: 'cp', value: 0 }, depth: 12 });
  }
  analysis.push({ ply: 103, score: { kind: 'cp', value: -3667 }, depth: 12 });
  analysis.push({ ply: 104, score: { kind: 'cp', value: 4265 }, depth: 12 });
  analysis.push({ ply: 105, score: { kind: 'cp', value: -4301 }, depth: 12 });
  analysis.push({ ply: 106, score: { kind: 'cp', value: 4284 }, depth: 12 });
  analysis.push({ ply: 107, score: { kind: 'mate', value: -7 }, depth: 12 });
  analysis.push({ ply: 108, score: { kind: 'mate', value: 7 }, depth: 12 });
  analysis.push({ ply: 109, score: { kind: 'mate', value: -5 }, depth: 12 });
  analysis.push({ ply: 110, score: { kind: 'mate', value: 4 }, depth: 12 });
  analysis.push({ ply: 111, score: { kind: 'mate', value: -3 }, depth: 12 });
  analysis.push({ ply: 112, score: { kind: 'mate', value: 3 }, depth: 12 });
  analysis.push({ ply: 113, score: { kind: 'mate', value: -2 }, depth: 12 });
  analysis.push({ ply: 114, score: { kind: 'mate', value: 2 }, depth: 12 });
  analysis.push({ ply: 115, score: { kind: 'mate', value: -1 }, depth: 12 });
  analysis.push({ ply: 116, score: { kind: 'mate', value: 1 }, depth: 12 });
  analysis.push({ ply: 117, score: { kind: 'mate', value: 0 }, depth: 12 });

  const savedGame = {
    version: 1,
    id: 'user-117-game',
    mode: 'standard',
    startedAt: new Date().toISOString(),
    config: {
      mode: 'standard',
      playerColor: 'white',
      elo: 1500,
      botDelay: false,
    },
    result: '1-0',
    resultReason: 'Checkmate — White wins',
    pgn: chess.pgn(),
    tags,
    analysis,
  };

  await page.goto('http://localhost:5173/chess-lab/');
  await page.evaluate((g) => {
    localStorage.setItem('chesslab:games:v1', JSON.stringify([g]));
  }, savedGame);

  await page.reload();

  await page.click('.review-link-btn');

  // Wait for review screen to mount and table to appear
  await page.waitForSelector('.review-move-row');

  const rows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.review-move-row')).map((r) => {
      const ply = r.querySelector('.col-num')?.textContent?.trim();
      const move = r.querySelector('.col-move')?.textContent?.trim();
      const quality = r.querySelector('.col-quality')?.textContent?.trim();
      const evalScore = r.querySelector('.col-eval')?.textContent?.trim();
      return { ply, move, quality, evalScore };
    });
  });

  const row103 = rows.find((r) => r.ply === '103.');
  const row107 = rows.find((r) => r.ply === '107.');
  const row113 = rows.find((r) => r.ply === '113.');
  const row117 = rows.find((r) => r.ply === '117.');

  expect(row103?.evalScore).toBe('+36.7');
  expect(row107?.evalScore).toBe('+M7');
  expect(row113?.evalScore).toBe('+M2');
  expect(row117?.evalScore).toBe('#');
});

