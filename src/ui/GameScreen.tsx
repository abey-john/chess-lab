import { useGameStore } from '../game/gameStore';
import { Board } from './components/Board';
import { GameOverBanner } from './components/GameOverBanner';
import { KnightIcon } from './components/KnightIcon';
import { MoveList } from './components/MoveList';

export function GameScreen() {
  const turn = useGameStore((s) => s.turn);
  const isCheck = useGameStore((s) => s.isCheck);
  const isGameOver = useGameStore((s) => s.isGameOver);
  const isBotThinking = useGameStore((s) => s.isBotThinking);
  const orientation = useGameStore((s) => s.orientation);
  const config = useGameStore((s) => s.config);
  const drawOfferStatus = useGameStore((s) => s.drawOfferStatus);
  const toggleOrientation = useGameStore((s) => s.toggleOrientation);
  const resign = useGameStore((s) => s.resign);
  const resetGame = useGameStore((s) => s.resetGame);
  const goToSetup = useGameStore((s) => s.goToSetup);
  const offerDraw = useGameStore((s) => s.offerDraw);

  return (
    <div className="game-screen">
      <header className="game-header">
        <div className="header-left">
          <button className="setup-nav-btn" onClick={goToSetup} title="Return to Setup Screen">
            ← Setup
          </button>
          <div className="logo-group">
            <KnightIcon size={24} />
            <h1 className="logo-title">Chess Lab</h1>
          </div>
        </div>

        <div className="header-status-group">
          {drawOfferStatus === 'declined' && (
            <div className="draw-toast declined">Draw offer declined by bot</div>
          )}
          {drawOfferStatus === 'offered' && (
            <div className="draw-toast offering">Evaluating draw offer...</div>
          )}

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
          <div className="game-info-card">
            <div className="info-row">
              <span className="info-label">Mode</span>
              <span className="info-value capitalize">{config.mode}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Opponent</span>
              <span className="info-value">Stockfish ({config.elo} Elo)</span>
            </div>
            <div className="info-row">
              <span className="info-label">You Play</span>
              <span className="info-value capitalize">{config.playerColor}</span>
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
              className="action-btn"
              onClick={() => offerDraw()}
              disabled={isGameOver || isBotThinking || drawOfferStatus === 'offered'}
              title="Offer draw to bot"
            >
              🤝 Offer Draw
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
