import { Chess } from 'chess.js';
import { create } from 'zustand';
import { getSharedEngine } from '../engine/engineService';
import { DRAW_ACCEPT_MAX_ABS_CP } from '../logic/config';
import { getModeDefinition } from '../modes';
import { checkMoveForBlunder } from '../modes/redemption/blunderDetector';
import { getPuzzleForElo, type PuzzleMoveResult, PuzzleSession } from '../modes/redemption/puzzleService';
import type {
  ActiveRedemptionState,
  RedemptionEvent,
  RedemptionStrategyState,
} from '../modes/redemption/types';
import { clearInProgress, loadInProgress, saveInProgress } from '../storage/inProgress';
import { saveGame } from '../storage/savedGames';
import { executeBotTurn } from './botTurn';
import { checkGameOver, getLegalDests, isPromotionMove } from './chessRules';
import type { Color, GameConfig, MoveTag, SavedGame } from './types';

function createGameId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

export interface GameMoveRecord {
  ply: number;
  san: string;
  from: string;
  to: string;
  promotion?: string;
  fenBefore: string;
  fenAfter: string;
}

export type AppScreen = 'setup' | 'playing' | 'review';

export interface GameState {
  screen: AppScreen;
  gameId: string;
  startedAt: string;
  config: GameConfig;
  chess: Chess;
  fen: string;
  turn: Color;
  orientation: Color;
  dests: Map<string, string[]>;
  isCheck: boolean;
  isGameOver: boolean;
  isBotThinking: boolean;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  resultReason: string;
  lastMove: [string, string] | null;
  history: GameMoveRecord[];
  tags: MoveTag[];
  pendingPromotion: { from: string; to: string } | null;
  strategyState: unknown;
  viewingPly: number | null;
  hasNewMoveSinceHistoryBrowsed: boolean;
  drawOfferStatus: 'idle' | 'offered' | 'declined' | 'accepted';
  activeReviewGame: SavedGame | null;
  activeRedemption: ActiveRedemptionState | null;
  isCheckingBlunder: boolean;

  makeMove: (
    from: string,
    to: string,
    promotion?: 'q' | 'r' | 'b' | 'n',
    tagOverride?: Partial<MoveTag>
  ) => boolean;
  resolvePromotion: (promotion: 'q' | 'r' | 'b' | 'n') => boolean;
  cancelPromotion: () => void;
  resign: () => void;
  offerDraw: () => Promise<boolean>;
  clearDrawOfferStatus: () => void;
  resetGame: (customConfig?: Partial<GameConfig>) => void;
  startGame: (customConfig?: Partial<GameConfig>) => void;
  goToSetup: () => void;
  openReview: (game?: SavedGame) => void;
  resumeGame: () => boolean;
  discardInProgress: () => void;
  setViewingPly: (ply: number | null) => void;
  toggleOrientation: () => void;
  setOrientation: (color: Color) => void;
  setConfig: (config: Partial<GameConfig>) => void;
  acceptBlunder: () => void;
  failRedemption: (reason?: 'failed' | 'timeout') => void;
  solveRedemption: () => void;
  submitRedemptionMove: (
    move: string | { from: string; to: string; promotion?: string }
  ) => PuzzleMoveResult | null;
  tickRedemptionTimer: (remainingMs: number) => void;
}

const DEFAULT_CONFIG: GameConfig = {
  mode: 'standard',
  playerColor: 'white',
  elo: 1500,
  botDelay: true,
};

