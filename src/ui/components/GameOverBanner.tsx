import { useGameStore } from '../../game/gameStore';

export function GameOverBanner() {
  const isGameOver = useGameStore((s) => s.isGameOver);
  const result = useGameStore((s) => s.result);
  const resultReason = useGameStore((s) => s.resultReason);
  const resetGame = useGameStore((s) => s.resetGame);

  if (!isGameOver) {
    return null;
  }

  return (
    <div className="game-over-banner">
      <div className="game-over-badge">{result}</div>
      <div className="game-over-reason">{resultReason}</div>
      <button className="primary-btn" onClick={() => resetGame()}>
        New Game
      </button>
    </div>
  );
}
