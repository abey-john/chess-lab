// Engine score from the side-to-move's perspective
export type EvalScore =
  | { kind: 'cp'; value: number }
  | { kind: 'mate'; value: number };

export interface Candidate {
  move: string; // UCI format, e.g. "e2e4", "e7e8q"
  san?: string;
  rank: number; // 1 = engine's best move
  score: EvalScore; // side-to-move's perspective
}

export interface EngineService {
  // Elo-limited move for normal bot turns
  getBotMove(fen: string, elo: number): Promise<string>;

  // Full-strength MultiPV. Implemented and tested in v1 for v2-readiness
  getCandidates(fen: string, n: number): Promise<Candidate[]>;

  // Single-PV eval for the post-game review pass
  evaluate(fen: string, depth: number): Promise<{ score: EvalScore; depth: number }>;

  stop(): void;
  dispose(): void;
}
