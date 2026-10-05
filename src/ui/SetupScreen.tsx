import { useState } from 'react';
import { useGameStore } from '../game/gameStore';
import type { Color, InProgressGame } from '../game/types';
import { ELO_MAX, ELO_MIN } from '../logic/config';
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
  const [botDelay, setBotDelay] = useState<boolean>(true);
  const [inProgress, setInProgress] = useState<InProgressGame | null>(() => loadInProgress());

  const startGame = useGameStore((s) => s.startGame);
  const resumeGame = useGameStore((s) => s.resumeGame);
  const discardInProgress = useGameStore((s) => s.discardInProgress);

  const handleStartGame = () => {
    const playerColor: Color =
      colorChoice === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : colorChoice;

    startGame({
      mode: 'standard',
      playerColor,
      elo,
      botDelay,
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

          <div className="setup-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={botDelay}
                onChange={(e) => setBotDelay(e.target.checked)}
              />
              <span>Human-like thinking delay (400ms – 1500ms)</span>
            </label>
          </div>

          <button className="primary-btn start-game-btn" onClick={handleStartGame}>
            Start Game ⚔
          </button>
        </div>
      </main>
    </div>
  );
}
