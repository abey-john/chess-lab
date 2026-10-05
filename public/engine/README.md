# Stockfish WASM Engine (Single-Threaded Lite Build)

## Overview
This directory contains a precompiled, single-threaded WebAssembly build of Stockfish 16.
Single-threaded execution avoids the need for `SharedArrayBuffer` and `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` (COOP/COEP) headers, allowing chess-lab to run reliably on any static web host, including GitHub Pages.

## Version & Source Details
- **Engine Version:** Stockfish 16 (single-threaded NNUE build)
- **Source Package:** `stockfish@16.0.0` (npm)
- **Upstream Repository:** [https://github.com/official-stockfish/Stockfish](https://github.com/official-stockfish/Stockfish)
- **Emscripten Port Repository:** [https://github.com/nmrugg/stockfish.js](https://github.com/nmrugg/stockfish.js)
- **WASM Binaries:**
  - `stockfish-nnue-16-single.js` (25.6 KB loader / Web Worker wrapper)
  - `stockfish-nnue-16-single.wasm` (575 KB compiled WebAssembly engine)

## Verified UCI Options
- `UCI_LimitStrength`: Supported (`type check`, default `false`)
- `UCI_Elo`: Supported (`type spin`, default `1320`, range `min 1320` to `max 3190`)
- `MultiPV`: Supported (`type spin`, default `1`, range `min 1` to `max 500`)

## Licensing
Stockfish is free software released under the **GNU General Public License version 3 (GPLv3)**.
The full license text is preserved in [LICENSE](./LICENSE), and contributors are listed in [AUTHORS](./AUTHORS).
Source code for Stockfish is available at [https://github.com/official-stockfish/Stockfish](https://github.com/official-stockfish/Stockfish).