async function checkAndTriggerRedemption(
  gameId: string,
  moveRecord: GameMoveRecord
) {
  const state = useGameStore.getState();
  if (state.gameId !== gameId || state.isGameOver) return;
  if (state.config.mode !== 'redemption') return;

  const stratState = (state.strategyState as RedemptionStrategyState) ?? {
    livesRemaining: (state.config as any).lives ?? 3,
    redemptionEvents: [],
    usedPuzzleIds: [],
  };

  const lives = stratState.livesRemaining;
  // If lives are exhausted, no redemption QTE triggers; proceed to bot turn
  if (lives !== 'unlimited' && lives <= 0) {
    executeBotTurn(gameId);
    return;
  }

  useGameStore.setState({ isCheckingBlunder: true });

  try {
    const engine = getSharedEngine();
    const result = await checkMoveForBlunder(
      moveRecord.fenBefore,
      moveRecord.fenAfter,
      engine
    );

    const curr = useGameStore.getState();
    if (curr.gameId !== gameId || curr.isGameOver) {
      useGameStore.setState({ isCheckingBlunder: false });
      return;
    }

    if (result.isBlunder) {
      const excludeSet = new Set(stratState.usedPuzzleIds);
      const puzzle = getPuzzleForElo(curr.config.elo, excludeSet);
      const session = new PuzzleSession(puzzle);

      const updatedStratState: RedemptionStrategyState = {
        ...stratState,
        usedPuzzleIds: [...stratState.usedPuzzleIds, puzzle.id],
      };

      useGameStore.setState({
        strategyState: updatedStratState,
        isCheckingBlunder: false,
        activeRedemption: {
          blunderPly: moveRecord.ply,
          blunderMove: moveRecord,
          puzzle,
          session,
          livesRemaining: lives,
          status: 'active',
          timeRemainingMs: 15000,
        },
      });

      saveInProgress({
        version: 1,
        id: gameId,
        mode: curr.config.mode,
        config: curr.config,
        startedAt: curr.startedAt,
        moves: curr.history.map((h) => `${h.from}${h.to}${h.promotion ?? ''}`),
        strategyState: updatedStratState,
      });
    } else {
      useGameStore.setState({ isCheckingBlunder: false });
      executeBotTurn(gameId);
    }
  } catch (err) {
    console.warn('Blunder check error or engine worker unavailable:', err);
    useGameStore.setState({ isCheckingBlunder: false });
    executeBotTurn(gameId);
  }
}

