/**
 * ParticleConfigHelper.js
 * 
 * Helper function to merge base and character-specific particle configs.
 * This is an implementation helper that uses config files from the config/ folder.
 */

import { BOLT_PARTICLE_BASE } from '../../../../../config/abilities/base/BoltParticleConfig.js';
import { MORTAR_PARTICLE_BASE } from '../../../../../config/abilities/base/MortarParticleConfig.js';
import { LUCY_BOLT_PARTICLE_CONFIG } from '../../../../../config/abilities/characters/lucy/bolt/ParticleConfig.js';
import { LUCY_MORTAR_PARTICLE_CONFIG } from '../../../../../config/abilities/characters/lucy/mortar/ParticleConfig.js';
import { HERALD_BOLT_PARTICLE_CONFIG } from '../../../../../config/abilities/characters/herald/bolt/ParticleConfig.js';
import { HERALD_MORTAR_PARTICLE_CONFIG } from '../../../../../config/abilities/characters/herald/mortar/ParticleConfig.js';

/**
 * Get projectile particle config for a character and ability
 * @param {string} characterName - Character name ('lucy' or 'herald')
 * @param {string} abilityName - Ability name ('bolt' or 'mortar')
 * @param {string} particleType - Particle type ('ambient' or 'trail')
 * @returns {Object} Merged particle configuration
 */
export function getProjectileParticleConfig(characterName, abilityName, particleType) {
  // Get base config based on ability
  const base = abilityName === 'mortar' 
    ? MORTAR_PARTICLE_BASE[particleType]
    : BOLT_PARTICLE_BASE[particleType];
  
  if (!base) {
    return {};
  }
  
  // Get character-specific config
  let characterConfig = {};
  if (characterName === 'lucy' && abilityName === 'bolt') {
    characterConfig = LUCY_BOLT_PARTICLE_CONFIG[particleType] || {};
  } else if (characterName === 'lucy' && abilityName === 'mortar') {
    characterConfig = LUCY_MORTAR_PARTICLE_CONFIG[particleType] || {};
  } else if (characterName === 'herald' && abilityName === 'bolt') {
    characterConfig = HERALD_BOLT_PARTICLE_CONFIG[particleType] || {};
  } else if (characterName === 'herald' && abilityName === 'mortar') {
    characterConfig = HERALD_MORTAR_PARTICLE_CONFIG[particleType] || {};
  }
  
  // Merge base with character-specific overrides
  const merged = { ...base };
  
  // Apply character overrides
  for (const key in characterConfig) {
    if (characterConfig[key] !== undefined) {
      merged[key] = characterConfig[key];
    }
  }
  
  // Special handling for ambient particle count (use mortar count for mortars)
  if (particleType === 'ambient' && abilityName === 'mortar' && !characterConfig.particleCount) {
    merged.particleCount = MORTAR_PARTICLE_BASE.ambient.particleCount || merged.particleCount;
  }
  
  return merged;
}

