import type { InProgressGame } from '../game/types';
import { STORAGE_KEY_IN_PROGRESS } from '../logic/config';

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

export function saveInProgress(game: InProgressGame): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(STORAGE_KEY_IN_PROGRESS, JSON.stringify(game));
  } catch (err) {
    console.error('Failed to save in-progress game to localStorage:', err);
  }
}

export function loadInProgress(): InProgressGame | null {
  try {
    const storage = getStorage();
    if (!storage) return null;

    const raw = storage.getItem(STORAGE_KEY_IN_PROGRESS);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
      return null;
    }

    if (typeof parsed.id !== 'string' || !Array.isArray(parsed.moves) || !parsed.config) {
      return null;
    }

    return parsed as InProgressGame;
  } catch {
    return null;
  }
}

export function clearInProgress(): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.removeItem(STORAGE_KEY_IN_PROGRESS);
  } catch (err) {
    console.error('Failed to clear in-progress game from localStorage:', err);
  }
}
