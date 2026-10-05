import { Chess } from 'chess.js';
import { create } from 'zustand';
import { checkGameOver, getLegalDests, isPromotionMove } from './chessRules';
import type { Color, MoveTag } from './types';

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
  chess: Chess;
  fen: string;
  turn: Color;
  orientation: Color;
  dests: Map<string, string[]>;
  isCheck: boolean;
  isGameOver: boolean;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  resultReason: string;
  lastMove: [string, string] | null;
  history: GameMoveRecord[];
  tags: MoveTag[];
  pendingPromotion: { from: string; to: string } | null;

  makeMove: (from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n') => boolean;
  resolvePromotion: (promotion: 'q' | 'r' | 'b' | 'n') => boolean;
  cancelPromotion: () => void;
  resign: () => void;
  resetGame: () => void;
  toggleOrientation: () => void;
  setOrientation: (color: Color) => void;
}

export const useGameStore = create<GameState>((set, get) => {
  const initialChess = new Chess();

  return {
    chess: initialChess,
    fen: initialChess.fen(),
    turn: 'white',
    orientation: 'white',
    dests: getLegalDests(initialChess),
    isCheck: false,
    isGameOver: false,
    result: '*',
    resultReason: '',
    lastMove: null,
    history: [],
    tags: [],
    pendingPromotion: null,

    makeMove: (from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n') => {
      const { chess, isGameOver } = get();
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
          by: 'player',
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

        return true;
      } catch {
        return false;
      }
    },

    resolvePromotion: (promotion: 'q' | 'r' | 'b' | 'n') => {
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

    resetGame: () => {
      const newChess = new Chess();
      set({
        chess: newChess,
        fen: newChess.fen(),
        turn: 'white',
        dests: getLegalDests(newChess),
        isCheck: false,
        isGameOver: false,
        result: '*',
        resultReason: '',
        lastMove: null,
        history: [],
        tags: [],
        pendingPromotion: null,
      });
    },

    toggleOrientation: () => {
      set((state) => ({
        orientation: state.orientation === 'white' ? 'black' : 'white',
      }));
    },

    setOrientation: (orientation: Color) => {
      set({ orientation });
    },
  };
});
