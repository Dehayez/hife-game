// localStorage utility functions for high scores and best times

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
    console.error('Error reading high score:', e);
  }
  return 0;
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
    console.error('Error saving high score:', e);
  }
  return false;
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
    console.error('Error reading best time:', e);
  }
  return null;
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
    console.error('Error saving best time:', e);
  }
  return false;
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
    console.error('Error reading last character:', e);
  }
  return null;
}

export function setLastCharacter(characterName) {
  try {
    const key = `${STORAGE_KEY_PREFIX}last_character`;
    localStorage.setItem(key, characterName);
    return true;
  } catch (e) {
    console.error('Error saving last character:', e);
  }
  return false;
}

