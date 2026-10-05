import { useEffect, useRef } from 'react';
import { useGameStore } from '../../game/gameStore';

export function MoveList() {
  const history = useGameStore((s) => s.history);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history.length]);

  const rows: Array<{ number: number; white?: string; black?: string }> = [];
  for (let i = 0; i < history.length; i += 2) {
    rows.push({
      number: Math.floor(i / 2) + 1,
      white: history[i]?.san,
      black: history[i + 1]?.san,
    });
  }

  return (
    <div className="move-list-panel">
      <div className="move-list-header">
        <span>Move List</span>
        <span className="move-count">{history.length} plies</span>
      </div>
      <div ref={scrollRef} className="move-list-content">
        {rows.length === 0 ? (
          <div className="empty-history">Game started. Make a move!</div>
        ) : (
          <table className="move-table">
            <thead>
              <tr>
                <th className="col-num">#</th>
                <th className="col-move">White</th>
                <th className="col-move">Black</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.number}>
                  <td className="col-num">{row.number}.</td>
                  <td className="col-move white-move">{row.white ?? ''}</td>
                  <td className="col-move black-move">{row.black ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
