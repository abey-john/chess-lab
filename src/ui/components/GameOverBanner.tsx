import { useGameStore } from '../../game/gameStore';

export function GameOverBanner() {
  const isGameOver = useGameStore((s) => s.isGameOver);
  const result = useGameStore((s) => s.result);
  const resultReason = useGameStore((s) => s.resultReason);
  const resetGame = useGameStore((s) => s.resetGame);
  const openReview = useGameStore((s) => s.openReview);

  if (!isGameOver) {
    return null;
  }

  return (
    <div className="game-over-banner">
      <div className="game-over-badge">{result}</div>
      <div className="game-over-reason">{resultReason}</div>
      <div className="game-over-actions">
        <button className="primary-btn review-btn" onClick={() => openReview()}>
          🔍 Review Game
        </button>
        <button className="secondary-btn" onClick={() => resetGame()}>
          New Game
        </button>
      </div>
    </div>
  );
}
