import type { EngineService, EvalScore } from '../engine/types';
import type { RedemptionConfigExtension, RedemptionTagData } from '../modes/redemption/types';
import type { Frequency, SeverityChoice, SlipTagData } from '../modes/slip/types';

export type ModeId = 'standard' | 'slip' | 'redemption';
export type Color = 'white' | 'black';
export type MoveQuality = 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export interface BaseConfig {
  mode: ModeId;
  playerColor: Color; // 'random' is resolved to 'white' or 'black' at game start
  elo: number;
  botDelay: boolean;
}

export type GameConfig =
  | (BaseConfig & { mode: 'standard' })
  | (BaseConfig & { mode: 'slip'; severity: SeverityChoice; frequency: Frequency })
  | (BaseConfig & RedemptionConfigExtension);

export type { RedemptionTagData, SlipTagData };

export interface MoveTag {
  ply: number; // 1-based
  fenBefore: string;
  san: string;
  by: 'player' | 'bot';
  slip?: SlipTagData; // declared in v1, never populated in v1
  redemption?: RedemptionTagData;
}

export interface PositionEval {
  ply: number; // position after this ply (0 = start position)
  score: EvalScore; // from the side-to-move's perspective in that position
  depth: number;
}

export interface SavedGame {
  version: 1;
  id: string;
  mode: ModeId;
  startedAt: string; // ISO string
  config: GameConfig; // with resolved playerColor
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  resultReason: string; // e.g., "checkmate", "resignation", "draw agreed"
  pgn: string;
  tags: MoveTag[];
  analysis?: PositionEval[]; // cached once the review pass has run
  strategyState?: unknown; // mode-specific strategy state (e.g. redemption events)
}

export interface InProgressGame {
  version: 1;
  id: string;
  mode: ModeId;
  config: GameConfig;
  startedAt: string;
  moves: string[]; // UCI history
  strategyState?: unknown; // v2 scheduler state survives refresh
}

// Bot strategy seam (Part B)
export interface BotTurnContext {
  fen: string;
  moves: string[]; // UCI history
  config: GameConfig;
  engine: EngineService;
  rng: () => number; // injectable for deterministic tests
  gameId: string;
}

export interface BotTurnResult {
  move: string; // UCI move
  tag?: Partial<MoveTag>;
}

export interface BotStrategy<S = unknown> {
  init(config: GameConfig, rng: () => number): S;
  playTurn(ctx: BotTurnContext, state: S): Promise<{ result: BotTurnResult; nextState: S }>;
}
