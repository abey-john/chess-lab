import './App.css';
import { useGameStore } from './game/gameStore';
import { GameScreen } from './ui/GameScreen';
import { ReviewScreen } from './ui/ReviewScreen';
import { SetupScreen } from './ui/SetupScreen';

export function App() {
  const screen = useGameStore((s) => s.screen);
  const activeReviewGame = useGameStore((s) => s.activeReviewGame);
  const goToSetup = useGameStore((s) => s.goToSetup);

  if (screen === 'setup') {
    return <SetupScreen />;
  }

  if (screen === 'review' && activeReviewGame) {
    return <ReviewScreen game={activeReviewGame} onBack={goToSetup} />;
  }

  return <GameScreen />;
}

export default App;
