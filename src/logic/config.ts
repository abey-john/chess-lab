export const SEVERITY_BANDS = {
  good: { max: 5 },
  inaccuracy: { min: 5, max: 10 },
  mistake: { min: 10, max: 20 },
  blunder: { min: 20 },
} as const;

export const REVIEW_EVAL_DEPTH = 14;
export const BOT_MOVE_MS = 600;
export const BOT_DELAY_RANGE_MS = [400, 1500] as const;
export const DRAW_ACCEPT_MAX_ABS_CP = 50;
export const ELO_MIN = 1320;
export const ELO_MAX = 2800;
export const MULTIPV_LINES = 12; // used by candidate search (v1 readiness for v2)
export const SAVED_GAMES_MAX = 50;

// Storage keys namespaced under chesslab: prefix for domain isolation
export const STORAGE_KEY_GAMES = 'chesslab:games:v1';
export const STORAGE_KEY_IN_PROGRESS = 'chesslab:inprogress:v1';
export const STORAGE_KEY_SETTINGS = 'chesslab:settings';
