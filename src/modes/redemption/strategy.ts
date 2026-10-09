import type { BotStrategy, BotTurnContext, BotTurnResult, GameConfig } from '../../game/types';
import { standardStrategy } from '../standard/strategy';
import type { RedemptionStrategyState } from './types';

export class RedemptionBotStrategy implements BotStrategy<RedemptionStrategyState> {
  public init(config: GameConfig, _rng: () => number): RedemptionStrategyState {
    const lives = config.mode === 'redemption' ? config.lives : 3;
    return {
      livesRemaining: lives,
      redemptionEvents: [],
      usedPuzzleIds: [],
    };
  }

  public async playTurn(
    ctx: BotTurnContext,
    state: RedemptionStrategyState
  ): Promise<{ result: BotTurnResult; nextState: RedemptionStrategyState }> {
    const { result } = await standardStrategy.playTurn(ctx, {});
    return {
      result,
      nextState: state,
    };
  }
}

export const redemptionStrategy = new RedemptionBotStrategy();
