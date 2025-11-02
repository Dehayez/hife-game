// localStorage utility functions for high scores and best times

import { handleStorageError } from './ErrorHandler.js';

const STORAGE_KEY_PREFIX = 'hife_game_';

export function getHighScore(mode, arena = 'standard') {
  try {
    const key = `${STORAGE_KEY_PREFIX}${mode}_${arena}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.highScore || 0;
    }
  } catch (e) {
    return handleStorageError(e, 'read', `highScore_${mode}_${arena}`);
  }
}

export function setHighScore(mode, score, arena = 'standard') {
  try {
    const key = `${STORAGE_KEY_PREFIX}${mode}_${arena}`;
    const current = getHighScore(mode, arena);
    if (score > current) {
      localStorage.setItem(key, JSON.stringify({ highScore: score }));
      return true;
    }
  } catch (e) {
    return handleStorageError(e, 'write', `highScore_${mode}_${arena}`);
  }
}

export function getBestTime(mode, arena = 'standard') {
  try {
    const key = `${STORAGE_KEY_PREFIX}${mode}_${arena}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.bestTime || null;
    }
  } catch (e) {
    return handleStorageError(e, 'read', `bestTime_${mode}_${arena}`);
  }
}

export function setBestTime(mode, time, arena = 'standard') {
  try {
    const key = `${STORAGE_KEY_PREFIX}${mode}_${arena}`;
    const current = getBestTime(mode, arena);
    
    // For time-trial: lower is better, for survival: higher is better
    const isBetter = mode === 'time-trial' 
      ? (!current || time < current)
      : (!current || time > current);
    
    if (isBetter) {
      const existing = getHighScore(mode, arena);
      localStorage.setItem(key, JSON.stringify({ 
        highScore: existing,
        bestTime: time 
      }));
      return true;
    }
  } catch (e) {
    return handleStorageError(e, 'write', `bestTime_${mode}_${arena}`);
  }
}

export function getAllHighScores() {
  const scores = {};
  const modes = ['collection', 'survival', 'time-trial', 'free-play'];
  
  modes.forEach(mode => {
    scores[mode] = getHighScore(mode);
  });
  
  return scores;
}

export function getLastCharacter() {
  try {
    const key = `${STORAGE_KEY_PREFIX}last_character`;
    const stored = localStorage.getItem(key);
    return stored || null;
  } catch (e) {
    return handleStorageError(e, 'read', 'lastCharacter');
  }
}

export function setLastCharacter(characterName) {
  try {
    const key = `${STORAGE_KEY_PREFIX}last_character`;
    localStorage.setItem(key, characterName);
    return true;
  } catch (e) {
    return handleStorageError(e, 'write', 'lastCharacter');
  }
}

export function getLastGameMode() {
  try {
    const key = `${STORAGE_KEY_PREFIX}last_game_mode`;
    const stored = localStorage.getItem(key);
    return stored || null;
  } catch (e) {
    return handleStorageError(e, 'read', 'lastGameMode');
  }
}

export function setLastGameMode(gameMode) {
  try {
    const key = `${STORAGE_KEY_PREFIX}last_game_mode`;
    localStorage.setItem(key, gameMode);
    return true;
  } catch (e) {
    return handleStorageError(e, 'write', 'lastGameMode');
  }
}

/**
 * Get saved bot count for Mystic Battle (shooting mode) for a specific arena
 * @param {string} arena - Arena key ('standard' or 'large')
 * @returns {number} Bot count (default 0)
 */
export function getBotCount(arena = 'standard') {
  try {
    const key = `${STORAGE_KEY_PREFIX}shooting_bot_count_${arena}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Math.max(0, Math.floor(parsed.botCount || 0));
    }
  } catch (e) {
    handleStorageError(e, 'read', `botCount_${arena}`);
    return 0;
  }
}

/**
 * Save bot count for Mystic Battle (shooting mode) for a specific arena
 * @param {number} botCount - Bot count to save
 * @param {string} arena - Arena key ('standard' or 'large')
 * @returns {boolean} True if saved successfully
 */
export function setBotCount(botCount, arena = 'standard') {
  try {
    const key = `${STORAGE_KEY_PREFIX}shooting_bot_count_${arena}`;
    const count = Math.max(0, Math.floor(botCount || 0));
    localStorage.setItem(key, JSON.stringify({ botCount: count }));
    return true;
  } catch (e) {
    return handleStorageError(e, 'write', `botCount_${arena}`);
  }
}

/**
 * Get maximum bot count allowed for an arena
 * @param {string} arena - Arena key ('standard' or 'large')
 * @returns {number} Maximum bot count
 */
export function getMaxBotCount(arena = 'standard') {
  // 20x20 arena (standard): max 10 bots
  // 40x40 arena (large): max 25 bots
  return arena === 'large' ? 25 : 10;
}

/**
 * Get saved input mode preference
 * @returns {string} Input mode ('keyboard' or 'controller', default 'keyboard')
 */
export function getLastInputMode() {
  try {
    const key = `${STORAGE_KEY_PREFIX}last_input_mode`;
    const stored = localStorage.getItem(key);
    return stored === 'controller' ? 'controller' : 'keyboard';
  } catch (e) {
    handleStorageError(e, 'read', 'lastInputMode');
    return 'keyboard';
  }
}

/**
 * Save input mode preference
 * @param {string} inputMode - Input mode ('keyboard' or 'controller')
 * @returns {boolean} True if saved successfully
 */
export function setLastInputMode(inputMode) {
  try {
    const key = `${STORAGE_KEY_PREFIX}last_input_mode`;
    if (inputMode === 'keyboard' || inputMode === 'controller') {
      localStorage.setItem(key, inputMode);
      return true;
    }
  } catch (e) {
    return handleStorageError(e, 'write', 'lastInputMode');
  }
}


