/**
 * MortarCharacterConfig.js
 * 
 * Helper function to get character-specific mortar visual configs.
 * This is an implementation helper that merges configs from the config/ folder.
 */

import { LUCY_MORTAR_ATTACK_CONFIG } from '../../config/characters/lucy/mortar/AttackConfig.js';
import { HERALD_MORTAR_ATTACK_CONFIG } from '../../config/characters/herald/mortar/AttackConfig.js';
import { DEFAULT_MORTAR_CONFIG } from '../../config/base/MortarDefaultConfig.js';

/**
 * Get character-specific mortar config
 * Merges character config with defaults
 * @param {string} characterName - Character name
 * @returns {Object} Merged configuration
 */
export function getMortarCharacterConfig(characterName) {
  const characterConfig = characterName === 'herald' 
    ? HERALD_MORTAR_ATTACK_CONFIG 
    : LUCY_MORTAR_ATTACK_CONFIG || {};
  
  // Start with base config
  const baseConfig = DEFAULT_MORTAR_CONFIG;
  const merged = { ...baseConfig };
  
  // Merge character-specific visual settings
  if (characterConfig.visual) {
    merged.emissiveIntensity = characterConfig.visual.emissiveIntensity || baseConfig.emissiveIntensity;
  }
  
  if (characterConfig.trailLight) {
    merged.trailLightIntensity = characterConfig.trailLight.intensity || baseConfig.trailLightIntensity;
    merged.trailLightRange = characterConfig.trailLight.range || baseConfig.trailLightRange;
  }
  
  return merged;
}
