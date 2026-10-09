import { useState } from 'react';
import { useGameStore } from '../game/gameStore';
import type { Color, InProgressGame, ModeId, SavedGame } from '../game/types';
import type { RedemptionLives } from '../modes/redemption/types';
import type { Frequency, SeverityChoice } from '../modes/slip/types';
import { ELO_MAX, ELO_MIN } from '../logic/config';
import { clearSavedGames, deleteSavedGame, loadSavedGames } from '../storage/savedGames';
import { loadInProgress } from '../storage/inProgress';
import { KnightIcon } from './components/KnightIcon';

type ColorChoice = Color | 'random';

function getEloTier(elo: number): string {
  if (elo < 1500) return 'Club / Casual';
  if (elo < 1800) return 'Intermediate';
  if (elo < 2200) return 'Advanced';
  return 'Master / Expert';
}

export function SetupScreen() {
  const [mode, setMode] = useState<ModeId>('standard');
  const [severity, setSeverity] = useState<SeverityChoice>('mixed');
  const [frequency, setFrequency] = useState<Frequency>('sometimes');
  const [redemptionLives, setRedemptionLives] = useState<RedemptionLives>(3);
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

    if (mode === 'redemption') {
      startGame({
        mode: 'redemption',
        playerColor,
        elo,
        botDelay: true,
        lives: redemptionLives,
      });
    } else if (mode === 'slip') {
      startGame({
        mode: 'slip',
        playerColor,
        elo,
        botDelay: true,
        severity,
        frequency,
      });
    } else {
      startGame({
        mode: 'standard',
        playerColor,
        elo,
        botDelay: true,
      });
    }
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
          <KnightIcon size={32} />
          <h1 className="logo-title">Chess Lab</h1>
        </div>
        <p className="setup-tagline">
          Analyze, practice, and experiment against Stockfish 16.
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
                <span className="stat-value">
                  {inProgress.mode === 'slip'
                    ? 'Slip Mode'
                    : inProgress.mode === 'redemption'
                      ? 'Redemption'
                      : 'Standard'}
                </span>
              </div>
              {inProgress.config.mode === 'slip' && (
                <>
                  <div className="resume-stat">
                    <span className="stat-label">Severity:</span>
                    <span className="stat-value capitalize">{inProgress.config.severity}</span>
                  </div>
                  <div className="resume-stat">
                    <span className="stat-label">Frequency:</span>
                    <span className="stat-value capitalize">{inProgress.config.frequency}</span>
                  </div>
                </>
              )}
              {inProgress.config.mode === 'redemption' && (
                <div className="resume-stat">
                  <span className="stat-label">Lives:</span>
                  <span className="stat-value capitalize">
                    {inProgress.config.lives === 'unlimited' ? 'Unlimited' : `${inProgress.config.lives}`}
                  </span>
                </div>
              )}
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
              <button
                className={`mode-btn ${mode === 'standard' ? 'active' : ''}`}
                type="button"
                id="mode-standard-btn"
                onClick={() => setMode('standard')}
              >
                Standard Chess
              </button>
              <button
                className={`mode-btn ${mode === 'slip' ? 'active' : ''}`}
                type="button"
                id="mode-slip-btn"
                onClick={() => setMode('slip')}
              >
                Slip Mode
              </button>
              <button
                className={`mode-btn ${mode === 'redemption' ? 'active' : ''}`}
                type="button"
                id="mode-redemption-btn"
                onClick={() => setMode('redemption')}
              >
                Redemption
              </button>
            </div>

            <div className="mode-blurb-card">
              <span className="mode-blurb-icon">
                {mode === 'standard' && '♟'}
                {mode === 'slip' && '🎯'}
                {mode === 'redemption' && '⚡'}
              </span>
              <p className="mode-blurb-text">
                {mode === 'standard' && (
                  <>
                    <strong className="mode-blurb-title">Standard Chess:</strong> Classic match against Stockfish at your selected ELO. Pure chess with complete post-game analysis.
                  </>
                )}
                {mode === 'slip' && (
                  <>
                    <strong className="mode-blurb-title">Slip Mode:</strong> Even Stockfish can slip up every now and then. Spot the mistakes and punish it!
                  </>
                )}
                {mode === 'redemption' && (
                  <>
                    <strong className="mode-blurb-title">Redemption:</strong> Blunders trigger a quicktime event chess puzzle. Solve it to undo your move!
                  </>
                )}
              </p>
            </div>
          </div>

          {mode === 'redemption' && (
            <div className="redemption-options-group">
              <div className="setup-group">
                <div className="group-header-with-value">
                  <label className="group-label">Redemption Lives</label>
                  <span className="group-hint">
                    {redemptionLives === 1 && 'Hardcore: 1 redo chance'}
                    {redemptionLives === 3 && 'Standard: 3 redo chances'}
                    {redemptionLives === 'unlimited' && 'Casual / Training: Unlimited redos'}
                  </span>
                </div>
                <div className="segmented-selector">
                  <button
                    type="button"
                    id="lives-1-btn"
                    className={`segment-btn ${redemptionLives === 1 ? 'active' : ''}`}
                    onClick={() => setRedemptionLives(1)}
                  >
                    1 Life
                  </button>
                  <button
                    type="button"
                    id="lives-3-btn"
                    className={`segment-btn ${redemptionLives === 3 ? 'active' : ''}`}
                    onClick={() => setRedemptionLives(3)}
                  >
                    3 Lives
                  </button>
                  <button
                    type="button"
                    id="lives-unlimited-btn"
                    className={`segment-btn ${redemptionLives === 'unlimited' ? 'active' : ''}`}
                    onClick={() => setRedemptionLives('unlimited')}
                  >
                    Unlimited
                  </button>
                </div>
              </div>
            </div>
          )}

          {mode === 'slip' && (
            <div className="slip-options-group">
              <div className="setup-group">
                <div className="group-header-with-value">
                  <label className="group-label">Slip Severity</label>
                  <span className="group-hint">
                    {severity === 'mixed' && 'Weighted random mix'}
                    {severity === 'inaccuracy' && 'Minor error (5–10% drop)'}
                    {severity === 'mistake' && 'Significant error (10–20% drop)'}
                    {severity === 'blunder' && 'Game-changing error (>20% drop)'}
                  </span>
                </div>
                <div className="segmented-selector">
                  <button
                    type="button"
                    className={`segment-btn ${severity === 'mixed' ? 'active' : ''}`}
                    onClick={() => setSeverity('mixed')}
                  >
                    Mixed
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${severity === 'inaccuracy' ? 'active' : ''}`}
                    onClick={() => setSeverity('inaccuracy')}
                  >
                    Inaccuracy
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${severity === 'mistake' ? 'active' : ''}`}
                    onClick={() => setSeverity('mistake')}
                  >
                    Mistake
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${severity === 'blunder' ? 'active' : ''}`}
                    onClick={() => setSeverity('blunder')}
                  >
                    Blunder
                  </button>
                </div>
              </div>

              <div className="setup-group">
                <div className="group-header-with-value">
                  <label className="group-label">Slip Frequency</label>
                  <span className="group-hint">
                    {frequency === 'rare' && 'Every 9–14 bot moves'}
                    {frequency === 'sometimes' && 'Every 5–8 bot moves'}
                    {frequency === 'frequent' && 'Every 3–4 bot moves'}
                  </span>
                </div>
                <div className="segmented-selector">
                  <button
                    type="button"
                    className={`segment-btn ${frequency === 'rare' ? 'active' : ''}`}
                    onClick={() => setFrequency('rare')}
                  >
                    Rare
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${frequency === 'sometimes' ? 'active' : ''}`}
                    onClick={() => setFrequency('sometimes')}
                  >
                    Sometimes
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${frequency === 'frequent' ? 'active' : ''}`}
                    onClick={() => setFrequency('frequent')}
                  >
                    Frequent
                  </button>
                </div>
              </div>
            </div>
          )}

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
                        vs Stockfish ({g.config.mode === 'slip' ? 'Slip Mode · ' : g.config.mode === 'redemption' ? 'Redemption · ' : ''}{g.config.elo} Elo) — {g.tags.length} plies
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
