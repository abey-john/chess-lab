import type { Candidate, EvalScore } from './types';

export interface UciInfo {
  depth: number;
  seldepth?: number;
  multipv: number; // 1-indexed, default 1 if not specified in UCI
  score: EvalScore;
  nodes?: number;
  nps?: number;
  time?: number;
  pv: string[]; // UCI moves, e.g. ["e2e4", "e7e5"]
}

export interface BestMoveInfo {
  bestmove: string;
  ponder?: string;
}

/**
 * Parses a single UCI "info ..." line.
 * Returns null if the line is not an info line or is missing required depth/score.
 */
export function parseInfoLine(line: string): UciInfo | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('info ') && trimmed !== 'info') {
    return null;
  }

  const tokens = trimmed.split(/\s+/);
  let depth: number | null = null;
  let seldepth: number | undefined;
  let multipv = 1;
  let score: EvalScore | null = null;
  let nodes: number | undefined;
  let nps: number | undefined;
  let time: number | undefined;
  const pv: string[] = [];

  let i = 1;
  while (i < tokens.length) {
    const token = tokens[i];

    if (token === 'depth' && i + 1 < tokens.length) {
      depth = parseInt(tokens[i + 1], 10);
      i += 2;
    } else if (token === 'seldepth' && i + 1 < tokens.length) {
      seldepth = parseInt(tokens[i + 1], 10);
      i += 2;
    } else if (token === 'multipv' && i + 1 < tokens.length) {
      multipv = parseInt(tokens[i + 1], 10);
      i += 2;
    } else if (token === 'score' && i + 2 < tokens.length) {
      const type = tokens[i + 1];
      const val = parseInt(tokens[i + 2], 10);
      if (type === 'cp') {
        score = { kind: 'cp', value: isNaN(val) ? 0 : val };
        i += 3;
      } else if (type === 'mate') {
        score = { kind: 'mate', value: isNaN(val) ? 0 : val };
        i += 3;
      } else {
        i += 2;
      }
    } else if (token === 'nodes' && i + 1 < tokens.length) {
      nodes = parseInt(tokens[i + 1], 10);
      i += 2;
    } else if (token === 'nps' && i + 1 < tokens.length) {
      nps = parseInt(tokens[i + 1], 10);
      i += 2;
    } else if (token === 'time' && i + 1 < tokens.length) {
      time = parseInt(tokens[i + 1], 10);
      i += 2;
    } else if (token === 'pv') {
      // All subsequent tokens until end of line are PV moves
      for (let j = i + 1; j < tokens.length; j++) {
        pv.push(tokens[j]);
      }
      break;
    } else {
      i++;
    }
  }

  if (depth === null || score === null) {
    return null;
  }

  return {
    depth,
    seldepth,
    multipv,
    score,
    nodes,
    nps,
    time,
    pv,
  };
}

/**
 * Parses a UCI "bestmove ..." line.
 * Example: "bestmove e2e4 ponder e7e5" or "bestmove e7e8q"
 */
export function parseBestmoveLine(line: string): BestMoveInfo | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('bestmove')) {
    return null;
  }

  const tokens = trimmed.split(/\s+/);
  if (tokens.length < 2) {
    return null;
  }

  const bestmove = tokens[1];
  let ponder: string | undefined;

  if (tokens[2] === 'ponder' && tokens[3]) {
    ponder = tokens[3];
  }

  return { bestmove, ponder };
}

/**
 * Parses a collection of UCI output lines produced by a MultiPV search.
 * Keeps the LAST info line for each multipv index at the highest depth reached,
 * and converts them into an array of Candidates sorted by rank ascending.
 */
export function parseCandidates(lines: string[]): Candidate[] {
  // Collect all valid info lines that contain at least one move in PV
  const validInfos: UciInfo[] = [];

  for (const line of lines) {
    const info = parseInfoLine(line);
    if (info && info.pv.length > 0) {
      validInfos.push(info);
    }
  }

  if (validInfos.length === 0) {
    return [];
  }

  // Find the highest depth reached across all info lines
  const maxDepth = Math.max(...validInfos.map((inf) => inf.depth));

  // Filter to info lines at the maxDepth, and keep the LAST line for each multipv index
  const candidatesByRank = new Map<number, Candidate>();

  for (const info of validInfos) {
    if (info.depth === maxDepth) {
      candidatesByRank.set(info.multipv, {
        move: info.pv[0],
        rank: info.multipv,
        score: info.score,
      });
    }
  }

  // Sort by rank (1, 2, 3...)
  return Array.from(candidatesByRank.values()).sort((a, b) => a.rank - b.rank);
}
