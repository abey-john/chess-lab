import { Chess, type Square } from 'chess.js';
import type { ChessPuzzle } from './types';
import puzzlesData from './puzzles.json';

export const ALL_PUZZLES: ChessPuzzle[] = puzzlesData as ChessPuzzle[];

/**
 * Maps puzzles by their ID for fast lookup.
 */
const PUZZLE_BY_ID = new Map<string, ChessPuzzle>(
  ALL_PUZZLES.map((puzzle) => [puzzle.id, puzzle])
);

/**
 * Returns all available puzzles.
 */
export function getAllPuzzles(): ChessPuzzle[] {
  return ALL_PUZZLES;
}

/**
 * Look up a puzzle by its ID.
 */
export function getPuzzleById(id: string): ChessPuzzle | undefined {
  return PUZZLE_BY_ID.get(id);
}

/**
 * Determines the color of the puzzle solver based on puzzle FEN.
 * If FEN active color is 'b', opponent plays initialMove as Black, so White is the solver.
 */
export function getPuzzleSolverColor(puzzle: ChessPuzzle): 'white' | 'black' {
  const parts = puzzle.fen.split(' ');
  // If FEN active color is 'b', opponent plays initialMove as Black, so White is the solver
  return parts[1] === 'b' ? 'white' : 'black';
}

/**
 * Retrieves an appropriately rated puzzle for the player's Elo.
 * Tries to find a puzzle within +/- 150 of targetElo that hasn't been excluded.
 * If preferredColor is provided, prioritizes puzzles matching the player's color.
 * If none found in that window, falls back to the closest puzzle by rating difference.
 * If all puzzles are excluded, resets exclusion and finds the closest puzzle.
 */
export function getPuzzleForElo(
  targetElo: number,
  excludeIds?: Set<string>,
  preferredColor?: 'white' | 'black'
): ChessPuzzle {
  if (ALL_PUZZLES.length === 0) {
    throw new Error('No puzzles available in puzzle database');
  }

  // Filter out excluded puzzles
  let pool = excludeIds && excludeIds.size > 0
    ? ALL_PUZZLES.filter((p) => !excludeIds.has(p.id))
    : ALL_PUZZLES;

  if (pool.length === 0) {
    // If every puzzle was seen/excluded, reset pool
    pool = ALL_PUZZLES;
  }

  // If a preferred solver color is requested, prioritize matching puzzles
  if (preferredColor) {
    const colorMatched = pool.filter((p) => getPuzzleSolverColor(p) === preferredColor);
    if (colorMatched.length > 0) {
      pool = colorMatched;
    }
  }

  // Look for puzzles within +/- 150 Elo
  const windowTolerance = 150;
  const inWindow = pool.filter(
    (p) => Math.abs(p.rating - targetElo) <= windowTolerance
  );

  if (inWindow.length > 0) {
    const randomIndex = Math.floor(Math.random() * inWindow.length);
    return inWindow[randomIndex];
  }

  // Otherwise, find the puzzle(s) with minimal absolute distance to targetElo
  let minDiff = Infinity;
  for (const p of pool) {
    const diff = Math.abs(p.rating - targetElo);
    if (diff < minDiff) {
      minDiff = diff;
    }
  }

  const closest = pool.filter((p) => Math.abs(p.rating - targetElo) === minDiff);
  const randomIndex = Math.floor(Math.random() * closest.length);
  return closest[randomIndex];
}

export interface OpponentMoveResult {
  uci: string;
  san: string;
  from: string;
  to: string;
}

export interface PuzzleMoveResult {
  success: boolean;
  isComplete: boolean;
  opponentMove?: OpponentMoveResult;
  error?: string;
}

/**
 * Encapsulates an active solving session for a puzzle.
 * - Applies setup move (initialMove)
 * - Tracks player turns vs opponent replies in solution[]
 * - Validates player moves against expected UCI
 * - Automatically plays intermediate opponent moves
 */
export class PuzzleSession {
  private puzzle: ChessPuzzle;
  private chess: Chess;
  private stepIndex: number = 0; // index into puzzle.solution
  private completed: boolean = false;
  private failed: boolean = false;
  private playerColor: 'white' | 'black';

