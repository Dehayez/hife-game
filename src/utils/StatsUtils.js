/**
 * StatsUtils.js
 * 
 * Shared utilities for creating consistent Stats files.
 * Eliminates repetitive getter function patterns.
 */

/**
 * Create getter functions for a stats object
 * @param {Object} statsObject - The stats object (e.g., CHARACTER_STATS, BOT_STATS)
 * @param {string} prefix - Prefix for getter function names (e.g., 'Character', 'Bot')
 * @returns {Object} Object containing getter functions
 */
export function createStatsGetters(statsObject, prefix = '') {
  const getters = {};
  
  // Create getter for each top-level key in stats object
  for (const key in statsObject) {
    if (typeof statsObject[key] === 'object' && statsObject[key] !== null && !Array.isArray(statsObject[key])) {
      // Create camelCase getter function name
      const getterName = `get${prefix}${capitalize(key)}Stats`;
      getters[getterName] = () => statsObject[key];
    }
  }
  
  return getters;
}

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Helper to create a stats getter function
 * @param {Object} statsObject - The stats object
 * @param {string} key - Key to get from stats object
 * @returns {Function} Getter function
 */
export function createStatsGetter(statsObject, key) {
  return () => statsObject[key];
}

