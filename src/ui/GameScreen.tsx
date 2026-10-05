import { useGameStore } from '../game/gameStore';
import { ELO_MAX, ELO_MIN } from '../logic/config';
import { Board } from './components/Board';
import { GameOverBanner } from './components/GameOverBanner';
import { MoveList } from './components/MoveList';

export function GameScreen() {
  const turn = useGameStore((s) => s.turn);
  const isCheck = useGameStore((s) => s.isCheck);
  const isGameOver = useGameStore((s) => s.isGameOver);
  const isBotThinking = useGameStore((s) => s.isBotThinking);
  const orientation = useGameStore((s) => s.orientation);
  const config = useGameStore((s) => s.config);
  const toggleOrientation = useGameStore((s) => s.toggleOrientation);
  const resign = useGameStore((s) => s.resign);
  const resetGame = useGameStore((s) => s.resetGame);
  const setConfig = useGameStore((s) => s.setConfig);

  const handleEloChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const elo = parseInt(e.target.value, 10);
    setConfig({ elo });
  };

  const handleColorChange = (color: 'white' | 'black') => {
    resetGame({ playerColor: color });
  };

  return (
    <div className="game-screen">
      <header className="game-header">
        <div className="logo-group">
          <span className="logo-icon">♟</span>
          <h1 className="logo-title">chess-lab</h1>
        </div>

        <div className="header-status-group">
          {isBotThinking && (
            <div className="bot-thinking-badge">
              <span className="spinner" /> Bot is thinking...
            </div>
          )}

          <div className="status-badge">
            {!isGameOver ? (
              <>
                <span className={`turn-dot ${turn}`} />
                <span className="status-text">
                  {turn === config.playerColor ? 'Your turn' : "Bot's turn"}
                  {isCheck && <span className="check-alert"> (Check!)</span>}
                </span>
              </>
            ) : (
              <span className="status-text game-ended">Game Finished</span>
            )}
          </div>
        </div>
      </header>

      <GameOverBanner />

      <main className="game-layout">
        <section className="board-section">
          <Board />
        </section>

        <aside className="sidebar-section">
          <div className="bot-settings-card">
            <div className="settings-row">
              <span className="settings-label">Play as</span>
              <div className="color-toggle-btns">
                <button
                  className={`color-btn ${config.playerColor === 'white' ? 'active' : ''}`}
                  onClick={() => handleColorChange('white')}
                >
                  White
                </button>
                <button
                  className={`color-btn ${config.playerColor === 'black' ? 'active' : ''}`}
                  onClick={() => handleColorChange('black')}
                >
                  Black
                </button>
              </div>
            </div>

            <div className="settings-row">
              <div className="elo-header">
                <span className="settings-label">Bot Elo:</span>
                <span className="elo-value">{config.elo}</span>
              </div>
              <input
                type="range"
                className="elo-slider"
                min={ELO_MIN}
                max={ELO_MAX}
                step={20}
                value={config.elo}
                onChange={handleEloChange}
                aria-label="Bot Elo"
              />
            </div>

            <div className="settings-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.botDelay}
                  onChange={(e) => setConfig({ botDelay: e.target.checked })}
                />
                Human-like thinking delay
              </label>
            </div>
          </div>

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
              disabled={isGameOver || isBotThinking}
              title="Resign game"
            >
              🏳 Resign
            </button>
            <button
              className="action-btn"
              onClick={() => resetGame()}
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
