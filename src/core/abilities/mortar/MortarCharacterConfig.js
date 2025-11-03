/**
 * MortarCharacterConfig.js
 * 
 * Character-specific customizations for mortar projectiles.
 * Override base behavior here for each character.
 */

import { DEFAULT_MORTAR_CONFIG } from './BaseMortar.js';

/**
 * Character-specific mortar configurations
 * These override or extend the default config
 */
export const MORTAR_CHARACTER_CONFIG = {
  lucy: {
    // Lucy uses most defaults, but can customize here
    // emissiveIntensity: 0.85, // Slightly brighter for Lucy
    // trailLightIntensity: 1.3, // Brighter trail
  },
  
  herald: {
    // Herald has more intense visual effects
    emissiveIntensity: 1.2,          // More intense fireball
    trailLightIntensity: 5,          // Much brighter trail
    trailLightRange: 10,             // Longer trail range
    // Example: Add custom behavior here
  }
};

/**
 * Get character-specific mortar config
 * Merges character config with defaults
 * @param {string} characterName - Character name
 * @returns {Object} Merged configuration
 */
export function getMortarCharacterConfig(characterName) {
  const characterConfig = MORTAR_CHARACTER_CONFIG[characterName] || {};
  return { ...DEFAULT_MORTAR_CONFIG, ...characterConfig };
}

