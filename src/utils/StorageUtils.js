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

/**
 * Get saved bot difficulty preference
 * @returns {string} Bot difficulty ('easy', 'beginner', 'midway', 'veteran', default 'beginner')
 */
export function getLastBotDifficulty() {
  try {
    const key = `${STORAGE_KEY_PREFIX}last_bot_difficulty`;
    const stored = localStorage.getItem(key);
    const validDifficulties = ['easy', 'beginner', 'midway', 'veteran'];
    if (stored && validDifficulties.includes(stored)) {
      return stored;
    }
    return 'beginner';
  } catch (e) {
    handleStorageError(e, 'read', 'lastBotDifficulty');
    return 'beginner';
  }
}

/**
 * Save bot difficulty preference
 * @param {string} difficulty - Bot difficulty ('easy', 'beginner', 'midway', 'veteran')
 * @returns {boolean} True if saved successfully
 */
export function setLastBotDifficulty(difficulty) {
  try {
    const key = `${STORAGE_KEY_PREFIX}last_bot_difficulty`;
    const validDifficulties = ['easy', 'beginner', 'midway', 'veteran'];
    if (validDifficulties.includes(difficulty)) {
      localStorage.setItem(key, difficulty);
      return true;
    }
  } catch (e) {
    return handleStorageError(e, 'write', 'lastBotDifficulty');
  }
  return false;
}

/**
 * Get sound effects volume (0.0 to 1.0)
 * @returns {number} Sound effects volume (default 0.15)
 */
export function getSoundEffectsVolume() {
  try {
    const key = `${STORAGE_KEY_PREFIX}sound_effects_volume`;
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      const volume = parseFloat(stored);
      return Math.max(0, Math.min(1, volume));
    }
  } catch (e) {
    handleStorageError(e, 'read', 'soundEffectsVolume');
  }
  return 0.15; // Default volume
}

/**
 * Save sound effects volume
 * @param {number} volume - Volume level (0.0 to 1.0)
 * @returns {boolean} True if saved successfully
 */
export function setSoundEffectsVolume(volume) {
  try {
    const key = `${STORAGE_KEY_PREFIX}sound_effects_volume`;
    const clampedVolume = Math.max(0, Math.min(1, parseFloat(volume) || 0));
    localStorage.setItem(key, clampedVolume.toString());
    return true;
  } catch (e) {
    return handleStorageError(e, 'write', 'soundEffectsVolume');
  }
}

/**
 * Get background cinematic volume (0.0 to 1.0)
 * @returns {number} Background cinematic volume (default 0.2)
 */
export function getBackgroundCinematicVolume() {
  try {
    const key = `${STORAGE_KEY_PREFIX}background_cinematic_volume`;
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      const volume = parseFloat(stored);
      return Math.max(0, Math.min(1, volume));
    }
  } catch (e) {
    handleStorageError(e, 'read', 'backgroundCinematicVolume');
  }
  return 0.2; // Default volume
}

/**
 * Save background cinematic volume
 * @param {number} volume - Volume level (0.0 to 1.0)
 * @returns {boolean} True if saved successfully
 */
export function setBackgroundCinematicVolume(volume) {
  try {
    const key = `${STORAGE_KEY_PREFIX}background_cinematic_volume`;
    const clampedVolume = Math.max(0, Math.min(1, parseFloat(volume) || 0));
    localStorage.setItem(key, clampedVolume.toString());
    return true;
  } catch (e) {
    return handleStorageError(e, 'write', 'backgroundCinematicVolume');
  }
}

/**
 * Get vibration intensity (0.0 to 1.0)
 * @returns {number} Vibration intensity multiplier (default 1.0)
 */
export function getVibrationIntensity() {
  try {
    const key = `${STORAGE_KEY_PREFIX}vibration_intensity`;
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      const intensity = parseFloat(stored);
      return Math.max(0, Math.min(1, intensity));
    }
  } catch (e) {
    handleStorageError(e, 'read', 'vibrationIntensity');
  }
  return 1.0; // Default intensity
}

/**
 * Save vibration intensity
 * @param {number} intensity - Intensity multiplier (0.0 to 1.0)
 * @returns {boolean} True if saved successfully
 */
export function setVibrationIntensity(intensity) {
  try {
    const key = `${STORAGE_KEY_PREFIX}vibration_intensity`;
    const clampedIntensity = Math.max(0, Math.min(1, parseFloat(intensity) || 0));
    localStorage.setItem(key, clampedIntensity.toString());
    return true;
  } catch (e) {
    return handleStorageError(e, 'write', 'vibrationIntensity');
  }
}

/**
 * Get controls legend visibility preference
 * @returns {boolean} True if controls legend should be visible (default true)
 */
export function getControlsLegendVisible() {
  try {
    const key = `${STORAGE_KEY_PREFIX}controls_legend_visible`;
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      return stored === 'true';
    }
  } catch (e) {
    handleStorageError(e, 'read', 'controlsLegendVisible');
  }
  return true; // Default visible
}

/**
 * Save controls legend visibility preference
 * @param {boolean} visible - True if controls legend should be visible
 * @returns {boolean} True if saved successfully
 */
export function setControlsLegendVisible(visible) {
  try {
    const key = `${STORAGE_KEY_PREFIX}controls_legend_visible`;
    localStorage.setItem(key, visible ? 'true' : 'false');
    return true;
  } catch (e) {
    return handleStorageError(e, 'write', 'controlsLegendVisible');
  }
}


