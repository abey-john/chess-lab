import { useEffect, useMemo, useRef } from 'react';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Key } from 'chessground/types';
import { useGameStore } from '../../game/gameStore';
import { PromotionDialog } from './PromotionDialog';

import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function Board() {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);

  const fen = useGameStore((s) => s.fen);
  const turn = useGameStore((s) => s.turn);
  const orientation = useGameStore((s) => s.orientation);
  const dests = useGameStore((s) => s.dests);
  const isCheck = useGameStore((s) => s.isCheck);
  const isGameOver = useGameStore((s) => s.isGameOver);
  const lastMove = useGameStore((s) => s.lastMove);
  const pendingPromotion = useGameStore((s) => s.pendingPromotion);
  const resolvePromotion = useGameStore((s) => s.resolvePromotion);
  const cancelPromotion = useGameStore((s) => s.cancelPromotion);
  const viewingPly = useGameStore((s) => s.viewingPly);
  const history = useGameStore((s) => s.history);

  const isViewingHistory = viewingPly !== null;
  const effectiveFen = useMemo(() => {
    if (!isViewingHistory) return fen;
    if (viewingPly === 0) return STARTING_FEN;
    return history[viewingPly - 1]?.fenAfter ?? fen;
  }, [isViewingHistory, viewingPly, history, fen]);

  const effectiveLastMove = useMemo<[string, string] | null>(() => {
    if (!isViewingHistory) return lastMove;
    if (viewingPly > 0 && history[viewingPly - 1]) {
      return [history[viewingPly - 1].from, history[viewingPly - 1].to];
    }
    return null;
  }, [isViewingHistory, viewingPly, history, lastMove]);

  useEffect(() => {
    if (!containerRef.current) return;

    const api = Chessground(containerRef.current, {
      animation: {
        enabled: true,
        duration: 200,
      },
      highlight: {
        lastMove: true,
        check: true,
      },
      movable: {
        free: false,
        events: {
          after: (orig, dest) => {
            useGameStore.getState().makeMove(orig, dest);
          },
        },
      },
    });

    apiRef.current = api;

    return () => {
      api.destroy();
      apiRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!apiRef.current) return;

    const cgDests = new Map<Key, Key[]>();
    for (const [from, targets] of dests.entries()) {
      cgDests.set(from as Key, targets as Key[]);
    }

    const disableMoves = isGameOver || isViewingHistory;

    apiRef.current.set({
      fen: effectiveFen,
      orientation,
      turnColor: turn,
      check: isViewingHistory ? false : isCheck,
      lastMove: effectiveLastMove ? [effectiveLastMove[0] as Key, effectiveLastMove[1] as Key] : [],
      movable: {
        color: disableMoves ? undefined : turn,
        dests: disableMoves ? new Map() : cgDests,
      },
    });
  }, [effectiveFen, turn, orientation, dests, isCheck, isGameOver, effectiveLastMove, isViewingHistory]);

  return (
    <div className="board-wrapper">
      <div ref={containerRef} className="chessground-container" />
      {pendingPromotion && (
        <PromotionDialog
          color={turn}
          onSelect={(piece) => resolvePromotion(piece)}
          onCancel={cancelPromotion}
        />
      )}
    </div>
  );
}
