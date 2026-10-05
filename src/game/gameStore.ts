import { Chess } from 'chess.js';
import { create } from 'zustand';
import { executeBotTurn } from './botTurn';
import { checkGameOver, getLegalDests, isPromotionMove } from './chessRules';
import type { Color, GameConfig, MoveTag } from './types';

function createGameId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

export interface GameMoveRecord {
  ply: number;
  san: string;
  from: string;
  to: string;
  promotion?: string;
  fenBefore: string;
  fenAfter: string;
}

export interface GameState {
  gameId: string;
  config: GameConfig;
  chess: Chess;
  fen: string;
  turn: Color;
  orientation: Color;
  dests: Map<string, string[]>;
  isCheck: boolean;
  isGameOver: boolean;
  isBotThinking: boolean;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  resultReason: string;
  lastMove: [string, string] | null;
  history: GameMoveRecord[];
  tags: MoveTag[];
  pendingPromotion: { from: string; to: string } | null;
  strategyState: unknown;

  makeMove: (
    from: string,
    to: string,
    promotion?: 'q' | 'r' | 'b' | 'n',
    tagOverride?: Partial<MoveTag>
  ) => boolean;
  resolvePromotion: (promotion: 'q' | 'r' | 'b' | 'n') => boolean;
  cancelPromotion: () => void;
  resign: () => void;
  resetGame: (customConfig?: Partial<GameConfig>) => void;
  toggleOrientation: () => void;
  setOrientation: (color: Color) => void;
  setConfig: (config: Partial<GameConfig>) => void;
}

const DEFAULT_CONFIG: GameConfig = {
  mode: 'standard',
  playerColor: 'white',
  elo: 1500,
  botDelay: true,
};

export const useGameStore = create<GameState>((set, get) => {
  const initialChess = new Chess();
  const initialGameId = createGameId();

  return {
    gameId: initialGameId,
    config: { ...DEFAULT_CONFIG },
    chess: initialChess,
    fen: initialChess.fen(),
    turn: 'white',
    orientation: 'white',
    dests: getLegalDests(initialChess),
    isCheck: false,
    isGameOver: false,
    isBotThinking: false,
    result: '*',
    resultReason: '',
    lastMove: null,
    history: [],
    tags: [],
    pendingPromotion: null,
    strategyState: {},

    makeMove: (from, to, promotion, tagOverride) => {
      const { chess, isGameOver, gameId, config } = get();
      if (isGameOver) {
        return false;
      }

      if (!promotion && isPromotionMove(chess, from, to)) {
        set({ pendingPromotion: { from, to } });
        return true;
      }

      const fenBefore = chess.fen();
      try {
        const move = chess.move({
          from,
          to,
          promotion: promotion || undefined,
        });

        if (!move) {
          return false;
        }

        const fenAfter = chess.fen();
        const ply = get().history.length + 1;
        const moveRecord: GameMoveRecord = {
          ply,
          san: move.san,
          from: move.from,
          to: move.to,
          promotion: move.promotion,
          fenBefore,
          fenAfter,
        };

        const tag: MoveTag = {
          ply,
          fenBefore,
          san: move.san,
          by: tagOverride?.by ?? 'player',
          ...tagOverride,
        };

        const overState = checkGameOver(chess);
        const nextTurn: Color = chess.turn() === 'w' ? 'white' : 'black';

        set((state) => ({
          fen: fenAfter,
          turn: nextTurn,
          dests: overState.isOver ? new Map() : getLegalDests(chess),
          isCheck: chess.inCheck(),
          isGameOver: overState.isOver,
          result: overState.result,
          resultReason: overState.reason,
          lastMove: [from, to],
          history: [...state.history, moveRecord],
          tags: [...state.tags, tag],
          pendingPromotion: null,
        }));

        if (!overState.isOver) {
          const botColor = config.playerColor === 'white' ? 'black' : 'white';
          if (nextTurn === botColor) {
            executeBotTurn(gameId);
          }
        }

        return true;
      } catch {
        return false;
      }
    },

    resolvePromotion: (promotion) => {
      const { pendingPromotion, makeMove } = get();
      if (!pendingPromotion) {
        return false;
      }
      return makeMove(pendingPromotion.from, pendingPromotion.to, promotion);
    },

    cancelPromotion: () => {
      set({ pendingPromotion: null });
    },

    resign: () => {
      const { turn, isGameOver } = get();
      if (isGameOver) {
        return;
      }

      const winner: Color = turn === 'white' ? 'black' : 'white';
      set({
        isGameOver: true,
        result: winner === 'white' ? '1-0' : '0-1',
        resultReason: `${turn === 'white' ? 'White' : 'Black'} resigned — ${winner === 'white' ? 'White' : 'Black'} wins`,
        dests: new Map(),
      });
    },

    resetGame: (customConfig) => {
      const newChess = new Chess();
      const newGameId = createGameId();
      const updatedConfig = customConfig ? { ...get().config, ...customConfig } : get().config;

      set({
        gameId: newGameId,
        config: updatedConfig,
        chess: newChess,
        fen: newChess.fen(),
        turn: 'white',
        orientation: updatedConfig.playerColor,
        dests: getLegalDests(newChess),
        isCheck: false,
        isGameOver: false,
        isBotThinking: false,
        result: '*',
        resultReason: '',
        lastMove: null,
        history: [],
        tags: [],
        pendingPromotion: null,
        strategyState: {},
      });

      if (updatedConfig.playerColor === 'black') {
        executeBotTurn(newGameId);
      }
    },

    toggleOrientation: () => {
      set((state) => ({
        orientation: state.orientation === 'white' ? 'black' : 'white',
      }));
    },

    setOrientation: (orientation) => {
      set({ orientation });
    },

    setConfig: (newConfig) => {
      set((state) => ({
        config: { ...state.config, ...newConfig },
      }));
    },
  };
});
