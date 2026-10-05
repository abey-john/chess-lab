import { Chess } from 'chess.js';
import { BOT_MOVE_MS, MULTIPV_LINES, REVIEW_EVAL_DEPTH } from '../logic/config';
import { StockfishWorker } from './stockfishWorker';
import type { Candidate, EngineService, EvalScore } from './types';
import { parseBestmoveLine, parseCandidates, parseInfoLine } from './uci';

function getRandomLegalMove(fen: string): string {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) {
    return '';
  }
  const move = moves[Math.floor(Math.random() * moves.length)];
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

export class DefaultEngineService implements EngineService {
  private limitedWorker: StockfishWorker;
  private fullStrengthWorker: StockfishWorker;
  private isDisposed = false;

  constructor(workerUrl?: string) {
    const url = workerUrl ?? `${import.meta.env.BASE_URL}engine/stockfish-nnue-16-single.js`;
    this.limitedWorker = new StockfishWorker(url);
    this.fullStrengthWorker = new StockfishWorker(url);
  }

  public async getBotMove(fen: string, elo: number): Promise<string> {
    if (this.isDisposed) {
      return getRandomLegalMove(fen);
    }

    try {
      const commands = [
        'stop',
        'setoption name UCI_LimitStrength value true',
        `setoption name UCI_Elo value ${Math.round(elo)}`,
        `position fen ${fen}`,
        `go movetime ${BOT_MOVE_MS}`,
      ];

      const lines = await this.limitedWorker.executeCommand(
        commands,
        (line) => line.startsWith('bestmove'),
        8000
      );

      for (let i = lines.length - 1; i >= 0; i--) {
        const parsed = parseBestmoveLine(lines[i]);
        if (parsed && parsed.bestmove && parsed.bestmove !== '(none)') {
          return parsed.bestmove;
        }
      }

      return getRandomLegalMove(fen);
    } catch (err) {
      console.warn('Bot move failed, falling back to random move:', err);
      return getRandomLegalMove(fen);
    }
  }

  public async evaluate(
    fen: string,
    depth: number = REVIEW_EVAL_DEPTH
  ): Promise<{ score: EvalScore; depth: number }> {
    if (this.isDisposed) {
      return { score: { kind: 'cp', value: 0 }, depth: 0 };
    }

    const commands = [
      'stop',
      'setoption name UCI_LimitStrength value false',
      'setoption name MultiPV value 1',
      `position fen ${fen}`,
      `go depth ${depth}`,
    ];

    const lines = await this.fullStrengthWorker.executeCommand(
      commands,
      (line) => line.startsWith('bestmove'),
      20000
    );

    let lastScore: EvalScore = { kind: 'cp', value: 0 };
    let lastDepth = depth;

    for (const line of lines) {
      const info = parseInfoLine(line);
      if (info && info.multipv === 1) {
        lastScore = info.score;
        lastDepth = info.depth;
      }
    }

    return { score: lastScore, depth: lastDepth };
  }

  public async getCandidates(
    fen: string,
    n: number = MULTIPV_LINES
  ): Promise<Candidate[]> {
    if (this.isDisposed) {
      return [];
    }

    const commands = [
      'stop',
      'setoption name UCI_LimitStrength value false',
      `setoption name MultiPV value ${n}`,
      `position fen ${fen}`,
      `go depth ${REVIEW_EVAL_DEPTH}`,
    ];

    const lines = await this.fullStrengthWorker.executeCommand(
      commands,
      (line) => line.startsWith('bestmove'),
      20000
    );

    await this.fullStrengthWorker.executeCommand(
      ['setoption name MultiPV value 1'],
      (line) => line === 'readyok' || line.startsWith('info') || line.startsWith('bestmove'),
      2000
    ).catch(() => {});

    return parseCandidates(lines);
  }

  public stop(): void {
    this.limitedWorker.stop().catch(() => {});
    this.fullStrengthWorker.stop().catch(() => {});
  }

  public dispose(): void {
    this.isDisposed = true;
    this.limitedWorker.terminate();
    this.fullStrengthWorker.terminate();
  }
}

let sharedEngineInstance: DefaultEngineService | null = null;

export function getSharedEngine(): DefaultEngineService {
  if (!sharedEngineInstance) {
    sharedEngineInstance = new DefaultEngineService();
  }
  return sharedEngineInstance;
}
