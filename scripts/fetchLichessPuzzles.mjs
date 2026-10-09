import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_COUNT = 600; // 500-700 curated puzzles
const OUT_FILE = path.resolve(__dirname, '../src/modes/redemption/puzzles.json');

// Rating brackets to target roughly equal representation:
// Bracket 1: < 1400
// Bracket 2: 1400 - 1799
// Bracket 3: 1800 - 2199
// Bracket 4: 2200 - 2599
// Bracket 5: 2600+

function getBracket(rating) {
  if (rating < 1400) return 0;
  if (rating < 1800) return 1;
  if (rating < 2200) return 2;
  if (rating < 2600) return 3;
  return 4;
}

const brackets = [[], [], [], [], []];
const seenIds = new Set();

function validateAndFormatPuzzle(rawRow) {
  const { PuzzleId, FEN, Moves, Rating, Themes } = rawRow;
  if (!PuzzleId || !FEN || !Moves || !Rating) return null;

  const moveList = Moves.trim().split(/\s+/);
  // We want 1-move tactics (length 2 in moves: 1 setup + 1 player move)
  // or 2-move tactics (length 4 in moves: 1 setup + 1 player + 1 opponent + 1 player)
  // i.e. solution.length === 1 or 3
  if (moveList.length !== 2 && moveList.length !== 4) {
    return null;
  }

  const initialMove = moveList[0];
  const solution = moveList.slice(1);

  // Validate on chess.js
  try {
    const chess = new Chess(FEN);
    
    // Play initial move
    const from0 = initialMove.slice(0, 2);
    const to0 = initialMove.slice(2, 4);
    const promo0 = initialMove.length > 4 ? initialMove.slice(4, 5) : undefined;
    const m0 = chess.move({ from: from0, to: to0, promotion: promo0 });
    if (!m0) return null;

    // Play solution sequence
    for (const uci of solution) {
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promo = uci.length > 4 ? uci.slice(4, 5) : undefined;
      const m = chess.move({ from, to, promotion: promo });
      if (!m) return null;
    }

    return {
      id: PuzzleId,
      fen: FEN,
      initialMove,
      solution,
      rating: Math.round(Rating),
      themes: Array.isArray(Themes) ? Themes : (Themes ? Themes.split(' ') : []),
    };
  } catch {
    return null;
  }
}

async function fetchPage(offset) {
  const url = `https://datasets-server.huggingface.co/rows?dataset=Lichess%2Fchess-puzzles&config=default&split=train&offset=${offset}&limit=100`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Failed fetching offset ${offset}: status ${res.status}`);
      return [];
    }
    const data = await res.json();
    return data.rows ? data.rows.map(r => r.row) : [];
  } catch (err) {
    console.warn(`Error fetching offset ${offset}:`, err.message);
    return [];
  }
}

async function main() {
  console.log('Fetching curated puzzles from Lichess open database via HuggingFace...');
  
  // Use distributed offsets across dataset
  const offsets = [
    0, 200, 500, 1000, 2000, 3500, 5000, 7500, 10000, 15000, 
    20000, 30000, 50000, 75000, 100000, 150000, 200000, 300000,
    500000, 750000, 1000000, 1500000, 2000000, 2500000
  ];

  for (const offset of offsets) {
    const totalCollected = brackets.reduce((sum, b) => sum + b.length, 0);
    if (totalCollected >= TARGET_COUNT) break;

    const rows = await fetchPage(offset);
    for (const row of rows) {
      if (seenIds.has(row.PuzzleId)) continue;
      
      const puzzle = validateAndFormatPuzzle(row);
      if (!puzzle) continue;

      const bracketIdx = getBracket(puzzle.rating);
      // Cap each bracket at TARGET_COUNT / 4 to ensure balanced distribution
      if (brackets[bracketIdx].length < Math.ceil(TARGET_COUNT / 3.5)) {
        seenIds.add(puzzle.id);
        brackets[bracketIdx].push(puzzle);
      }
    }

    const currentCounts = brackets.map(b => b.length);
    console.log(`Offset ${offset}: Collected ${seenIds.size} puzzles. Brackets (<1.4k, 1.4-1.8k, 1.8-2.2k, 2.2-2.6k, 2.6k+):`, currentCounts);
    
    // Be gentle to API
    await new Promise(r => setTimeout(r, 200));
  }

  const allPuzzles = brackets.flat().sort((a, b) => a.rating - b.rating);
  console.log(`\nSuccessfully validated ${allPuzzles.length} puzzles!`);
  console.log(`Lowest rating: ${allPuzzles[0]?.rating}, Highest rating: ${allPuzzles[allPuzzles.length - 1]?.rating}`);

  // Write to puzzles.json
  fs.writeFileSync(OUT_FILE, JSON.stringify(allPuzzles, null, 2), 'utf-8');
  const stats = fs.statSync(OUT_FILE);
  console.log(`Saved to ${OUT_FILE} (${(stats.size / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
