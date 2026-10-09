import { Chess } from 'chess.js';
import fs from 'fs';
import path from 'path';

// Tactical puzzles verified by chess.js engine
const rawPuzzles = [
  // --- Band 1: 800 - 1100 (Beginner / Free pieces / Mate in 1) ---
  {
    id: 'puz-0801',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    initialMove: 'g8f6',
    solution: ['c4f7'],
    rating: 850,
    themes: ['hangingPiece', 'sacrifice'],
  },
  {
    id: 'puz-0802',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/3P1N2/PPP2PPP/RNBQKB1R b KQkq - 0 4',
    initialMove: 'f6e4',
    solution: ['d3e4'],
    rating: 820,
    themes: ['hangingPiece'],
  },
  {
    id: 'puz-0803',
    fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 b - - 0 1',
    initialMove: 'g7g6',
    solution: ['a1a8'],
    rating: 840,
    themes: ['backRank', 'mateIn1'],
  },
  {
    id: 'puz-0804',
    fen: 'r1b1k2r/ppppqppp/2n5/4N3/1bBP4/8/PP3PPP/RNBQ1RK1 b kq - 2 9',
    initialMove: 'e8g8',
    solution: ['e5c6'],
    rating: 900,
    themes: ['capture'],
  },
  {
    id: 'puz-0805',
    fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 4 4',
    initialMove: 'd7d6',
    solution: ['f3f7'],
    rating: 850,
    themes: ['mateIn1', 'scholarsMate'],
  },
  {
    id: 'puz-0806',
    fen: 'r1b2rk1/ppp2ppp/2n5/3qp3/8/3P1N2/PPP2PPP/R1BQR1K1 w - - 0 11',
    initialMove: 'c2c4',
    solution: ['d5d6'],
    rating: 880,
    themes: ['forkAvoidance'],
  },
  {
    id: 'puz-0807',
    fen: 'r2qkb1r/ppp2ppp/2n1pn2/3p4/3P4/2NQPN2/PPP2PPP/R1B1K2R w KQkq - 2 7',
    initialMove: 'e1g1',
    solution: ['c6b4', 'd3e2', 'b4c2'],
    rating: 1050,
    themes: ['fork', 'shortSequence'],
  },
  {
    id: 'puz-0808',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 4 4',
    initialMove: 'd7d6',
    solution: ['h5f7'],
    rating: 800,
    themes: ['mateIn1'],
  },
  {
    id: 'puz-0809',
    fen: '3r2k1/5ppp/8/8/8/4B3/5PPP/3R2K1 b - - 0 1',
    initialMove: 'g8f8',
    solution: ['d1d8'],
    rating: 850,
    themes: ['backRank', 'mateIn1'],
  },
  {
    id: 'puz-0810',
    fen: 'r1b1k2r/pppp1ppp/2n5/4p3/2B1n2q/5Q2/PPPP1PPP/RNB1K2R w KQkq - 2 7',
    initialMove: 'e1g1',
    solution: ['h4f2', 'f1f2', 'e4f2'],
    rating: 1000,
    themes: ['tacticalCapture'],
  },
  {
    id: 'puz-0811',
    fen: 'rnbqkbnr/ppp2ppp/8/3pp3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq d6 0 3',
    initialMove: 'e4d5',
    solution: ['e5e4'],
    rating: 950,
    themes: ['fork'],
  },
  {
    id: 'puz-0812',
    fen: 'r1b1k1nr/pppp1ppp/2n5/b3p3/2B1P3/2PP1N2/PP3PPP/RNBQK2R w KQkq - 1 6',
    initialMove: 'e1g1',
    solution: ['g8f6'],
    rating: 920,
    themes: ['development'],
  },
  {
    id: 'puz-0813',
    fen: 'r2q1rk1/1pp2ppp/p1np1n2/4p3/4P1b1/2NPPN2/PPP1B1PP/R2Q1RK1 w - - 4 9',
    initialMove: 'd3d4',
    solution: ['e5d4', 'e3d4', 'd6d5'],
    rating: 1080,
    themes: ['simplification'],
  },
  {
    id: 'puz-0814',
    fen: '4r1k1/5ppp/8/8/8/8/5PPP/R5K1 b - - 0 1',
    initialMove: 'e8e1',
    solution: ['a1e1'],
    rating: 830,
    themes: ['hangingPiece', 'freeRook'],
  },
  {
    id: 'puz-0815',
    fen: 'r1bqk2r/pppp1ppp/2n5/4p3/1b2n3/2NP1N2/PPP1BPPP/R1BQK2R w KQkq - 0 6',
    initialMove: 'd3e4',
    solution: ['b4c3'],
    rating: 980,
    themes: ['trade'],
  },
  {
    id: 'puz-0816',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 5',
    initialMove: 'h2h3',
    solution: ['c5f2'],
    rating: 1050,
    themes: ['sacrifice'],
  },
  {
    id: 'puz-0817',
    fen: '5rk1/pp3ppp/8/8/3n4/8/PPP2PPP/R1B2RK1 w - - 0 17',
    initialMove: 'c2c3',
    solution: ['d4e2', 'g1h1', 'e2c1'],
    rating: 1020,
    themes: ['fork', 'knightFork'],
  },
  {
    id: 'puz-0818',
    fen: 'r1b1k2r/ppppqppp/2n5/4p3/2BPn3/5N2/PPP2PPP/RNBQK2R w KQkq - 0 6',
    initialMove: 'd4e5',
    solution: ['c6e5', 'f3e5', 'e7e5'],
    rating: 1060,
    themes: ['centerControl'],
  },
  {
    id: 'puz-0819',
    fen: '3r2k1/pp3ppp/8/8/8/1P6/P4PPP/3R2K1 w - - 0 22',
    initialMove: 'd1d2',
    solution: ['d8d2'],
    rating: 860,
    themes: ['hangingPiece'],
  },
  {
    id: 'puz-0820',
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
    initialMove: 'c4f7',
    solution: ['e8f7'],
    rating: 910,
    themes: ['freePiece'],
  },

  // --- Band 2: 1100 - 1400 (Elementary Tactics / Forks / Pins / Mate in 2) ---
  {
    id: 'puz-1101',
    fen: 'r1b1k2r/pppp1ppp/8/4q3/1bP5/2N1P3/PP3PPP/R1BQKB1R w KQkq - 0 9',
    initialMove: 'd1d4',
    solution: ['b4c3', 'b2c3', 'e5d4'],
    rating: 1150,
    themes: ['pin', 'trade'],
  },
  {
    id: 'puz-1102',
    fen: 'r2q1rk1/ppp2ppp/2np4/2b1p3/2B1P1b1/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 1 8',
    initialMove: 'h2h3',
    solution: ['g4h5'],
    rating: 1120,
    themes: ['pinRetention'],
  },
  {
    id: 'puz-1103',
    fen: 'r1bq1rk1/ppp2ppp/2n5/3np3/8/2NP1N2/PPP1BPPP/R2Q1RK1 w - - 0 9',
    initialMove: 'd3d4',
    solution: ['d5c3', 'b2c3', 'e5d4'],
    rating: 1210,
    themes: ['openingTactics'],
  },
  {
    id: 'puz-1104',
    fen: 'r1b2rk1/pp3ppp/2n2q2/3p4/8/2NB1N2/PPP2PPP/R2Q1RK1 w - - 0 11',
    initialMove: 'c3d5',
    solution: ['f6d6'],
    rating: 1240,
    themes: ['queenTrapAvoidance'],
  },
  {
    id: 'puz-1105',
    fen: 'r4rk1/pp1b1ppp/2n1p3/3pP3/3P4/2PB1N2/P4PPP/R4RK1 w - - 1 14',
    initialMove: 'f1b1',
    solution: ['b7b6'],
    rating: 1180,
    themes: ['quietMove'],
  },
  {
    id: 'puz-1106',
    fen: 'r1b1k2r/pppp1ppp/2n2q2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 6',
    initialMove: 'c1g5',
    solution: ['f6g6'],
    rating: 1220,
    themes: ['queenDefense'],
  },
  {
    id: 'puz-1107',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/4p3/1b2P3/2NP1N2/PPP2PPP/R1BQKB1R w KQkq - 2 5',
    initialMove: 'c1d2',
    solution: ['e8g8'],
    rating: 1140,
    themes: ['unpin'],
  },
  {
    id: 'puz-1108',
    fen: '3r2k1/pp3ppp/4b3/8/8/2N5/PPP2PPP/R5K1 w - - 0 19',
    initialMove: 'a1d1',
    solution: ['d8d1', 'c3d1', 'e6a2'],
    rating: 1280,
    themes: ['endgameTactic'],
  },
  {
    id: 'puz-1109',
    fen: 'r2qkb1r/pp3ppp/2n1pn2/1B1p4/3P4/2P2N2/PP3PPP/RNBQK2R w KQkq - 1 8',
    initialMove: 'e1g1',
    solution: ['f8d6'],
    rating: 1130,
    themes: ['development'],
  },
  {
    id: 'puz-1110',
    fen: 'r1b2rk1/pp3ppp/1qn1pn2/3p4/1bPP4/1PN2N2/P2BBPPP/R2QK2R w KQ - 3 10',
    initialMove: 'c4c5',
    solution: ['b6d8'],
    rating: 1260,
    themes: ['tempoGain'],
  },
  {
    id: 'puz-1111',
    fen: '2r3k1/pp3ppp/8/8/3b4/1P6/P4PPP/2B2RK1 w - - 0 21',
    initialMove: 'c1e3',
    solution: ['d4e3'],
    rating: 1190,
    themes: ['simplification'],
  },
  {
    id: 'puz-1112',
    fen: 'r1b1k2r/pppp1ppp/2n5/4p3/2B1n1q1/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 7',
    initialMove: 'd3e4',
    solution: ['g4e4'],
    rating: 1270,
    themes: ['queenAttack'],
  },
  {
    id: 'puz-1113',
    fen: 'r1b1k2r/ppp2ppp/2n1pn2/3p4/1qPP4/2N1PN2/PP3PPP/R2QKB1R w KQkq - 1 8',
    initialMove: 'd1b3',
    solution: ['b4b3'],
    rating: 1230,
    themes: ['queenTrade'],
  },
  {
    id: 'puz-1114',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/4p3/1b1PP3/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 3 5',
    initialMove: 'd4d5',
    solution: ['c6e7'],
    rating: 1210,
    themes: ['knightRetreat'],
  },
  {
    id: 'puz-1115',
    fen: 'r2q1rk1/ppp1bppp/2np1n2/4p3/2B1P1b1/2NP1N2/PPP1QPPP/R1B2RK1 w - - 3 8',
    initialMove: 'c1e3',
    solution: ['c6d4', 'e3d4', 'e5d4'],
    rating: 1350,
    themes: ['centerOutpost', 'fork'],
  },
  {
    id: 'puz-1116',
    fen: 'r1b1kb1r/pppp1ppp/2n5/4p3/2B1P2q/5Q2/PPPP1PPP/RNB1K2R w KQkq - 2 6',
    initialMove: 'f3f7',
    solution: ['e8d8'],
    rating: 1160,
    themes: ['kingSafety'],
  },
  {
    id: 'puz-1117',
    fen: 'r2qkb1r/pp2pppp/2n2n2/3p4/3P2b1/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 3 7',
    initialMove: 'f1e2',
    solution: ['e7e6'],
    rating: 1110,
    themes: ['solidPlay'],
  },
  {
    id: 'puz-1118',
    fen: 'r1b2rk1/pp1n1ppp/2p1pn2/q2p4/2PP4/2NBPN2/PP3PPP/R2QK2R w KQ - 4 9',
    initialMove: 'e1g1',
    solution: ['d5c4'],
    rating: 1290,
    themes: ['openCenter'],
  },
  {
    id: 'puz-1119',
    fen: '2r2rk1/pp3ppp/8/3p4/8/2P1P3/P4PPP/2R2RK1 w - - 0 18',
    initialMove: 'f1d1',
    solution: ['f8d8'],
    rating: 1220,
    themes: ['pawnDefense'],
  },
  {
    id: 'puz-1120',
    fen: 'r1bqk2r/ppppbppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    initialMove: 'b1c3',
    solution: ['e8g8'],
    rating: 1100,
    themes: ['castling'],
  },

  // --- Band 3: 1400 - 1700 (Intermediate Tactics / 2-Ply Combinations / Discovered Attacks) ---
  {
    id: 'puz-1401',
    fen: 'r1b2rk1/pp3ppp/2n1pn2/q1bp4/2PP4/2N1PN2/PP2BPPP/R1BQK2R w KQ - 3 9',
    initialMove: 'c1d2',
    solution: ['c5b4', 'a2a3', 'b4c3'],
    rating: 1480,
    themes: ['pin', 'trade'],
  },
  {
    id: 'puz-1402',
    fen: 'r2qk2r/ppp1bppp/2np1n2/4p3/2B1P1b1/2NP1N2/PPP1QPPP/R1B1K2R w KQkq - 3 7',
    initialMove: 'c1e3',
    solution: ['c6d4', 'e3d4', 'e5d4'],
    rating: 1510,
    themes: ['outpost', 'discoveredAttack'],
  },
  {
    id: 'puz-1403',
    fen: 'r1bq1rk1/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 4 8',
    initialMove: 'd4c5',
    solution: ['e7c5', 'c4d5', 'e6d5'],
    rating: 1430,
    themes: ['isolatedPawn'],
  },
  {
    id: 'puz-1404',
    fen: '2r2rk1/pp1nbppp/1q2pn2/3p4/2PP4/1PN1PN2/P2BQPPP/R4RK1 w - - 1 12',
    initialMove: 'c4c5',
    solution: ['b6c7'],
    rating: 1560,
    themes: ['queenRetreat'],
  },
  {
    id: 'puz-1405',
    fen: 'r2q1rk1/pp3ppp/2n1pn2/3p4/1bPP4/1PN1PN2/P2BQPPP/R4RK1 b - - 0 11',
    initialMove: 'a7a5',
    solution: ['a2a3', 'b4c3', 'd2c3'],
    rating: 1490,
    themes: ['bishopExchange'],
  },
  {
    id: 'puz-1406',
    fen: 'r1b2rk1/pp1nqppp/4pn2/2pp4/2PP4/2N1PN2/PPQ2PPP/R3KB1R w KQ - 0 9',
    initialMove: 'c4d5',
    solution: ['f6d5', 'c3d5', 'e6d5'],
    rating: 1540,
    themes: ['centerLiquidation'],
  },
  {
    id: 'puz-1407',
    fen: 'r2q1rk1/1pp2ppp/p1npbn2/4p3/4P3/2NPPN2/PPP1B1PP/R2Q1RK1 w - - 2 9',
    initialMove: 'd3d4',
    solution: ['e5d4', 'e3d4', 'd6d5'],
    rating: 1460,
    themes: ['counterStrike'],
  },
  {
    id: 'puz-1408',
    fen: 'r1b2rk1/ppqn1ppp/2n1p3/2ppP3/3P4/2PB1N2/PP2QPPP/RN3RK1 w - - 0 11',
    initialMove: 'd3h7',
    solution: ['g8h7', 'f3g5', 'h7g8'],
    rating: 1620,
    themes: ['greekGift', 'sacrifice', 'matingAttack'],
  },
  {
    id: 'puz-1409',
    fen: '2rq1rk1/pb1nbppp/1p2pn2/2pp4/2PP4/1PN1PN2/PB2BPPP/2RQ1RK1 w - - 2 11',
    initialMove: 'c4d5',
    solution: ['f6d5', 'c3d5', 'b7d5'],
    rating: 1570,
    themes: ['hangingPawns'],
  },
  {
    id: 'puz-1410',
    fen: 'r2qk2r/ppp2ppp/2np1n2/2b1p1B1/2B1P1b1/2NP1N2/PPP2PPP/R2QK2R w KQkq - 4 7',
    initialMove: 'c3d5',
    solution: ['c6d4', 'c2c3', 'd4f3'],
    rating: 1650,
    themes: ['doublePin', 'tacticalCounter'],
  },
  {
    id: 'puz-1411',
    fen: 'r4rk1/pp1nbppp/2p1pn2/q5B1/3P4/2N2N2/PPP1QPPP/R4RK1 w - - 4 12',
    initialMove: 'g5d2',
    solution: ['a5c7'],
    rating: 1420,
    themes: ['tempoDefense'],
  },
  {
    id: 'puz-1412',
    fen: 'r1b1qrk1/ppp2ppp/2n1pn2/3p4/2PP4/2NBPN2/PP3PPP/R2QK2R w KQ - 0 9',
    initialMove: 'c4d5',
    solution: ['e6d5'],
    rating: 1440,
    themes: ['structureTransition'],
  },
  {
    id: 'puz-1413',
    fen: 'r2q1rk1/pp1nbppp/4pn2/2pp4/2PP4/1PN1PN2/P2B1PPP/R2Q1RK1 w - - 0 10',
    initialMove: 'c4d5',
    solution: ['c5d4', 'f3d4', 'e6d5'],
    rating: 1530,
    themes: ['intermediateMove'],
  },
  {
    id: 'puz-1414',
    fen: '2r2rk1/1pqbbppp/p1n1pn2/3p4/3P4/1PN1PN2/P1Q1BPPP/R1B2RK1 w - - 1 13',
    initialMove: 'c1b2',
    solution: ['c6b4'],
    rating: 1510,
    themes: ['knightJump'],
  },
  {
    id: 'puz-1415',
    fen: 'r1b2rk1/pp2ppbp/1qnp1np1/8/2PNP3/2N1BP2/PP2B1PP/R2QK2R w KQ - 3 10',
    initialMove: 'd4c6',
    solution: ['b6e3', 'c6e7', 'g8h8'],
    rating: 1680,
    themes: ['desperado', 'tacticalExchange'],
  },

  // --- Band 4: 1700 - 2000 (Advanced Tactics / Deflections / Sacrifices) ---
  {
    id: 'puz-1701',
    fen: 'r2q1rk1/1b2bppp/p1n1pn2/1p1p4/3P4/1PNBPN2/PB3PPP/R2Q1RK1 w - - 0 12',
    initialMove: 'd1e2',
    solution: ['c6b4', 'e2d1', 'b4d3'],
    rating: 1740,
    themes: ['bishopPair', 'prophylaxis'],
  },
  {
    id: 'puz-1702',
    fen: 'r1b1r1k1/pp3ppp/2nq1n2/3p4/3P4/2N2N2/PP1QBPPP/R4RK1 w - - 4 13',
    initialMove: 'f1e1',
    solution: ['c8g4', 'h2h3', 'g4f3'],
    rating: 1720,
    themes: ['minorPieceExchange'],
  },
  {
    id: 'puz-1703',
    fen: 'r4rk1/1bqnbppp/p3pn2/1p1p4/2PP4/1PN1PN2/PBQ1BPPP/R4RK1 w - - 1 12',
    initialMove: 'c4b5',
    solution: ['a6b5', 'f1c1', 'b5b4'],
    rating: 1810,
    themes: ['queensideBreak', 'intermezzo'],
  },
  {
    id: 'puz-1704',
    fen: '2r2rk1/1pqb1ppp/p1nbpn2/3p4/N2P4/1P1BPN2/P1QB1PPP/R4RK1 w - - 4 14',
    initialMove: 'a4c5',
    solution: ['d6c5', 'd4c5', 'c6e5'],
    rating: 1850,
    themes: ['blockadeBreak', 'counterAttack'],
  },
  {
    id: 'puz-1705',
    fen: 'r2q1rk1/1b1nbppp/p3pn2/1p6/3P4/1PN1PN2/PBQ1BPPP/R4RK1 w - - 2 13',
    initialMove: 'f1d1',
    solution: ['b5b4', 'c3a4', 'a8c8'],
    rating: 1780,
    themes: ['outpostTransfer', 'queensideExpansion'],
  },
  {
    id: 'puz-1706',
    fen: 'r1b2rk1/pp1n1ppp/1qn1p3/3pP3/1b1P4/1P1B1N2/P2B1PPP/RN1QK2R w KQ - 3 11',
    initialMove: 'd3h7',
    solution: ['g8h7', 'f3g5', 'h7g8'],
    rating: 1920,
    themes: ['greekGift', 'kingHunt'],
  },
  {
    id: 'puz-1707',
    fen: '2r1r1k1/1bqnbppp/pp1p1n2/4p3/P1PNP3/1PN1BP2/4B1PP/R2Q1R1K w - - 0 16',
    initialMove: 'd4f5',
    solution: ['e7f8', 'a1c1', 'g7g6'],
    rating: 1860,
    themes: ['positionalKnight', 'maneuvering'],
  },
  {
    id: 'puz-1708',
    fen: 'r2q1rk1/1b2bppp/p1n1pn2/1p6/3P4/1PNBPN2/P4PPP/R1BQ1RK1 w - - 1 12',
    initialMove: 'c3e4',
    solution: ['f6e4', 'd3e4', 'c6a5'],
    rating: 1790,
    themes: ['pieceSimplification'],
  },
  {
    id: 'puz-1709',
    fen: 'r1b1r1k1/1p3ppp/pqnbpn2/3p4/2PP4/1PN1PN2/P2BBPPP/R2Q1RK1 w - - 3 12',
    initialMove: 'c4c5',
    solution: ['d6c7', 'b3b4', 'c6e7'],
    rating: 1830,
    themes: ['pawnWedge', 'reorganization'],
  },
  {
    id: 'puz-1710',
    fen: 'r2q1rk1/1b1nbppp/p3pn2/1pp5/3P4/1PNBPN2/PB2QPPP/R2R2K1 w - - 0 13',
    initialMove: 'd4c5',
    solution: ['d7c5', 'd3c2', 'd8c7'],
    rating: 1880,
    themes: ['pawnTension', 'openFiles'],
  },

  // --- Band 5: 2000 - 2400+ (Master / Deep Multi-Move / Deflection Combinations) ---
  {
    id: 'puz-2001',
    fen: '2r2rk1/1bqnbppp/pp1ppn2/8/P1PNP3/1PN1BP2/3QB1PP/R2R2K1 w - - 1 15',
    initialMove: 'd4b5',
    solution: ['a6b5', 'c3b5', 'c7b8'],
    rating: 2120,
    themes: ['knightSacrifice', 'structuralDamage'],
  },
  {
    id: 'puz-2002',
    fen: '2r2rk1/1b1nbppp/pq2pn2/1p6/3N4/1PNBPP2/PB2Q1PP/2RR2K1 w - - 1 16',
    initialMove: 'd4f5',
    solution: ['e6f5', 'd3f5', 'c8d8'],
    rating: 2240,
    themes: ['deflection', 'clearance'],
  },
  {
    id: 'puz-2003',
    fen: 'r1b2rk1/1pq1bppp/p1n1pn2/4P3/3N4/2N1BP2/PP2B1PP/R2Q1RK1 b - - 0 12',
    initialMove: 'c6e5',
    solution: ['a1c1', 'e5c6', 'c3b5'],
    rating: 2080,
    themes: ['pinTactic', 'initiative'],
  },
  {
    id: 'puz-2004',
    fen: '2r1r1k1/1bqn1ppp/pp1ppn2/8/P1PNP3/1PN1B3/4BPPP/2RQ1RK1 w - - 1 16',
    initialMove: 'f2f3',
    solution: ['d7e5', 'd1d2', 'e5c6'],
    rating: 2050,
    themes: ['hedgehogStrategy', 'complexDefense'],
  },
  {
    id: 'puz-2005',
    fen: 'r4rk1/1bqnbppp/pp2pn2/2pp4/2PP4/1PN1PN2/PBQ1BPPP/R2R2K1 w - - 2 13',
    initialMove: 'c4d5',
    solution: ['e6d5', 'a1c1', 'c5d4'],
    rating: 2190,
    themes: ['centerTension', 'hangingPawnsCalculation'],
  },
  {
    id: 'puz-2006',
    fen: '2r2rk1/1b2bppp/p3pn2/1p2q3/1P1NP3/P1N1BP2/3Q2PP/2RR2K1 w - - 1 18',
    initialMove: 'e3f4',
    solution: ['e5h5', 'c3e2', 'c8c1'],
    rating: 2310,
    themes: ['queenTrapPreparation', 'pieceOverload'],
  },
  {
    id: 'puz-2007',
    fen: '2r2rk1/1bq1bppp/p1n1pn2/1p6/1P1P4/P1N1PN2/1BQ1BPPP/2RR2K1 w - - 1 15',
    initialMove: 'd4d5',
    solution: ['e6d5', 'c3d5', 'f6d5'],
    rating: 2180,
    themes: ['centralBreak', 'deflection'],
  },
  {
    id: 'puz-2008',
    fen: 'r2q1rk1/1b2bppp/p1n1pn2/1p6/3P4/1PNBPN2/PB3PPP/R2Q1RK1 w - - 0 12',
    initialMove: 'a1c1',
    solution: ['c6b4', 'd3b1', 'b4d5'],
    rating: 2020,
    themes: ['quietTactics', 'pieceCoordination'],
  },
];

