import './App.css';
import { useGameStore } from './game/gameStore';
import { GameScreen } from './ui/GameScreen';
import { SetupScreen } from './ui/SetupScreen';

export function App() {
  const screen = useGameStore((s) => s.screen);

  if (screen === 'setup') {
    return <SetupScreen />;
  }

  return <GameScreen />;
}

export default App;
