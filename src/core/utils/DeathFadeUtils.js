/**
 * DeathFadeUtils.js
 * 
 * Shared utilities for death fade effects.
 * Used by both CharacterManager and BotManager to avoid code duplication.
 */

import { getCharacterColorHex } from '../abilities/config/CharacterColors.js';

/**
 * Death fade configuration
 */
export const DEATH_FADE_CONFIG = {
  duration: 0.6,           // Duration in seconds for death fade
  scaleReduction: 0.3,     // Scale reduction factor (shrink to 70% size)
  particleCount: 25        // Number of death particles to spawn
};

/**
 * Start death fade effect for an entity
 * @param {Object} entity - Entity mesh (player or bot)
 * @param {Object} entityData - Entity data object (userData or characterData)
 * @param {string} characterName - Character name for particle color
 * @param {Object} particleManager - Optional particle manager for effects
 */
export function startDeathFade(entity, entityData, characterName, particleManager = null) {
  if (!entity || !entityData) return;
  
  entityData.isDying = true;
  entityData.deathFadeTimer = 0;
  
  // Spawn death particles
  if (particleManager) {
    const characterColor = getCharacterColorHex(characterName);
    particleManager.spawnDeathParticles(entity.position.clone(), characterColor, DEATH_FADE_CONFIG.particleCount);
  }
}

/**
 * Update death fade effect for an entity
 * @param {Object} entity - Entity mesh (player or bot)
 * @param {Object} entityData - Entity data object (userData or characterData)
 * @param {number} dt - Delta time in seconds
 * @param {number} fadeDuration - Fade duration (defaults to config duration)
 * @returns {boolean} True if fade is complete
 */
export function updateDeathFade(entity, entityData, dt, fadeDuration = DEATH_FADE_CONFIG.duration) {
  if (!entity || !entityData || !entityData.isDying) return false;
  
  entityData.deathFadeTimer += dt;
  const progress = Math.min(entityData.deathFadeTimer / fadeDuration, 1.0);
  
  // Fade out entity opacity
  if (entity.material) {
    entity.material.opacity = 1.0 - progress;
    entity.material.transparent = true;
  }
  
  // Also scale down slightly
  const scale = 1.0 - progress * DEATH_FADE_CONFIG.scaleReduction;
  entity.scale.set(scale, scale, scale);
  
  if (progress >= 1.0) {
    // Fade complete - reset state
    resetDeathFade(entity, entityData);
    return true;
  }
  
  return false;
}

/**
 * Reset death fade state
 * @param {Object} entity - Entity mesh
 * @param {Object} entityData - Entity data object
 */
export function resetDeathFade(entity, entityData) {
  if (!entity || !entityData) return;
  
  entityData.isDying = false;
  entityData.deathFadeTimer = 0;
  
  // Reset opacity and scale
  if (entity.material) {
    entity.material.opacity = 1.0;
  }
  entity.scale.set(1, 1, 1);
}