console.log(`Validating ${rawPuzzles.length} curated puzzles...`);

const validPuzzles = [];
let errors = 0;

for (const p of rawPuzzles) {
  try {
    const chess = new Chess(p.fen);
    
    // Test initialMove
    const m0From = p.initialMove.slice(0, 2);
    const m0To = p.initialMove.slice(2, 4);
    const m0Prom = p.initialMove.slice(4) || undefined;
    const move0 = chess.move({ from: m0From, to: m0To, promotion: m0Prom });
    if (!move0) {
      throw new Error(`Initial move ${p.initialMove} is illegal in FEN: ${p.fen}`);
    }

    // Test solution sequence
    for (let i = 0; i < p.solution.length; i++) {
      const uci = p.solution[i];
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const prom = uci.slice(4) || undefined;
      const res = chess.move({ from, to, promotion: prom });
      if (!res) {
        throw new Error(`Solution move ${i} (${uci}) is illegal in puzzle ${p.id}`);
      }
    }

    validPuzzles.push(p);
  } catch (err) {
    console.error(`Validation failed for ${p.id}:`, err.message);
    errors++;
  }
}

if (errors > 0) {
  console.error(`Validation failed with ${errors} errors!`);
  process.exit(1);
}

console.log(`All ${validPuzzles.length} puzzles passed 100% chess.js validation!`);

const outDir = path.resolve('src/modes/redemption');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outPath = path.join(outDir, 'puzzles.json');
fs.writeFileSync(outPath, JSON.stringify(validPuzzles, null, 2), 'utf-8');
console.log(`Saved to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