  constructor(puzzle: ChessPuzzle) {
    this.puzzle = puzzle;
    this.chess = new Chess(puzzle.fen);

    // Apply the setup move that blunders/sets up the puzzle position
    const from = puzzle.initialMove.slice(0, 2) as Square;
    const to = puzzle.initialMove.slice(2, 4) as Square;
    const promotion = puzzle.initialMove.length > 4 ? puzzle.initialMove.slice(4, 5) : undefined;

    const setupResult = this.chess.move({ from, to, promotion });
    if (!setupResult) {
      throw new Error(`Failed to apply initialMove ${puzzle.initialMove} to FEN: ${puzzle.fen}`);
    }

    // After opponent plays initialMove, it is the player's turn to find the tactic
    this.playerColor = this.chess.turn() === 'w' ? 'white' : 'black';
  }

  public getPuzzle(): ChessPuzzle {
    return this.puzzle;
  }

  public getFen(): string {
    return this.chess.fen();
  }

  public getChessInstance(): Chess {
    // Return a clone to prevent mutation
    return new Chess(this.chess.fen());
  }

  public getPlayerColor(): 'white' | 'black' {
    return this.playerColor;
  }

  public getStepIndex(): number {
    return this.stepIndex;
  }

  public isComplete(): boolean {
    return this.completed;
  }

  public isFailed(): boolean {
    return this.failed;
  }

  public getExpectedMove(): string | undefined {
    return this.puzzle.solution[this.stepIndex]?.toLowerCase();
  }

  public getExpectedMoveDetails(): {
    uci: string;
    from: string;
    to: string;
    promotion?: string;
    san: string;
  } | undefined {
    const uci = this.getExpectedMove();
    if (!uci) return undefined;
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
    try {
      const clone = new Chess(this.chess.fen());
      const res = clone.move({ from: from as Square, to: to as Square, promotion });
      return {
        uci,
        from,
        to,
        promotion,
        san: res?.san ?? `${from}-${to}`,
      };
    } catch {
      return {
        uci,
        from,
        to,
        promotion,
        san: `${from}-${to}`,
      };
    }
  }

  /**
   * Submit a player move. Input can be a UCI string e.g. "e2e4" or an object { from, to, promotion }.
   */
  public submitMove(
    move: string | { from: string; to: string; promotion?: string }
  ): PuzzleMoveResult {
    if (this.completed) {
      return { success: false, isComplete: true, error: 'Puzzle already completed' };
    }
    if (this.failed) {
      return { success: false, isComplete: false, error: 'Puzzle already failed' };
    }

    const uciMove = typeof move === 'string'
      ? move.toLowerCase()
      : `${move.from}${move.to}${move.promotion ? move.promotion.toLowerCase() : ''}`;

    const expectedMove = this.puzzle.solution[this.stepIndex]?.toLowerCase();

    if (!expectedMove || uciMove !== expectedMove) {
      this.failed = true;
      return {
        success: false,
        isComplete: false,
        error: 'Incorrect move',
      };
    }

    // Play player's correct move
    const from = uciMove.slice(0, 2) as Square;
    const to = uciMove.slice(2, 4) as Square;
    const promotion = uciMove.length > 4 ? uciMove.slice(4, 5) : undefined;

    const moveRes = this.chess.move({ from, to, promotion });
    if (!moveRes) {
      this.failed = true;
      return {
        success: false,
        isComplete: false,
        error: `Illegal move on board: ${uciMove}`,
      };
    }

    this.stepIndex++;

    // Check if the solution is finished
    if (this.stepIndex >= this.puzzle.solution.length) {
      this.completed = true;
      return {
        success: true,
        isComplete: true,
      };
    }

    // Play opponent's automatic response
    const opponentUci = this.puzzle.solution[this.stepIndex].toLowerCase();
    const opFrom = opponentUci.slice(0, 2) as Square;
    const opTo = opponentUci.slice(2, 4) as Square;
    const opPromotion = opponentUci.length > 4 ? opponentUci.slice(4, 5) : undefined;

    const opMoveRes = this.chess.move({ from: opFrom, to: opTo, promotion: opPromotion });
    if (!opMoveRes) {
      throw new Error(`Opponent reply move invalid: ${opponentUci} in puzzle ${this.puzzle.id}`);
    }

    this.stepIndex++;

    return {
      success: true,
      isComplete: false,
      opponentMove: {
        uci: opponentUci,
        san: opMoveRes.san,
        from: opFrom,
        to: opTo,
      },
    };
  }
}
