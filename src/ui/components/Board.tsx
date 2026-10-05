import { useEffect, useRef } from 'react';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Key } from 'chessground/types';
import { useGameStore } from '../../game/gameStore';
import { PromotionDialog } from './PromotionDialog';

import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';

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

    apiRef.current.set({
      fen,
      orientation,
      turnColor: turn,
      check: isCheck,
      lastMove: lastMove ? [lastMove[0] as Key, lastMove[1] as Key] : [],
      movable: {
        color: isGameOver ? undefined : turn,
        dests: isGameOver ? new Map() : cgDests,
      },
    });
  }, [fen, turn, orientation, dests, isCheck, isGameOver, lastMove]);

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
