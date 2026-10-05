import { useEffect, useRef } from 'react';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Key } from 'chessground/types';
import type { Color } from '../../game/types';

import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';

interface ReviewBoardProps {
  fen: string;
  orientation: Color;
  lastMove: [string, string] | null;
}

export function ReviewBoard({ fen, orientation, lastMove }: ReviewBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const api = Chessground(containerRef.current, {
      viewOnly: true,
      animation: {
        enabled: true,
        duration: 150,
      },
      highlight: {
        lastMove: true,
        check: true,
      },
      movable: {
        free: false,
        dests: new Map(),
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

    const shapes = lastMove
      ? [
          {
            orig: lastMove[0] as Key,
            dest: lastMove[1] as Key,
            brush: 'paleGreen',
          },
        ]
      : [];

    apiRef.current.set({
      fen,
      orientation,
      lastMove: lastMove ? [lastMove[0] as Key, lastMove[1] as Key] : [],
      drawable: {
        autoShapes: shapes,
      },
    });
  }, [fen, orientation, lastMove]);

  return (
    <div className="board-wrapper review-board-wrapper">
      <div ref={containerRef} className="chessground-container" />
    </div>
  );
}
