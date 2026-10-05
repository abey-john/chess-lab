import type { BotStrategy, BotTurnContext, BotTurnResult, GameConfig } from '../../game/types';
import { BOT_DELAY_RANGE_MS } from '../../logic/config';

export class StandardBotStrategy implements BotStrategy<Record<string, never>> {
  public init(_config: GameConfig, _rng: () => number): Record<string, never> {
    return {};
  }

  public async playTurn(
    ctx: BotTurnContext,
    state: Record<string, never>
  ): Promise<{ result: BotTurnResult; nextState: Record<string, never> }> {
    const startTime = Date.now();
    const move = await ctx.engine.getBotMove(ctx.fen, ctx.config.elo);

    if (ctx.config.botDelay) {
      const [minDelay, maxDelay] = BOT_DELAY_RANGE_MS;
      const targetDelay = minDelay + ctx.rng() * (maxDelay - minDelay);
      const elapsed = Date.now() - startTime;
      const remaining = targetDelay - elapsed;
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
    }

    return {
      result: {
        move,
        tag: {
          by: 'bot',
        },
      },
      nextState: state,
    };
  }
}

export const standardStrategy = new StandardBotStrategy();
