/**
 * CharacterAbilityStats.js
 * 
 * Centralized helper that merges config files into usable character stats.
 * This file combines base stats with character-specific configs.
 * 
 * ═══════════════════════════════════════════════════════════════════
 * HOW TO EDIT STATS:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * 1. GLOBAL BASE STATS (affects all characters):
 *    Edit: config/base/BaseStats.js
 *    - Change base values here to affect all characters
 * 
 * 2. CHARACTER-SPECIFIC STATS (affects one character):
 *    Edit: config/characters/{character}/{ability}/AttackConfig.js
 *    - Use multipliers (e.g., 0.5 = 50% of base, 1.5 = 150% of base)
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

import { GLOBAL_BASE_STATS } from '../../../../config/abilities/base/BaseStats.js';
import { getCharacterColorHex } from '../../../../config/abilities/CharacterColors.js';
import { LUCY_BOLT_ATTACK_CONFIG } from '../../../../config/abilities/characters/lucy/bolt/AttackConfig.js';
import { LUCY_MORTAR_ATTACK_CONFIG } from '../../../../config/abilities/characters/lucy/mortar/AttackConfig.js';
import { LUCY_MELEE_ATTACK_CONFIG } from '../../../../config/abilities/characters/lucy/melee/AttackConfig.js';
import { LUCY_MULTI_PROJECTILE_ATTACK_CONFIG } from '../../../../config/abilities/characters/lucy/multiProjectile/AttackConfig.js';
import { HERALD_BOLT_ATTACK_CONFIG } from '../../../../config/abilities/characters/herald/bolt/AttackConfig.js';
import { HERALD_MORTAR_ATTACK_CONFIG } from '../../../../config/abilities/characters/herald/mortar/AttackConfig.js';
import { HERALD_MELEE_ATTACK_CONFIG } from '../../../../config/abilities/characters/herald/melee/AttackConfig.js';
import { HERALD_BLAST_ATTACK_CONFIG } from '../../../../config/abilities/characters/herald/blast/AttackConfig.js';

/**
 * Deep merge function that applies multipliers or overrides
 * @param {Object} base - Base stats object
 * @param {Object} character - Character-specific multipliers/overrides
 * @returns {Object} Merged stats object
 */
export function mergeStats(base, character) {
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
 * Create character stats object
 * @param {string} characterName - Character name
 * @param {Object} boltConfig - Bolt attack config
 * @param {Object} mortarConfig - Mortar attack config
 * @param {Object} meleeConfig - Melee attack config
 * @returns {Object} Complete character stats
 */
export function createCharacterStats(characterName, boltConfig, mortarConfig, meleeConfig) {
  return {
    name: characterName,
    color: getCharacterColorHex(characterName),
    bolt: mergeStats(GLOBAL_BASE_STATS.bolt, boltConfig || {}),
    mortar: mergeStats(GLOBAL_BASE_STATS.mortar, mortarConfig || {}),
    melee: mergeStats(GLOBAL_BASE_STATS.melee, meleeConfig || {})
  };
}

// Cache for CHARACTER_STATS to avoid circular dependency
let _characterStatsCache = null;

/**
 * Get character stats by name
 * @param {string} characterName - Character name ('lucy' or 'herald')
 * @returns {Object} Character stats object or defaults to Lucy
 */
export function getCharacterStats(characterName) {
  // Lazy load CHARACTER_STATS from config to avoid circular dependency
  if (!_characterStatsCache) {
    _characterStatsCache = import('../../../../config/abilities/CharacterAbilityStatsConfig.js').then(m => m.CHARACTER_STATS);
  }
  
  // If already loaded, use cache
  if (_characterStatsCache && typeof _characterStatsCache.then !== 'function') {
    return _characterStatsCache[characterName] || _characterStatsCache.lucy;
  }
  
  // If still loading, compute on the fly
  if (characterName === 'lucy') {
    return createCharacterStats('lucy', LUCY_BOLT_ATTACK_CONFIG, LUCY_MORTAR_ATTACK_CONFIG, LUCY_MELEE_ATTACK_CONFIG);
  } else if (characterName === 'herald') {
    return createCharacterStats('herald', HERALD_BOLT_ATTACK_CONFIG, HERALD_MORTAR_ATTACK_CONFIG, HERALD_MELEE_ATTACK_CONFIG);
  }
  
  // Default to lucy
  return createCharacterStats('lucy', LUCY_BOLT_ATTACK_CONFIG, LUCY_MORTAR_ATTACK_CONFIG, LUCY_MELEE_ATTACK_CONFIG);
}

/**
 * Get bolt stats for a character
 * @param {string} characterName - Character name
 * @returns {Object} Bolt ability stats
 */
export function getBoltStats(characterName) {
  const stats = getCharacterStats(characterName);
  return stats?.bolt || {};
}

/**
 * Get mortar stats for a character
 * @param {string} characterName - Character name
 * @returns {Object} Mortar ability stats
 */
export function getMortarStats(characterName) {
  const stats = getCharacterStats(characterName);
  return stats?.mortar || {};
}

/**
 * Get character color
 * @param {string} characterName - Character name
 * @returns {number} Character color as hex number
 * @deprecated Use getCharacterColorHex from CharacterColors.js instead
 */
export function getCharacterColor(characterName) {
  return getCharacterColorHex(characterName);
}

/**
 * Get melee attack stats for a character
 * @param {string} characterName - Character name
 * @returns {Object} Melee ability stats
 */
export function getMeleeStats(characterName) {
  const stats = getCharacterStats(characterName);
  return stats?.melee || {};
}

/**
 * Get blast attack stats for Herald
 * @param {string} characterName - Character name
 * @returns {Object} Blast ability stats or null if not Herald
 */
export function getBlastStats(characterName) {
  if (characterName === 'herald') {
    return HERALD_BLAST_ATTACK_CONFIG;
  }
  return null;
}

/**
 * Get multi-projectile attack stats for Lucy
 * @param {string} characterName - Character name
 * @returns {Object} Multi-projectile ability stats or null if not Lucy
 */
export function getMultiProjectileStats(characterName) {
  if (characterName === 'lucy') {
    return LUCY_MULTI_PROJECTILE_ATTACK_CONFIG;
  }
  return null;
}
