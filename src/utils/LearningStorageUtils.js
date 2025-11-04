/**
 * LearningStorageUtils.js
 * 
 * Storage utilities for bot learning data.
 * Saves and loads learning patterns to localStorage.
 */

import { handleStorageError } from './ErrorHandler.js';

const STORAGE_KEY_PREFIX = 'hife_bot_learning_';

/**
 * Save learning data for a specific difficulty
 * @param {string} difficulty - Difficulty level
 * @param {Object} data - Learning data to save
 * @returns {boolean} True if saved successfully
 */
export function saveLearningData(difficulty, data) {
  try {
    const key = `${STORAGE_KEY_PREFIX}${difficulty}`;
    localStorage.setItem(key, JSON.stringify({
      ...data,
      savedAt: Date.now()
    }));
    return true;
  } catch (e) {
    return handleStorageError(e, 'write', `learningData_${difficulty}`);
  }
}

/**
 * Load learning data for a specific difficulty
 * @param {string} difficulty - Difficulty level
 * @returns {Object|null} Learning data or null if not found
 */
export function loadLearningData(difficulty) {
  try {
    const key = `${STORAGE_KEY_PREFIX}${difficulty}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert Vector3-like objects back to proper format
      if (parsed.movement && parsed.movement.patterns) {
        parsed.movement.patterns = parsed.movement.patterns.map(pattern => ({
          ...pattern,
          position: pattern.position || { x: 0, y: 0, z: 0 },
          velocity: pattern.velocity || { x: 0, y: 0, z: 0 }
        }));
      }
      return parsed;
    }
  } catch (e) {
    handleStorageError(e, 'read', `learningData_${difficulty}`);
  }
  return null;
}

/**
 * Clear learning data for a specific difficulty
 * @param {string} difficulty - Difficulty level
 * @returns {boolean} True if cleared successfully
 */
export function clearLearningData(difficulty) {
  try {
    const key = `${STORAGE_KEY_PREFIX}${difficulty}`;
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    return handleStorageError(e, 'delete', `learningData_${difficulty}`);
  }
}

/**
 * Clear all learning data
 * @returns {boolean} True if cleared successfully
 */
export function clearAllLearningData() {
  try {
    const difficulties = ['easy', 'beginner', 'midway', 'veteran'];
    difficulties.forEach(difficulty => {
      const key = `${STORAGE_KEY_PREFIX}${difficulty}`;
      localStorage.removeItem(key);
    });
    return true;
  } catch (e) {
    return handleStorageError(e, 'delete', 'allLearningData');
  }
}

/**
 * Get learning data for all difficulties
 * @returns {Object} Object with difficulty keys and learning data
 */
export function getAllLearningData() {
  const difficulties = ['easy', 'beginner', 'midway', 'veteran'];
  const allData = {};
  
  difficulties.forEach(difficulty => {
    const data = loadLearningData(difficulty);
    if (data) {
      allData[difficulty] = data;
    }
  });
  
  return allData;
}

