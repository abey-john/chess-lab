import { useEffect, useRef, useState } from 'react';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Key } from 'chessground/types';
import { getLegalDests, isPromotionMove } from '../../game/chessRules';
import { useGameStore } from '../../game/gameStore';

import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';

const TOTAL_TIME_MS = 15000;

export function RedemptionModal() {
  const activeRedemption = useGameStore((s) => s.activeRedemption);
  const acceptBlunder = useGameStore((s) => s.acceptBlunder);
  const submitRedemptionMove = useGameStore((s) => s.submitRedemptionMove);
  const tickRedemptionTimer = useGameStore((s) => s.tickRedemptionTimer);
  const failRedemption = useGameStore((s) => s.failRedemption);

  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);

  const [timeLeftMs, setTimeLeftMs] = useState(TOTAL_TIME_MS);
  const timeLeftMsRef = useRef(timeLeftMs);
  timeLeftMsRef.current = timeLeftMs;

  const [feedback, setFeedback] = useState<{
    type: 'idle' | 'success' | 'failure' | 'step';
    message: string;
  }>({ type: 'idle', message: '' });

  const [isFailed, setIsFailed] = useState(false);
  const [failureReason, setFailureReason] = useState<'failed' | 'timeout' | null>(null);
  const [bestMoveSan, setBestMoveSan] = useState<string | null>(null);
  const [shakeBoard, setShakeBoard] = useState(false);

  const failureHandledRef = useRef(false);
  const failureTimerRef = useRef<number | null>(null);

  // Trigger failure sequence (shake, red glow, green arrow reveal, 1.2s hold)
  const triggerFailure = (reason: 'failed' | 'timeout') => {
    if (failureHandledRef.current || !activeRedemption) return;
    failureHandledRef.current = true;

    const session = activeRedemption.session;
    const playerColor = session.getPlayerColor();
    const expected = session.getExpectedMoveDetails();

    setIsFailed(true);
    setFailureReason(reason);
    if (expected?.san) {
      setBestMoveSan(expected.san);
    }
    setShakeBoard(true);

    if (reason === 'failed') {
      tickRedemptionTimer(timeLeftMsRef.current);
    }

    if (apiRef.current) {
      const api = apiRef.current;
      api.cancelMove();
      api.set({
        fen: session.getFen(),
        turnColor: playerColor,
        movable: {
          color: undefined,
          dests: new Map(),
          showDests: false,
        },
        draggable: {
          enabled: false,
        },
      });

      if (expected) {
        api.setAutoShapes([
          {
            orig: expected.from as Key,
            dest: expected.to as Key,
            brush: 'green',
          },
        ]);
      }
      api.redrawAll();
    }

    failureTimerRef.current = window.setTimeout(() => {
      failRedemption(reason);
    }, 1200);
  };

  // Cleanup failure timer on unmount
  useEffect(() => {
    return () => {
      if (failureTimerRef.current !== null) {
        clearTimeout(failureTimerRef.current);
      }
    };
  }, []);

  // 15-second countdown timer
  useEffect(() => {
    if (!activeRedemption || activeRedemption.status !== 'active' || isFailed) return;

    const startTime = Date.now();
    const startRemaining = timeLeftMs;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, startRemaining - elapsed);
      setTimeLeftMs(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        triggerFailure('timeout');
      }
    }, 50);

    return () => clearInterval(interval);
  }, [activeRedemption?.puzzle.id, activeRedemption?.status, isFailed]);

  // Initialize and manage the puzzle Chessground board
  useEffect(() => {
    if (!containerRef.current || !activeRedemption) return;

    const session = activeRedemption.session;
    const playerColor = session.getPlayerColor();
    const chess = session.getChessInstance();

    const cgDests = new Map<Key, Key[]>();
    for (const [from, targets] of getLegalDests(chess).entries()) {
      cgDests.set(from as Key, targets as Key[]);
    }

    const api = Chessground(containerRef.current, {
      fen: session.getFen(),
      orientation: playerColor,
      turnColor: playerColor,
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
        color: playerColor,
        dests: cgDests,
        showDests: true,
        events: {
          after: (orig, dest) => {
            if (failureHandledRef.current) return;

            const currentChess = session.getChessInstance();
            const promotion = isPromotionMove(currentChess, orig, dest) ? 'q' : undefined;
            const uciMove = `${orig}${dest}${promotion ?? ''}`.toLowerCase();
            const expected = session.getExpectedMoveDetails();

            if (!expected || uciMove !== expected.uci) {
              triggerFailure('failed');
              return;
            }

            const res = submitRedemptionMove({ from: orig, to: dest, promotion });
            if (!res) return;

            if (res.isComplete) {
              setFeedback({
                type: 'success',
                message: 'Puzzle Solved! Blunder Undone!',
              });
            } else if (res.opponentMove) {
              // Intermediate step in multi-move sequence
              setFeedback({
                type: 'step',
                message: 'Good move! Opponent replied...',
              });

              // Update board for next player step
              const nextChess = session.getChessInstance();
              const nextDests = new Map<Key, Key[]>();
              for (const [f, tgts] of getLegalDests(nextChess).entries()) {
                nextDests.set(f as Key, tgts as Key[]);
              }

              api.set({
                fen: session.getFen(),
                turnColor: playerColor,
                lastMove: [res.opponentMove.from as Key, res.opponentMove.to as Key],
                movable: {
                  color: playerColor,
                  dests: nextDests,
                  showDests: true,
                },
              });
            }
          },
        },
      },
      draggable: {
        enabled: true,
        showGhost: true,
      },
      selectable: {
        enabled: true,
      },
      drawable: {
        enabled: false,
        visible: true,
        brushes: {
          green: { key: 'g', color: '#22c55e', opacity: 0.95, lineWidth: 10 },
        },
      },
    });

    apiRef.current = api;

    // Ensure Chessground layout and hitboxes are pixel-perfect immediately and during animations
    requestAnimationFrame(() => {
      api.redrawAll();
    });
    const t1 = setTimeout(() => api.redrawAll(), 50);
    const t2 = setTimeout(() => api.redrawAll(), 250);

    const resizeObserver = new ResizeObserver(() => {
      api.redrawAll();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      resizeObserver.disconnect();
      api.destroy();
      apiRef.current = null;
    };
  }, [activeRedemption?.puzzle.id, submitRedemptionMove]);

  if (!activeRedemption) return null;

  const session = activeRedemption.session;
  const playerColor = session.getPlayerColor();

  const seconds = (timeLeftMs / 1000).toFixed(1);
  const progressPercent = Math.max(0, Math.min(100, (timeLeftMs / TOTAL_TIME_MS) * 100));

  let timerColorClass = 'timer-green';
  if (timeLeftMs < 5000) {
    timerColorClass = 'timer-red pulse-urgent';
  } else if (timeLeftMs < 10000) {
    timerColorClass = 'timer-amber';
  }

  const livesRemaining = activeRedemption.livesRemaining;
  const livesDisplay =
    livesRemaining === 'unlimited'
      ? '∞ Unlimited'
      : '❤️'.repeat(Math.max(0, Number(livesRemaining))) || '0';

  return (
    <div className="redemption-overlay" id="redemption-modal-overlay">
      <div
        className={`redemption-modal ${isFailed ? 'qte-failed' : ''}`}
        role="dialog"
        aria-labelledby="redemption-title"
      >
        {/* Arcade Alert Header */}
        <div className="redemption-header">
          <div className="redemption-badge-row">
            <span className="blunder-alert-badge">⚡ BLUNDER DETECTED</span>
            <span className="qte-badge">QUICKTIME EVENT</span>
          </div>
          <h2 id="redemption-title" className="redemption-title">
            Redemption Opportunity
          </h2>
          <p className="redemption-subtitle">
            You blundered with <strong>{activeRedemption.blunderMove.san}</strong>. Solve this puzzle to undo your blunder!
          </p>
        </div>

        {/* 15s Countdown Progress Bar */}
        <div className="redemption-timer-card">
          <div className="timer-header">
            <span className="timer-label">Time Remaining</span>
            <span
              className={`timer-readout ${
                isFailed && failureReason === 'timeout' ? 'timer-red' : timerColorClass
              }`}
            >
              {isFailed && failureReason === 'timeout' ? '0.0s' : `${seconds}s`}
            </span>
          </div>
          <div className="timer-bar-track">
            <div
              className={`timer-bar-fill ${
                isFailed && failureReason === 'timeout' ? 'timer-red' : timerColorClass
              }`}
              style={{
                width: `${isFailed && failureReason === 'timeout' ? 0 : progressPercent}%`,
              }}
            />
          </div>
        </div>

        {/* Turn & Objective Banner / Failure Reveal Banner */}
        {isFailed ? (
          <div
            className="redemption-turn-banner turn-failed"
            id="redemption-failure-banner"
          >
            <div className="turn-banner-left">
              <span className="turn-color-indicator failed" />
              <div className="turn-banner-failed-details">
                <strong className="failure-headline">
                  {failureReason === 'timeout' ? '⏱️ TIME EXPIRED' : '❌ INCORRECT MOVE'}
                  <span className="failure-life-tag"> — 1 Life Lost</span>
                </strong>
                {bestMoveSan && (
                  <div className="failure-best-move-hint">
                    Best move was <span className="best-move-chip">{bestMoveSan}</span>
                  </div>
                )}
              </div>
            </div>
            <span className="turn-move-count failed-count">Failed</span>
          </div>
        ) : (
          <div className={`redemption-turn-banner turn-${playerColor}`}>
            <div className="turn-banner-left">
              <span className={`turn-color-indicator ${playerColor}`} />
              <span className="turn-banner-text">
                <strong>{playerColor === 'white' ? 'White' : 'Black'} to move</strong>
                <span className="turn-banner-sub"> — Find the tactic to undo blunder</span>
              </span>
            </div>
            <span className="turn-move-count">
              {activeRedemption.puzzle.solution.length === 1
                ? '1 move'
                : `${Math.ceil(activeRedemption.puzzle.solution.length / 2)} moves`}
            </span>
          </div>
        )}

        {/* Feedback Message (when solving or intermediate steps) */}
        {!isFailed && feedback.message && (
          <div className={`redemption-feedback feedback-${feedback.type}`}>
            {feedback.message}
          </div>
        )}

        {/* Interactive Puzzle Chessboard */}
        <div className={`redemption-board-wrapper ${shakeBoard ? 'board-shake' : ''}`}>
          <div ref={containerRef} className="chessground-container redemption-chessground" />
        </div>

        {/* Meta details & Themes */}
        <div className="redemption-meta-row">
          <div className="meta-badge">
            <span className="meta-label">Puzzle ELO</span>
            <span className="meta-value">{activeRedemption.puzzle.rating}</span>
          </div>
          <div className="meta-badge">
            <span className="meta-label">Lives Left</span>
            <span className="meta-value lives-value">{livesDisplay}</span>
          </div>
          {activeRedemption.puzzle.themes.length > 0 && (
            <div className="themes-list">
              {activeRedemption.puzzle.themes.slice(0, 3).map((theme) => (
                <span key={theme} className="theme-tag">
                  #{theme}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="redemption-actions">
          <button
            type="button"
            id="accept-blunder-btn"
            className="action-btn accept-blunder-btn"
            onClick={acceptBlunder}
            disabled={isFailed}
            title={
              isFailed
                ? 'QTE failed'
                : 'Accept blunder and save your lives (0 lives deducted)'
            }
          >
            Accept Blunder
            <span className="btn-subtext">(0 Lives Lost)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
