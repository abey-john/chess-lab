import { useEffect, useRef } from 'react';
import { useGameStore } from '../../game/gameStore';

export function MoveList() {
  const history = useGameStore((s) => s.history);
  const viewingPly = useGameStore((s) => s.viewingPly);
  const hasNewMoveSinceHistoryBrowsed = useGameStore((s) => s.hasNewMoveSinceHistoryBrowsed);
  const setViewingPly = useGameStore((s) => s.setViewingPly);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewingPly === null && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history.length, viewingPly]);

  const rows: Array<{
    number: number;
    white?: { san: string; ply: number };
    black?: { san: string; ply: number };
  }> = [];

  for (let i = 0; i < history.length; i += 2) {
    rows.push({
      number: Math.floor(i / 2) + 1,
      white: history[i] ? { san: history[i].san, ply: history[i].ply } : undefined,
      black: history[i + 1] ? { san: history[i + 1].san, ply: history[i + 1].ply } : undefined,
    });
  }

  const currentActivePly = viewingPly !== null ? viewingPly : history.length;

  const handlePrev = () => {
    if (currentActivePly > 0) {
      setViewingPly(currentActivePly - 1);
    }
  };

  const handleNext = () => {
    if (currentActivePly < history.length) {
      if (currentActivePly + 1 === history.length) {
        setViewingPly(null);
      } else {
        setViewingPly(currentActivePly + 1);
      }
    }
  };

  return (
    <div className="move-list-panel">
      <div className="move-list-header">
        <span>Move List</span>
        <span className="move-count">{history.length} plies</span>
      </div>

      {viewingPly !== null && (
        <div className="history-browsing-banner">
          <span className="browsing-label">
            Browsing: {viewingPly === 0 ? 'Start' : `Ply ${viewingPly}`} (Read-only)
          </span>
          <button
            className={`jump-live-btn ${hasNewMoveSinceHistoryBrowsed ? 'has-new' : ''}`}
            onClick={() => setViewingPly(null)}
          >
            {hasNewMoveSinceHistoryBrowsed ? '● Jump to Live (New move!)' : 'Jump to Live ⏭'}
          </button>
        </div>
      )}

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
                  <td
                    className={`col-move white-move ${currentActivePly === row.white?.ply ? 'active-move' : ''}`}
                    onClick={() => row.white && setViewingPly(row.white.ply)}
                  >
                    {row.white?.san ?? ''}
                  </td>
                  <td
                    className={`col-move black-move ${currentActivePly === row.black?.ply ? 'active-move' : ''}`}
                    onClick={() => row.black && setViewingPly(row.black.ply)}
                  >
                    {row.black?.san ?? ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {history.length > 0 && (
        <div className="history-nav-controls">
          <button
            className="nav-btn"
            onClick={() => setViewingPly(0)}
            disabled={currentActivePly === 0}
            title="Start Position"
          >
            ⏮
          </button>
          <button
            className="nav-btn"
            onClick={handlePrev}
            disabled={currentActivePly === 0}
            title="Previous Move"
          >
            ◀
          </button>
          <button
            className="nav-btn"
            onClick={handleNext}
            disabled={currentActivePly >= history.length && viewingPly === null}
            title="Next Move"
          >
            ▶
          </button>
          <button
            className="nav-btn"
            onClick={() => setViewingPly(null)}
            disabled={viewingPly === null}
            title="Latest / Live Position"
          >
            ⏭
          </button>
        </div>
      )}
    </div>
  );
}
