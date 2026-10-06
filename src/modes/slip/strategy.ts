import { Chess } from 'chess.js';
import type { BotStrategy, BotTurnContext, BotTurnResult, GameConfig } from '../../game/types';
import { BOT_DELAY_RANGE_MS, MULTIPV_LINES } from '../../logic/config';
import { chooseSlip, resolveSeverity } from './chooseSlip';
import { DEFAULT_SLIP_FREQUENCY, DEFAULT_SLIP_SEVERITY } from './config';
import { checkPostSearchEligibility, checkPreSearchEligibility } from './eligibility';
import { initSlipScheduler, onSlipDeferred, onSlipPlayed, shouldAttemptSlip, stepNormalMove } from './scheduler';
import type { Frequency, SeverityChoice, SlipStrategyState } from './types';

export class SlipBotStrategy implements BotStrategy<SlipStrategyState> {
  public init(config: GameConfig, rng: () => number): SlipStrategyState {
    const frequency: Frequency = config.mode === 'slip' ? config.frequency : DEFAULT_SLIP_FREQUENCY;
    return initSlipScheduler(frequency, rng);
  }

  public async playTurn(
    ctx: BotTurnContext,
    state: SlipStrategyState
  ): Promise<{ result: BotTurnResult; nextState: SlipStrategyState }> {
    const startTime = Date.now();
    const frequency: Frequency = ctx.config.mode === 'slip' ? ctx.config.frequency : DEFAULT_SLIP_FREQUENCY;
    const severityChoice: SeverityChoice =
      ctx.config.mode === 'slip' ? ctx.config.severity : DEFAULT_SLIP_SEVERITY;

    const currentState: SlipStrategyState =
      state && typeof state.botMovesUntilSlip === 'number'
        ? state
        : this.init(ctx.config, ctx.rng);

    const applyDelay = async () => {
      if (ctx.config.botDelay) {
        const [minDelay, maxDelay] = BOT_DELAY_RANGE_MS;
        const targetDelay = minDelay + ctx.rng() * (maxDelay - minDelay);
        const elapsed = Date.now() - startTime;
        const remaining = targetDelay - elapsed;
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }
      }
    };

    // If countdown hasn't reached 0, play standard Elo-limited move
    if (!shouldAttemptSlip(currentState)) {
      const move = await ctx.engine.getBotMove(ctx.fen, ctx.config.elo);
      const nextState = stepNormalMove(currentState);
      await applyDelay();
      return {
        result: {
          move,
          tag: { by: 'bot' },
        },
        nextState,
      };
    }

    // Countdown is 0 -> Attempt a slip per Section C7
    const chess = new Chess(ctx.fen);
    const legalMovesCount = chess.moves().length;

    // Step a & b: Pre-search eligibility (grace period & forced moves)
    const preCheck = checkPreSearchEligibility(currentState.botMoveCount, legalMovesCount);
    if (!preCheck.eligible) {
      const move = await ctx.engine.getBotMove(ctx.fen, ctx.config.elo);
      const nextState = onSlipDeferred(currentState, preCheck.reason, frequency, ctx.rng);
      await applyDelay();
      return {
        result: {
          move,
          tag: { by: 'bot' },
        },
        nextState,
      };
    }

    // Step c: Full-strength candidate search (MultiPV)
    const candidates = await ctx.engine.getCandidates(ctx.fen, MULTIPV_LINES);
    const postCheck = checkPostSearchEligibility(candidates);
    if (!postCheck.eligible) {
      const move = await ctx.engine.getBotMove(ctx.fen, ctx.config.elo);
      const nextState = onSlipDeferred(currentState, postCheck.reason, frequency, ctx.rng);
      await applyDelay();
      return {
        result: {
          move,
          tag: { by: 'bot' },
        },
        nextState,
      };
    }

    // Step d: Candidate selection
    const resolvedSeverity = resolveSeverity(severityChoice, ctx.rng);
    const slipChoice = chooseSlip(ctx.fen, candidates, resolvedSeverity, ctx.rng);

    if (!slipChoice) {
      // No suitable candidate found in bands or fallbacks -> defer
      const move = await ctx.engine.getBotMove(ctx.fen, ctx.config.elo);
      const nextState = onSlipDeferred(currentState, 'no-candidate', frequency, ctx.rng);
      await applyDelay();
      return {
        result: {
          move,
          tag: { by: 'bot' },
        },
        nextState,
      };
    }

    // Step e: Slip played successfully
    const nextState = onSlipPlayed(currentState, frequency, ctx.rng);
    await applyDelay();
    return {
      result: {
        move: slipChoice.candidate.move,
        tag: {
          by: 'bot',
          slip: slipChoice.tag,
        },
      },
      nextState,
    };
  }
}

export const slipStrategy = new SlipBotStrategy();