export const useGameStore = create<GameState>((set, get) => {
  const initialChess = new Chess();
  const initialGameId = createGameId();
  const initialStartedAt = new Date().toISOString();

  return {
    screen: 'setup',
    gameId: initialGameId,
    startedAt: initialStartedAt,
    config: { ...DEFAULT_CONFIG },
    chess: initialChess,
    fen: initialChess.fen(),
    turn: 'white',
    orientation: 'white',
    dests: getLegalDests(initialChess),
    isCheck: false,
    isGameOver: false,
    isBotThinking: false,
    result: '*',
    resultReason: '',
    lastMove: null,
    history: [],
    tags: [],
    pendingPromotion: null,
    strategyState: {},
    viewingPly: null,
    hasNewMoveSinceHistoryBrowsed: false,
    drawOfferStatus: 'idle',
    activeReviewGame: null,
    activeRedemption: null,
    isCheckingBlunder: false,

    makeMove: (from, to, promotion, tagOverride) => {
      const { chess, isGameOver, gameId, config } = get();
      if (isGameOver) {
        return false;
      }

      if (!promotion && isPromotionMove(chess, from, to)) {
        set({ pendingPromotion: { from, to } });
        return true;
      }

      const fenBefore = chess.fen();
      try {
        const move = chess.move({
          from,
          to,
          promotion: promotion || undefined,
        });

        if (!move) {
          return false;
        }

        const fenAfter = chess.fen();
        const ply = get().history.length + 1;
        const moveRecord: GameMoveRecord = {
          ply,
          san: move.san,
          from: move.from,
          to: move.to,
          promotion: move.promotion,
          fenBefore,
          fenAfter,
        };

        const tag: MoveTag = {
          ply,
          fenBefore,
          san: move.san,
          by: tagOverride?.by ?? 'player',
          ...tagOverride,
        };

        const overState = checkGameOver(chess);
        const nextTurn: Color = chess.turn() === 'w' ? 'white' : 'black';
        const updatedHistory = [...get().history, moveRecord];
        const updatedTags = [...get().tags, tag];

        set((state) => ({
          fen: fenAfter,
          turn: nextTurn,
          dests: overState.isOver ? new Map() : getLegalDests(chess),
          isCheck: chess.inCheck(),
          isGameOver: overState.isOver,
          result: overState.result,
          resultReason: overState.reason,
          lastMove: [from, to],
          history: updatedHistory,
          tags: updatedTags,
          pendingPromotion: null,
          hasNewMoveSinceHistoryBrowsed: state.viewingPly !== null,
        }));

        if (!overState.isOver) {
          saveInProgress({
            version: 1,
            id: gameId,
            mode: config.mode,
            config,
            startedAt: get().startedAt,
            moves: updatedHistory.map((h) => `${h.from}${h.to}${h.promotion ?? ''}`),
            strategyState: get().strategyState,
          });

          const botColor = config.playerColor === 'white' ? 'black' : 'white';
          if (nextTurn === botColor) {
            if (config.mode === 'redemption' && tag.by === 'player') {
              checkAndTriggerRedemption(gameId, moveRecord);
            } else {
              executeBotTurn(gameId);
            }
          }
        } else {
          const finishedGame: SavedGame = {
            version: 1,
            id: gameId,
            mode: config.mode,
            startedAt: get().startedAt,
            config,
            result: overState.result,
            resultReason: overState.reason,
            pgn: chess.pgn(),
            tags: updatedTags,
          };
          saveGame(finishedGame);
          set({ activeReviewGame: finishedGame });
          clearInProgress();
        }

        return true;
      } catch {
        return false;
      }
    },

    resolvePromotion: (promotion) => {
      const { pendingPromotion, makeMove } = get();
      if (!pendingPromotion) {
        return false;
      }
      return makeMove(pendingPromotion.from, pendingPromotion.to, promotion);
    },

    cancelPromotion: () => {
      set({ pendingPromotion: null });
    },

    resign: () => {
      const { config, isGameOver, gameId, chess } = get();
      if (isGameOver) {
        return;
      }

      const resigningColor = config.playerColor;
      const winner: Color = resigningColor === 'white' ? 'black' : 'white';
      const result = winner === 'white' ? '1-0' : '0-1';
      const resultReason = `${resigningColor === 'white' ? 'White' : 'Black'} resigned — ${winner === 'white' ? 'White' : 'Black'} wins`;

      const finishedGame: SavedGame = {
        version: 1,
        id: gameId,
        mode: config.mode,
        startedAt: get().startedAt,
        config,
        result,
        resultReason,
        pgn: chess.pgn(),
        tags: get().tags,
      };
      saveGame(finishedGame);

      set({
        isGameOver: true,
        result,
        resultReason,
        dests: new Map(),
        activeReviewGame: finishedGame,
        activeRedemption: null,
        isCheckingBlunder: false,
      });
      clearInProgress();
    },

    offerDraw: async () => {
      const { isGameOver, isBotThinking, fen, gameId, config, chess } = get();
      if (isGameOver || isBotThinking) {
        return false;
      }

      set({ drawOfferStatus: 'offered' });

      try {
        const engine = getSharedEngine();
        const evalResult = await engine.evaluate(fen, 10);
        const score = evalResult.score;

        let accepts = false;
        if (score.kind === 'cp' && Math.abs(score.value) <= DRAW_ACCEPT_MAX_ABS_CP) {
          accepts = true;
        }

        if (get().gameId !== gameId) {
          return false;
        }

        if (accepts) {
          const finishedGame: SavedGame = {
            version: 1,
            id: gameId,
            mode: config.mode,
            startedAt: get().startedAt,
            config,
            result: '1/2-1/2',
            resultReason: 'Draw agreed',
            pgn: chess.pgn(),
            tags: get().tags,
          };
          saveGame(finishedGame);

          set({
            isGameOver: true,
            result: '1/2-1/2',
            resultReason: 'Draw agreed',
            dests: new Map(),
            drawOfferStatus: 'accepted',
            activeReviewGame: finishedGame,
            activeRedemption: null,
            isCheckingBlunder: false,
          });
          clearInProgress();
          return true;
        } else {
          set({ drawOfferStatus: 'declined' });
          setTimeout(() => {
            if (get().drawOfferStatus === 'declined') {
              set({ drawOfferStatus: 'idle' });
            }
          }, 3500);
          return false;
        }
      } catch {
        set({ drawOfferStatus: 'declined' });
        return false;
      }
    },

    clearDrawOfferStatus: () => {
      set({ drawOfferStatus: 'idle' });
    },

    resetGame: (customConfig) => {
      const newChess = new Chess();
      const newGameId = createGameId();
      const newStartedAt = new Date().toISOString();
      const updatedConfig = customConfig ? ({ ...get().config, ...customConfig } as GameConfig) : get().config;
      if (updatedConfig.mode === 'redemption' && !(updatedConfig as any).lives) {
        (updatedConfig as any).lives = 3;
      }
      const modeDef = getModeDefinition(updatedConfig.mode);
      const initialStrategyState = modeDef.strategy.init(updatedConfig, Math.random);

      set({
        gameId: newGameId,
        startedAt: newStartedAt,
        config: updatedConfig,
        chess: newChess,
        fen: newChess.fen(),
        turn: 'white',
        orientation: updatedConfig.playerColor,
        dests: getLegalDests(newChess),
        isCheck: false,
        isGameOver: false,
        isBotThinking: false,
        result: '*',
        resultReason: '',
        lastMove: null,
        history: [],
        tags: [],
        pendingPromotion: null,
        strategyState: initialStrategyState,
        viewingPly: null,
        hasNewMoveSinceHistoryBrowsed: false,
        drawOfferStatus: 'idle',
        activeReviewGame: null,
        activeRedemption: null,
        isCheckingBlunder: false,
      });

      clearInProgress();

      if (updatedConfig.playerColor === 'black') {
        executeBotTurn(newGameId);
      }
    },

    startGame: (customConfig) => {
      get().resetGame(customConfig);
      set({ screen: 'playing' });
    },

    goToSetup: () => {
      set({ screen: 'setup', activeRedemption: null });
    },

    openReview: (game) => {
      const target = game ?? get().activeReviewGame;
      if (target) {
        set({ activeReviewGame: target, screen: 'review', activeRedemption: null });
      }
    },

    resumeGame: () => {
      const saved = loadInProgress();
      if (!saved) {
        return false;
      }

      const chess = new Chess();
      const history: GameMoveRecord[] = [];
      const tags: MoveTag[] = [];

      for (let i = 0; i < saved.moves.length; i++) {
        const moveStr = saved.moves[i];
        const from = moveStr.slice(0, 2);
        const to = moveStr.slice(2, 4);
        const promotion = moveStr.length > 4 ? (moveStr[4] as 'q' | 'r' | 'b' | 'n') : undefined;
        const fenBefore = chess.fen();
        const m = chess.move({ from, to, promotion });
        if (!m) {
          console.error('Failed to replay move on resume:', moveStr);
          return false;
        }
        const ply = i + 1;
        const fenAfter = chess.fen();
        history.push({
          ply,
          san: m.san,
          from: m.from,
          to: m.to,
          promotion: m.promotion,
          fenBefore,
          fenAfter,
        });

        const playerColor = saved.config.playerColor;
        const isBot = (i % 2 === 0 && playerColor === 'black') || (i % 2 === 1 && playerColor === 'white');
        tags.push({
          ply,
          fenBefore,
          san: m.san,
          by: isBot ? 'bot' : 'player',
        });
      }

      const overState = checkGameOver(chess);
      const nextTurn: Color = chess.turn() === 'w' ? 'white' : 'black';
      const lastMove: [string, string] | null = saved.moves.length > 0
        ? [saved.moves[saved.moves.length - 1].slice(0, 2), saved.moves[saved.moves.length - 1].slice(2, 4)]
        : null;

      const modeDef = getModeDefinition(saved.config.mode);
      const restoredStrategyState = saved.strategyState ?? modeDef.strategy.init(saved.config, Math.random);

      set({
        gameId: saved.id,
        config: saved.config,
        startedAt: saved.startedAt,
        chess,
        fen: chess.fen(),
        turn: nextTurn,
        orientation: saved.config.playerColor,
        dests: overState.isOver ? new Map() : getLegalDests(chess),
        isCheck: chess.inCheck(),
        isGameOver: overState.isOver,
        isBotThinking: false,
        result: overState.result,
        resultReason: overState.reason,
        lastMove,
        history,
        tags,
        pendingPromotion: null,
        strategyState: restoredStrategyState,
        screen: 'playing',
        viewingPly: null,
        hasNewMoveSinceHistoryBrowsed: false,
        drawOfferStatus: 'idle',
        activeRedemption: null,
        isCheckingBlunder: false,
      });

      if (!overState.isOver) {
        const botColor = saved.config.playerColor === 'white' ? 'black' : 'white';
        if (nextTurn === botColor) {
          executeBotTurn(saved.id);
        }
      }

      return true;
    },

    discardInProgress: () => {
      clearInProgress();
      get().resetGame();
    },

    setViewingPly: (ply) => {
      set({
        viewingPly: ply,
        hasNewMoveSinceHistoryBrowsed: ply === null ? false : get().hasNewMoveSinceHistoryBrowsed,
      });
    },

    toggleOrientation: () => {
      set((state) => ({
        orientation: state.orientation === 'white' ? 'black' : 'white',
      }));
    },

    setOrientation: (orientation) => {
      set({ orientation });
    },

    setConfig: (newConfig) => {
      set((state) => ({
        config: { ...state.config, ...newConfig } as GameConfig,
      }));
    },

    acceptBlunder: () => {
      const { activeRedemption, gameId, tags, strategyState, config, startedAt, history } = get();
      if (!activeRedemption || activeRedemption.status !== 'active') return;

      const stratState = (strategyState as RedemptionStrategyState) ?? {
        livesRemaining: config.mode === 'redemption' ? config.lives : 3,
        redemptionEvents: [],
        usedPuzzleIds: [],
      };

      const event: RedemptionEvent = {
        blunderPly: activeRedemption.blunderPly,
        puzzleId: activeRedemption.puzzle.id,
        puzzleRating: activeRedemption.puzzle.rating,
        outcome: 'accepted',
        timeSpentMs: 15000 - activeRedemption.timeRemainingMs,
      };

      const updatedStratState: RedemptionStrategyState = {
        ...stratState,
        redemptionEvents: [...stratState.redemptionEvents, event],
      };

      const updatedTags = tags.map((t) => {
        if (t.ply === activeRedemption.blunderPly) {
          return {
            ...t,
            redemption: {
              attempted: false,
              outcome: 'accepted' as const,
              puzzleId: activeRedemption.puzzle.id,
              puzzleRating: activeRedemption.puzzle.rating,
            },
          };
        }
        return t;
      });

      set({
        activeRedemption: null,
        tags: updatedTags,
        strategyState: updatedStratState,
      });

      saveInProgress({
        version: 1,
        id: gameId,
        mode: config.mode,
        config,
        startedAt,
        moves: history.map((h) => `${h.from}${h.to}${h.promotion ?? ''}`),
        strategyState: updatedStratState,
      });

      executeBotTurn(gameId);
    },

    failRedemption: (reason = 'failed') => {
      const { activeRedemption, gameId, tags, strategyState, config, startedAt, history } = get();
      if (!activeRedemption || activeRedemption.status !== 'active') return;

      const stratState = (strategyState as RedemptionStrategyState) ?? {
        livesRemaining: config.mode === 'redemption' ? config.lives : 3,
        redemptionEvents: [],
        usedPuzzleIds: [],
      };

      let nextLives = stratState.livesRemaining;
      if (typeof nextLives === 'number') {
        nextLives = Math.max(0, nextLives - 1);
      }

      const event: RedemptionEvent = {
        blunderPly: activeRedemption.blunderPly,
        puzzleId: activeRedemption.puzzle.id,
        puzzleRating: activeRedemption.puzzle.rating,
        outcome: reason,
        timeSpentMs: 15000 - activeRedemption.timeRemainingMs,
      };

      const updatedStratState: RedemptionStrategyState = {
        ...stratState,
        livesRemaining: nextLives,
        redemptionEvents: [...stratState.redemptionEvents, event],
      };

      const updatedTags = tags.map((t) => {
        if (t.ply === activeRedemption.blunderPly) {
          return {
            ...t,
            redemption: {
              attempted: true,
              outcome: reason,
              puzzleId: activeRedemption.puzzle.id,
              puzzleRating: activeRedemption.puzzle.rating,
            },
          };
        }
        return t;
      });

      set({
        activeRedemption: null,
        tags: updatedTags,
        strategyState: updatedStratState,
      });

      saveInProgress({
        version: 1,
        id: gameId,
        mode: config.mode,
        config,
        startedAt,
        moves: history.map((h) => `${h.from}${h.to}${h.promotion ?? ''}`),
        strategyState: updatedStratState,
      });

      executeBotTurn(gameId);
    },

    solveRedemption: () => {
      const { activeRedemption, gameId, tags, strategyState, config, startedAt, history, chess } = get();
      if (!activeRedemption || activeRedemption.status !== 'active') return;

      const stratState = (strategyState as RedemptionStrategyState) ?? {
        livesRemaining: config.mode === 'redemption' ? config.lives : 3,
        redemptionEvents: [],
        usedPuzzleIds: [],
      };

      const event: RedemptionEvent = {
        blunderPly: activeRedemption.blunderPly,
        puzzleId: activeRedemption.puzzle.id,
        puzzleRating: activeRedemption.puzzle.rating,
        outcome: 'solved',
        timeSpentMs: 15000 - activeRedemption.timeRemainingMs,
      };

      const updatedStratState: RedemptionStrategyState = {
        ...stratState,
        redemptionEvents: [...stratState.redemptionEvents, event],
      };

      chess.load(activeRedemption.blunderMove.fenBefore);
      const restoredHistory = history.slice(0, -1);
      const restoredTags = tags.slice(0, -1);
      const lastMove: [string, string] | null = restoredHistory.length > 0
        ? [restoredHistory[restoredHistory.length - 1].from, restoredHistory[restoredHistory.length - 1].to]
        : null;

      set({
        activeRedemption: null,
        fen: activeRedemption.blunderMove.fenBefore,
        turn: config.playerColor,
        dests: getLegalDests(chess),
        isCheck: chess.inCheck(),
        isGameOver: false,
        lastMove,
        history: restoredHistory,
        tags: restoredTags,
        strategyState: updatedStratState,
      });

      saveInProgress({
        version: 1,
        id: gameId,
        mode: config.mode,
        config,
        startedAt,
        moves: restoredHistory.map((h) => `${h.from}${h.to}${h.promotion ?? ''}`),
        strategyState: updatedStratState,
      });
    },

    submitRedemptionMove: (move) => {
      const { activeRedemption } = get();
      if (!activeRedemption || activeRedemption.status !== 'active') return null;

      const res = activeRedemption.session.submitMove(move);
      if (!res.success) {
        get().failRedemption('failed');
        return res;
      }

      if (res.isComplete) {
        get().solveRedemption();
        return res;
      }

      set({
        activeRedemption: {
          ...activeRedemption,
        },
      });
      return res;
    },

    tickRedemptionTimer: (remainingMs) => {
      const { activeRedemption } = get();
      if (!activeRedemption || activeRedemption.status !== 'active') return;

      if (remainingMs <= 0) {
        get().failRedemption('timeout');
        return;
      }

      set({
        activeRedemption: {
          ...activeRedemption,
          timeRemainingMs: remainingMs,
        },
      });
    },
  };
});
