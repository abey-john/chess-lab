import { getSharedEngine } from '../engine/engineService';
import { getModeDefinition } from '../modes';
import type { BotTurnContext } from './types';
import { useGameStore } from './gameStore';

export async function executeBotTurn(gameId: string): Promise<void> {
  const state = useGameStore.getState();

  if (state.gameId !== gameId || state.isGameOver) {
    return;
  }

  const botColor = state.config.playerColor === 'white' ? 'black' : 'white';
  if (state.turn !== botColor) {
    return;
  }

  useGameStore.setState({ isBotThinking: true });

  try {
    const engine = getSharedEngine();
    const modeDef = getModeDefinition(state.config.mode);

    const ctx: BotTurnContext = {
      fen: state.fen,
      moves: state.history.map((h) => `${h.from}${h.to}${h.promotion ?? ''}`),
      config: state.config,
      engine,
      rng: Math.random,
      gameId,
    };

    const { result, nextState } = await modeDef.strategy.playTurn(ctx, state.strategyState);

    const currentState = useGameStore.getState();
    if (currentState.gameId !== gameId || currentState.isGameOver) {
      return;
    }

    useGameStore.setState({ strategyState: nextState, isBotThinking: false });

    const moveStr = result.move;
    if (moveStr && moveStr.length >= 4) {
      const from = moveStr.slice(0, 2);
      const to = moveStr.slice(2, 4);
      const promotion = moveStr.length > 4 ? (moveStr[4] as 'q' | 'r' | 'b' | 'n') : undefined;

      useGameStore.getState().makeMove(from, to, promotion, {
        by: 'bot',
        ...result.tag,
      });
    }
  } catch (err) {
    console.error('Error executing bot turn:', err);
    if (useGameStore.getState().gameId === gameId) {
      useGameStore.setState({ isBotThinking: false });
    }
  }
}
