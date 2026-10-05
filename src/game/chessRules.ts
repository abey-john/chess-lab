import { Chess, type Square } from 'chess.js';
import type { Color } from './types';

export interface GameOverState {
  isOver: boolean;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  reason: string;
}

export function getLegalDests(chess: Chess): Map<string, string[]> {
  const dests = new Map<string, string[]>();
  const moves = chess.moves({ verbose: true });

  for (const move of moves) {
    const from = move.from;
    const to = move.to;
    const current = dests.get(from);
    if (current) {
      if (!current.includes(to)) {
        current.push(to);
      }
    } else {
      dests.set(from, [to]);
    }
  }

  return dests;
}

export function isPromotionMove(chess: Chess, from: string, to: string): boolean {
  const piece = chess.get(from as Square);
  if (!piece || piece.type !== 'p') {
    return false;
  }
  if (piece.color === 'w' && to.endsWith('8')) {
    return true;
  }
  if (piece.color === 'b' && to.endsWith('1')) {
    return true;
  }
  return false;
}

export function checkGameOver(chess: Chess): GameOverState {
  if (chess.isCheckmate()) {
    const winner: Color = chess.turn() === 'w' ? 'black' : 'white';
    return {
      isOver: true,
      result: winner === 'white' ? '1-0' : '0-1',
      reason: `Checkmate — ${winner === 'white' ? 'White' : 'Black'} wins`,
    };
  }

  if (chess.isStalemate()) {
    return {
      isOver: true,
      result: '1/2-1/2',
      reason: 'Draw by stalemate',
    };
  }

  if (chess.isThreefoldRepetition()) {
    return {
      isOver: true,
      result: '1/2-1/2',
      reason: 'Draw by threefold repetition',
    };
  }

  if (chess.isInsufficientMaterial()) {
    return {
      isOver: true,
      result: '1/2-1/2',
      reason: 'Draw by insufficient material',
    };
  }

  if (chess.isDraw()) {
    return {
      isOver: true,
      result: '1/2-1/2',
      reason: 'Draw by fifty-move rule',
    };
  }

  return {
    isOver: false,
    result: '*',
    reason: '',
  };
}
