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

  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);

  const [timeLeftMs, setTimeLeftMs] = useState(TOTAL_TIME_MS);
  const [feedback, setFeedback] = useState<{
    type: 'idle' | 'success' | 'failure' | 'step';
    message: string;
  }>({ type: 'idle', message: '' });

  // 15-second countdown timer
  useEffect(() => {
    if (!activeRedemption || activeRedemption.status !== 'active') return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, TOTAL_TIME_MS - elapsed);
      setTimeLeftMs(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        setFeedback({
          type: 'failure',
          message: 'Time expired! 1 Life Lost',
        });
        tickRedemptionTimer(0);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [activeRedemption?.puzzle.id, activeRedemption?.status, tickRedemptionTimer]);

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
        duration: 200,
      },
      highlight: {
        lastMove: true,
        check: true,
      },
      movable: {
        free: false,
        color: playerColor,
        dests: cgDests,
        events: {
          after: (orig, dest) => {
            const currentChess = session.getChessInstance();
            const promotion = isPromotionMove(currentChess, orig, dest) ? 'q' : undefined;

            const res = submitRedemptionMove({ from: orig, to: dest, promotion });
            if (!res) return;

            if (!res.success) {
              setFeedback({
                type: 'failure',
                message: 'Incorrect Move! 1 Life Lost',
              });
            } else if (res.isComplete) {
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
                },
              });
            }
          },
        },
      },
    });

    apiRef.current = api;

    return () => {
      api.destroy();
      apiRef.current = null;
    };
  }, [activeRedemption?.puzzle.id, submitRedemptionMove]);

  if (!activeRedemption) return null;

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
      <div className="redemption-modal" role="dialog" aria-labelledby="redemption-title">
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
            <span className={`timer-readout ${timerColorClass}`}>{seconds}s</span>
          </div>
          <div className="timer-bar-track">
            <div
              className={`timer-bar-fill ${timerColorClass}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Feedback Message */}
        {feedback.message && (
          <div className={`redemption-feedback feedback-${feedback.type}`}>
            {feedback.message}
          </div>
        )}

        {/* Interactive Puzzle Chessboard */}
        <div className="redemption-board-wrapper">
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
            title="Accept blunder and save your lives (0 lives deducted)"
          >
            Accept Blunder
            <span className="btn-subtext">(0 Lives Lost)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
