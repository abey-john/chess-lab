import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { getSharedEngine } from '../engine/engineService';
import type { PositionEval, SavedGame } from '../game/types';
import { startAnalysis, type AnalysisProgress } from '../review/analyzeGame';
import { buildReviewModel, type ReviewModel } from '../review/reviewModel';
import { updateSavedGameAnalysis } from '../storage/savedGames';
import { EvalGraph } from './components/EvalGraph';
import { ModeReviewExtras } from './components/ModeReviewExtras';
import { ReviewBoard } from './components/ReviewBoard';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

interface ReviewScreenProps {
  game: SavedGame;
  onBack: () => void;
}

export function ReviewScreen({ game, onBack }: ReviewScreenProps) {
  const [analysis, setAnalysis] = useState<PositionEval[]>(() => game.analysis ?? []);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(
    () => (game.analysis?.length ?? 0) < game.tags.length + 1
  );
  const [selectedPly, setSelectedPly] = useState<number>(0);
  const cancelTaskRef = useRef<(() => void) | null>(null);

  // Position history for replay
  const positions = useMemo(() => {
    const list: Array<{ ply: number; fen: string; lastMove: [string, string] | null }> = [
      { ply: 0, fen: STARTING_FEN, lastMove: null },
    ];
    const chess = new Chess();
    for (let i = 0; i < game.tags.length; i++) {
      const tag = game.tags[i];
      try {
        const m = chess.move(tag.san);
        list.push({
          ply: i + 1,
          fen: chess.fen(),
          lastMove: m ? [m.from, m.to] : null,
        });
      } catch {
        // ignore replay errors
      }
    }
    return list;
  }, [game.tags]);

  // Run or resume analysis pass if not already fully analyzed
  useEffect(() => {
    const totalExpectedPlies = game.tags.length + 1;
    if (analysis.length >= totalExpectedPlies) {
      return;
    }

    const engine = getSharedEngine();

    const task = startAnalysis(
      game,
      engine,
      (p) => setProgress(p)
    );

    cancelTaskRef.current = task.cancel;

    task.promise
      .then((evals) => {
        setAnalysis(evals);
        setIsAnalyzing(false);
        updateSavedGameAnalysis(game.id, evals);
      })
      .catch((err) => {
        if (err?.message !== 'Analysis cancelled') {
          console.error('Post-game review analysis failed:', err);
        }
        setIsAnalyzing(false);
      });

    return () => {
      cancelTaskRef.current?.();
      cancelTaskRef.current = null;
    };
  }, [game, analysis.length]);

  // Keyboard navigation for review replay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setSelectedPly((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setSelectedPly((prev) => Math.min(positions.length - 1, prev + 1));
      } else if (e.key === 'Home') {
        setSelectedPly(0);
      } else if (e.key === 'End') {
        setSelectedPly(positions.length - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [positions.length]);

  const reviewModel: ReviewModel = useMemo(() => {
    return buildReviewModel({
      ...game,
      analysis,
    });
  }, [game, analysis]);

  const currentPos = positions[selectedPly] ?? positions[0];

  return (
    <div className="review-screen">
      <header className="review-header">
        <div className="header-left">
          <button className="setup-nav-btn" onClick={onBack} title="Back">
            ← Back
          </button>
          <div className="logo-group">
            <span className="logo-icon">♟</span>
            <h1 className="logo-title">Game Review</h1>
          </div>
        </div>

        <div className="review-header-stats">
          {isAnalyzing && (
            <div className="review-analyzing-badge">
              <span className="spinner" /> Analyzing...
            </div>
          )}
          <div className="game-over-badge">{game.result}</div>
          <span className="game-over-reason">{game.resultReason}</span>
        </div>
      </header>

      {isAnalyzing && (
        <div className="analysis-progress-banner">
          <div className="progress-info">
            <span className="spinner" />
            <span className="progress-text">
              {progress
                ? `Analyzing moves with Stockfish: ${progress.currentPly} of ${progress.totalPlies} plies (${progress.percent}%)`
                : 'Starting Stockfish engine analysis... Initializing positions'}
            </span>
          </div>
          <div className="progress-bar-track">
            <div
              className={`progress-bar-fill ${!progress ? 'indeterminate' : ''}`}
              style={{ width: `${progress ? Math.max(5, progress.percent) : 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Summary Stats Row */}
      <section className="review-summary-card">
        <div className="summary-side white-side">
          <div className="side-title">White {game.config.playerColor === 'white' ? '(You)' : '(Bot)'}</div>
          <div className="accuracy-badge">{reviewModel.whiteStats.accuracy.toFixed(1)}% Accuracy</div>
          <div className="breakdown-pills">
            <span className="pill good">{reviewModel.whiteStats.good} Good</span>
            <span className="pill inaccuracy">{reviewModel.whiteStats.inaccuracy} Inacc</span>
            <span className="pill mistake">{reviewModel.whiteStats.mistake} Mistake</span>
            <span className="pill blunder">{reviewModel.whiteStats.blunder} Blunder</span>
          </div>
        </div>

        <div className="summary-vs">VS</div>

        <div className="summary-side black-side">
          <div className="side-title">Black {game.config.playerColor === 'black' ? '(You)' : '(Bot)'}</div>
          <div className="accuracy-badge">{reviewModel.blackStats.accuracy.toFixed(1)}% Accuracy</div>
          <div className="breakdown-pills">
            <span className="pill good">{reviewModel.blackStats.good} Good</span>
            <span className="pill inaccuracy">{reviewModel.blackStats.inaccuracy} Inacc</span>
            <span className="pill mistake">{reviewModel.blackStats.mistake} Mistake</span>
            <span className="pill blunder">{reviewModel.blackStats.blunder} Blunder</span>
          </div>
        </div>
      </section>

      {/* Evaluation Graph */}
      <EvalGraph
        points={reviewModel.evalGraphPoints}
        currentPly={selectedPly}
        onSelectPly={setSelectedPly}
      />

      {/* Main Replay Layout */}
      <main className="game-layout review-layout">
        <section className="board-section">
          <ReviewBoard
            fen={currentPos.fen}
            orientation={game.config.playerColor}
            lastMove={currentPos.lastMove}
          />
          <div className="history-nav-controls review-nav-controls">
            <button
              className="nav-btn"
              onClick={() => setSelectedPly(0)}
              disabled={selectedPly === 0}
              aria-label="Start Position"
              title="Start Position (Home)"
            >
              ⏮
            </button>
            <button
              className="nav-btn"
              onClick={() => setSelectedPly((p) => Math.max(0, p - 1))}
              disabled={selectedPly === 0}
              aria-label="Previous Move"
              title="Previous Move (←)"
            >
              ◀
            </button>
            <button
              className="nav-btn"
              onClick={() => setSelectedPly((p) => Math.min(positions.length - 1, p + 1))}
              disabled={selectedPly >= positions.length - 1}
              aria-label="Next Move"
              title="Next Move (→)"
            >
              ▶
            </button>
            <button
              className="nav-btn"
              onClick={() => setSelectedPly(positions.length - 1)}
              disabled={selectedPly >= positions.length - 1}
              aria-label="Final Position"
              title="Final Position (End)"
            >
              ⏭
            </button>
          </div>
        </section>

        <aside className="sidebar-section">
          {/* Top Swings */}
          {reviewModel.topSwings.length > 0 && (
            <div className="swings-card">
              <h3 className="swings-title">Biggest Game Swings</h3>
              <div className="swings-list">
                {reviewModel.topSwings.map((swing) => (
                  <div
                    key={swing.ply}
                    className={`swing-row ${selectedPly === swing.ply ? 'selected' : ''}`}
                    onClick={() => setSelectedPly(swing.ply)}
                  >
                    <span className="swing-ply">{Math.floor((swing.ply - 1) / 2) + 1}.{swing.ply % 2 === 1 ? '' : '..'} {swing.san}</span>
                    <span className={`pill ${swing.quality}`}>{swing.quality} (-{swing.drop.toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Move Classification List */}
          <div className="move-list-panel review-move-list">
            <div className="move-list-header">
              <span>Moves & Classifications</span>
              <span className="move-count">{reviewModel.classifiedMoves.length} plies</span>
            </div>
            <div className="move-list-content">
              <table className="move-table review-table">
                <thead>
                  <tr>
                    <th className="col-num">#</th>
                    <th className="col-move">Move</th>
                    <th className="col-quality">Quality</th>
                    <th className="col-eval">Your Win %</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewModel.classifiedMoves.map((m) => {
                    const isSelected = selectedPly === m.ply;
                    return (
                      <tr
                        key={m.ply}
                        className={`review-move-row ${isSelected ? 'active-row' : ''}`}
                        onClick={() => setSelectedPly(m.ply)}
                      >
                        <td className="col-num">{m.ply}.</td>
                        <td className="col-move font-bold">{m.san}</td>
                        <td className="col-quality">
                          {m.classification ? (
                            <span className={`pill ${m.classification.quality}`}>
                              {m.classification.quality}
                            </span>
                          ) : (
                            <span className="pill good">—</span>
                          )}
                        </td>
                        <td className="col-eval">
                          {m.playerWinProb !== undefined ? `${m.playerWinProb.toFixed(0)}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </aside>
      </main>

      {/* ModeReviewExtras extension slot (Section B7) */}
      <ModeReviewExtras mode={game.mode} />
    </div>
  );
}
