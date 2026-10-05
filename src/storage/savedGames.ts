import type { PositionEval, SavedGame } from '../game/types';
import { SAVED_GAMES_MAX, STORAGE_KEY_GAMES } from '../logic/config';

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function loadSavedGames(): SavedGame[] {
  try {
    const storage = getStorage();
    if (!storage) return [];

    const raw = storage.getItem(STORAGE_KEY_GAMES);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item) => item && typeof item === 'object' && item.version === 1 && typeof item.id === 'string'
    ) as SavedGame[];
  } catch {
    return [];
  }
}

export function getSavedGame(id: string): SavedGame | null {
  const games = loadSavedGames();
  return games.find((g) => g.id === id) ?? null;
}

export function saveGame(game: SavedGame): void {
  try {
    const storage = getStorage();
    if (!storage) return;

    const games = loadSavedGames();
    const existingIndex = games.findIndex((g) => g.id === game.id);

    if (existingIndex >= 0) {
      games[existingIndex] = game;
    } else {
      games.unshift(game);
      if (games.length > SAVED_GAMES_MAX) {
        games.length = SAVED_GAMES_MAX;
      }
    }

    storage.setItem(STORAGE_KEY_GAMES, JSON.stringify(games));
  } catch (err) {
    console.error('Failed to save game to localStorage:', err);
  }
}

export function updateSavedGameAnalysis(id: string, analysis: PositionEval[]): void {
  try {
    const storage = getStorage();
    if (!storage) return;

    const games = loadSavedGames();
    const target = games.find((g) => g.id === id);
    if (target) {
      target.analysis = analysis;
      storage.setItem(STORAGE_KEY_GAMES, JSON.stringify(games));
    }
  } catch (err) {
    console.error('Failed to update game analysis in localStorage:', err);
  }
}

export function deleteSavedGame(id: string): void {
  try {
    const storage = getStorage();
    if (!storage) return;

    const games = loadSavedGames().filter((g) => g.id !== id);
    storage.setItem(STORAGE_KEY_GAMES, JSON.stringify(games));
  } catch (err) {
    console.error('Failed to delete saved game from localStorage:', err);
  }
}

export function clearSavedGames(): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.removeItem(STORAGE_KEY_GAMES);
  } catch (err) {
    console.error('Failed to clear saved games:', err);
  }
}
