/**
 * CharacterStats.js
 * 
 * Centralized configuration for all player character stats.
 * This file provides a clear view of every character stat that can be edited.
 * 
 * Uses BaseEntityStats for shared health, movement, and physics stats.
 */

import { BASE_ENTITY_STATS, getBaseEntityHealthStats, getBaseEntityMovementStats } from '../global/BaseEntityStats.js';
import { getCharacterPhysicsStats } from './PhysicsConfig.js';

/**
 * Player Character Configuration Stats
 * 
 * All stats related to player character behavior, health, movement, and physics.
 * Extends base entity stats with character-specific overrides.
 */
export const CHARACTER_STATS = {
  /**
   * Health Configuration (inherits from base entity stats)
   */
  health: {
    ...BASE_ENTITY_STATS.health
    // Character-specific health overrides can be added here
  },
  
  /**
   * Movement Configuration (inherits from base entity stats)
   */
  movement: {
    ...BASE_ENTITY_STATS.movement
    // Character-specific movement overrides can be added here
  },
  
  /**
   * Physics Configuration (imported from PhysicsConfig.js)
   */
  physics: getCharacterPhysicsStats()
};

/**
 * Get character health stats
 * @returns {Object} Health configuration
 */
export function getCharacterHealthStats() {
  return CHARACTER_STATS.health;
}

/**
 * Get character movement stats
 * @returns {Object} Movement configuration
 */
export function getCharacterMovementStats() {
  return CHARACTER_STATS.movement;
}

/**
 * Get character physics stats
 * @returns {Object} Physics configuration
 */
export { getCharacterPhysicsStats };


