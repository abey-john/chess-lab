# chess-lab ♟

A fast, client-side chess web app featuring Stockfish 16 running completely in WebAssembly, real-time board interaction, game review, and move classification.

Live demo: [https://abey-john.github.io/chess-lab/](https://abey-john.github.io/chess-lab/)

---

## Features

- **Client-Side Stockfish 16**: Single-threaded NNUE WebAssembly build running locally in browser Web Workers—zero backend or server dependencies.
- **Customizable Bot Strength**: Adjustable Elo slider (1320–3190) leveraging UCI strength limiting.
- **Interactive Board**: Fluid piece movement, legal move highlights, promotion selection, and premove support powered by Chessground and chess.js.
- **Game State & Resume**: Automatic in-progress game saving and restoration via `localStorage`.
- **Post-Game Game Review**:
  - Full game evaluation graph plotted with centipawn/mate evaluations from White's perspective.
  - Move-by-move classification (Best, Excellent, Good, Inaccuracy, Mistake, Blunder) using winning probability model.
  - Accuracy scores computed for both players.
  - Move-by-move replay explorer with interactive navigation.
- **Local Game History**: Review completed games with quick access, deletion, and batch management.
- **Responsive Design**: Optimized for desktop and mobile viewports.

---

## Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Chess Engine**: Stockfish 16 (single-threaded NNUE WASM via Web Worker)
- **Chess Rules & Board UI**: `chess.js` & `chessground`
- **State Management**: `zustand`
- **Testing**: `vitest` (unit tests) & Playwright (E2E)
- **Linter**: `oxlint`
- **Deployment**: GitHub Pages via GitHub Actions

---

## Getting Started

### Prerequisites

- Node.js 20+ (Node 22 recommended)
- npm 10+

### Installation

```bash
git clone https://github.com/abey-john/chess-lab.git
cd chess-lab
npm install
```

### Development

Run the Vite development server:

```bash
npm run dev
```

Visit `http://localhost:5173/chess-lab/` in your browser.

### Testing & Quality

```bash
# Run unit tests
npm test

# Run linter
npm run lint

# Run E2E tests
npm run test:e2e
```

### Production Build

```bash
npm run build
npm run preview
```

---

## License

This project is open-source. Note that Stockfish binaries located in `public/engine/` are licensed under the [GNU General Public License v3 (GPLv3)](public/engine/LICENSE).
