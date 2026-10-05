import { useGameStore } from '../game/gameStore';
import { Board } from './components/Board';
import { GameOverBanner } from './components/GameOverBanner';
import { MoveList } from './components/MoveList';

export function GameScreen() {
  const turn = useGameStore((s) => s.turn);
  const isCheck = useGameStore((s) => s.isCheck);
  const isGameOver = useGameStore((s) => s.isGameOver);
  const orientation = useGameStore((s) => s.orientation);
  const toggleOrientation = useGameStore((s) => s.toggleOrientation);
  const resign = useGameStore((s) => s.resign);
  const resetGame = useGameStore((s) => s.resetGame);

  return (
    <div className="game-screen">
      <header className="game-header">
        <div className="logo-group">
          <span className="logo-icon">♟</span>
          <h1 className="logo-title">chess-lab</h1>
        </div>

        <div className="status-badge">
          {!isGameOver ? (
            <>
              <span className={`turn-dot ${turn}`} />
              <span className="status-text">
                {turn === 'white' ? "White's turn" : "Black's turn"}
                {isCheck && <span className="check-alert"> (Check!)</span>}
              </span>
            </>
          ) : (
            <span className="status-text game-ended">Game Finished</span>
          )}
        </div>
      </header>

      <GameOverBanner />

      <main className="game-layout">
        <section className="board-section">
          <Board />
        </section>

        <aside className="sidebar-section">
          <MoveList />

          <div className="game-controls">
            <button
              className="action-btn"
              onClick={toggleOrientation}
              title={`Flip to ${orientation === 'white' ? 'Black' : 'White'} view`}
            >
              🔄 Flip Board
            </button>
            <button
              className="action-btn danger-btn"
              onClick={resign}
              disabled={isGameOver}
              title="Resign game"
            >
              🏳 Resign
            </button>
            <button
              className="action-btn"
              onClick={resetGame}
              title="Reset board"
            >
              ↺ Reset
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
