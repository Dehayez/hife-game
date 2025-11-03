/**
 * CharacterStats.js
 * 
 * Centralized configuration for all character ability stats.
 * 
 * This file merges global base stats with character-specific multipliers/overrides.
 * 
 * ═══════════════════════════════════════════════════════════════════
 * HOW TO EDIT STATS:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * 1. GLOBAL BASE STATS (affects all characters):
 *    Edit: src/core/abilities/stats/GlobalCharacterStats.js
 *    - Change base values here to affect all characters
 *    - Example: Increase base damage from 20 to 25 = all characters get +5 damage
 * 
 * 2. CHARACTER-SPECIFIC STATS (affects one character):
 *    Edit: src/core/abilities/stats/characters/Lucy.js or Herald.js
 *    - Use multipliers (e.g., 0.5 = 50% of base, 1.5 = 150% of base)
 *    - Use overrides (direct values that replace base)
 *    - Example: Lucy damage: 0.5 means Lucy gets 50% of global base damage
 * 
 * ═══════════════════════════════════════════════════════════════════
 * HOW IT WORKS:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Final stat = Global Base × Character Multiplier (or Character Override)
 * 
 * Example:
 *   Global base damage: 20
 *   Lucy multiplier: 0.5
 *   Lucy final damage: 20 × 0.5 = 10
 * 
 *   Global base damage: 20
 *   Herald multiplier: 1.75
 *   Herald final damage: 20 × 1.75 = 35
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

import { GLOBAL_BASE_STATS } from './GlobalCharacterStats.js';
import { LUCY_STATS } from './characters/Lucy.js';
import { HERALD_STATS } from './characters/Herald.js';

/**
 * Deep merge function that applies multipliers or overrides
 * @param {Object} base - Base stats object
 * @param {Object} character - Character-specific multipliers/overrides
 * @returns {Object} Merged stats object
 */
function mergeStats(base, character) {
  const result = {};
  
  // Copy base values
  for (const key in base) {
    if (typeof base[key] === 'object' && base[key] !== null && !Array.isArray(base[key])) {
      // Recursively merge nested objects
      result[key] = mergeStats(base[key], character[key] || {});
    } else {
      // For primitive values, start with base value
      result[key] = base[key];
    }
  }
  
  // Apply character overrides/multipliers
  for (const key in character) {
    if (typeof character[key] === 'object' && character[key] !== null && !Array.isArray(character[key])) {
      // Recursively merge nested objects
      result[key] = mergeStats(result[key] || {}, character[key]);
    } else if (character[key] !== undefined) {
      // Apply multiplier or override
      if (typeof base[key] === 'number' && typeof character[key] === 'number') {
        // Both are numbers - apply as multiplier
        result[key] = base[key] * character[key];
      } else {
        // Non-number override (like name, color) or base doesn't exist
        result[key] = character[key];
      }
    }
  }
  
  return result;
}

/**
 * Merge global base stats with character-specific stats
 * @param {Object} characterStats - Character-specific stats object
 * @returns {Object} Complete merged character stats
 */
function createCharacterStats(characterStats) {
  return {
    name: characterStats.name,
    color: characterStats.color,
    bolt: mergeStats(GLOBAL_BASE_STATS.bolt, characterStats.bolt || {}),
    mortar: mergeStats(GLOBAL_BASE_STATS.mortar, characterStats.mortar || {}),
    melee: mergeStats(GLOBAL_BASE_STATS.melee, characterStats.melee || {})
  };
}

/**
 * Character Ability Stats Configuration
 * 
 * Each character has stats for three abilities:
 * 1. Bolt (regular projectile)
 * 2. Mortar (arc projectile with splash area)
 * 3. Melee (sword swing attack)
 */
export const CHARACTER_STATS = {
  lucy: createCharacterStats(LUCY_STATS),
  herald: createCharacterStats(HERALD_STATS)
};

/**
 * Get character stats by name
 * @param {string} characterName - Character name ('lucy' or 'herald')
 * @returns {Object} Character stats object or defaults to Lucy
 */
export function getCharacterStats(characterName) {
  return CHARACTER_STATS[characterName] || CHARACTER_STATS.lucy;
}

/**
 * Get bolt stats for a character
 * @param {string} characterName - Character name
 * @returns {Object} Bolt ability stats
 */
export function getBoltStats(characterName) {
  const stats = getCharacterStats(characterName);
  return stats.bolt;
}

/**
 * Get mortar stats for a character
 * @param {string} characterName - Character name
 * @returns {Object} Mortar ability stats
 */
export function getMortarStats(characterName) {
  const stats = getCharacterStats(characterName);
  return stats.mortar;
}

/**
 * Get character color
 * @param {string} characterName - Character name
 * @returns {number} Character color as hex number
 */
export function getCharacterColor(characterName) {
  const stats = getCharacterStats(characterName);
  return stats.color;
}

/**
 * Get melee attack stats for a character
 * @param {string} characterName - Character name
 * @returns {Object} Melee ability stats
 */
export function getMeleeStats(characterName) {
  const stats = getCharacterStats(characterName);
  return stats.melee;
}
