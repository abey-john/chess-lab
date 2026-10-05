import { useState } from 'react';
import { useGameStore } from '../game/gameStore';
import type { Color, InProgressGame, SavedGame } from '../game/types';
import { ELO_MAX, ELO_MIN } from '../logic/config';
import { clearSavedGames, deleteSavedGame, loadSavedGames } from '../storage/savedGames';
import { loadInProgress } from '../storage/inProgress';

type ColorChoice = Color | 'random';

function getEloTier(elo: number): string {
  if (elo < 1500) return 'Club / Casual';
  if (elo < 1800) return 'Intermediate';
  if (elo < 2200) return 'Advanced';
  return 'Master / Expert';
}

export function SetupScreen() {
  const [colorChoice, setColorChoice] = useState<ColorChoice>('white');
  const [elo, setElo] = useState<number>(1500);
  const [inProgress, setInProgress] = useState<InProgressGame | null>(() => loadInProgress());
  const [savedGames, setSavedGames] = useState<SavedGame[]>(() => loadSavedGames());

  const startGame = useGameStore((s) => s.startGame);
  const resumeGame = useGameStore((s) => s.resumeGame);
  const discardInProgress = useGameStore((s) => s.discardInProgress);
  const openReview = useGameStore((s) => s.openReview);

  const handleStartGame = () => {
    const playerColor: Color =
      colorChoice === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : colorChoice;

    startGame({
      mode: 'standard',
      playerColor,
      elo,
      botDelay: true,
    });
  };

  const handleResume = () => {
    const success = resumeGame();
    if (!success) {
      setInProgress(null);
    }
  };

  const handleDiscard = () => {
    discardInProgress();
    setInProgress(null);
  };

  const handleDeleteGame = (id: string) => {
    deleteSavedGame(id);
    setSavedGames(loadSavedGames());
  };

  const handleClearAll = () => {
    if (window.confirm('Delete all saved games?')) {
      clearSavedGames();
      setSavedGames([]);
    }
  };

  return (
    <div className="setup-screen">
      <header className="setup-header">
        <div className="logo-group">
          <span className="logo-icon">♟</span>
          <h1 className="logo-title">chess-lab</h1>
        </div>
        <p className="setup-tagline">
          Analyze, practice, and experiment against Stockfish 16 running completely client-side in WebAssembly.
        </p>
      </header>

      <main className="setup-container">
        {inProgress && (
          <div className="resume-card">
            <div className="resume-header">
              <span className="resume-badge">In-Progress Game Found</span>
              <span className="resume-date">
                {new Date(inProgress.startedAt).toLocaleDateString()} {new Date(inProgress.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="resume-body">
              <div className="resume-stat">
                <span className="stat-label">Mode:</span>
                <span className="stat-value">{inProgress.mode}</span>
              </div>
              <div className="resume-stat">
                <span className="stat-label">Playing As:</span>
                <span className="stat-value capitalize">{inProgress.config.playerColor}</span>
              </div>
              <div className="resume-stat">
                <span className="stat-label">Bot Elo:</span>
                <span className="stat-value">{inProgress.config.elo}</span>
              </div>
              <div className="resume-stat">
                <span className="stat-label">Moves Played:</span>
                <span className="stat-value">{inProgress.moves.length} plies</span>
              </div>
            </div>
            <div className="resume-actions">
              <button className="primary-btn resume-btn" onClick={handleResume}>
                ▶ Resume Game
              </button>
              <button className="danger-btn discard-btn" onClick={handleDiscard}>
                ✕ Discard
              </button>
            </div>
          </div>
        )}

        <div className="setup-card">
          <h2 className="setup-card-title">New Game Setup</h2>

          <div className="setup-group">
            <label className="group-label">Game Mode</label>
            <div className="mode-selector">
              <button className="mode-btn active" type="button">
                Standard Chess
              </button>
            </div>
          </div>

          <div className="setup-group">
            <label className="group-label">Play As</label>
            <div className="color-selector">
              <button
                type="button"
                className={`color-choice-btn ${colorChoice === 'white' ? 'active' : ''}`}
                onClick={() => setColorChoice('white')}
              >
                <span className="color-icon">♔</span> White
              </button>
              <button
                type="button"
                className={`color-choice-btn ${colorChoice === 'random' ? 'active' : ''}`}
                onClick={() => setColorChoice('random')}
              >
                <span className="color-icon">⚄</span> Random
              </button>
              <button
                type="button"
                className={`color-choice-btn ${colorChoice === 'black' ? 'active' : ''}`}
                onClick={() => setColorChoice('black')}
              >
                <span className="color-icon">♚</span> Black
              </button>
            </div>
          </div>

          <div className="setup-group">
            <div className="group-header-with-value">
              <label className="group-label">Bot Strength (Elo)</label>
              <div className="elo-display">
                <span className="elo-number">{elo}</span>
                <span className="elo-tier-badge">{getEloTier(elo)}</span>
              </div>
            </div>
            <input
              type="range"
              className="elo-slider"
              min={ELO_MIN}
              max={ELO_MAX}
              step={20}
              value={elo}
              onChange={(e) => setElo(parseInt(e.target.value, 10))}
              aria-label="Bot Elo"
            />
            <div className="elo-scale-labels">
              <span>{ELO_MIN}</span>
              <span>2000</span>
              <span>{ELO_MAX}</span>
            </div>
          </div>

          <button className="primary-btn start-game-btn" onClick={handleStartGame}>
            Start Game ⚔
          </button>
        </div>

        {savedGames.length > 0 && (
          <div className="past-games-card">
            <div className="past-games-header">
              <h3 className="past-games-title">Completed Games ({savedGames.length})</h3>
              <button
                type="button"
                className="clear-games-btn"
                onClick={handleClearAll}
                title="Clear all saved games"
              >
                Clear All
              </button>
            </div>
            <div className="past-games-list">
              {savedGames.map((g) => (
                <div key={g.id} className="past-game-item">
                  <div className="past-game-main">
                    <span className="past-game-result">{g.result}</span>
                    <div className="past-game-meta">
                      <span className="past-game-desc">
                        vs Stockfish ({g.config.elo} Elo) — {g.tags.length} plies
                      </span>
                      <span className="past-game-date">
                        {new Date(g.startedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="past-game-actions">
                    <button className="secondary-btn review-link-btn" onClick={() => openReview(g)}>
                      Review 🔍
                    </button>
                    <button
                      type="button"
                      className="danger-btn delete-game-btn"
                      onClick={() => handleDeleteGame(g.id)}
                      title="Delete game"
                      aria-label="Delete game"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
