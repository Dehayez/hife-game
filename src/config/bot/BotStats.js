/**
 * BotStats.js
 * 
 * Centralized configuration for all bot stats.
 * This file provides a clear view of every bot stat that can be edited.
 * 
 * Uses BaseEntityStats for shared health, movement, and physics stats.
 */

import { BASE_ENTITY_STATS, getBaseEntityHealthStats, getBaseEntityMovementStats, getBaseEntityPhysicsStats } from '../global/BaseEntityStats.js';

/**
 * Bot Configuration Stats
 * 
 * All stats related to bot behavior, health, movement, and AI.
 * Extends base entity stats with bot-specific additions.
 */
export const BOT_STATS = {
  /**
   * Health Configuration (inherits from base entity stats)
   */
  health: {
    ...BASE_ENTITY_STATS.health
    // Bot-specific health overrides can be added here
  },
  
  /**
   * Movement Configuration (inherits from base entity stats)
   */
  movement: {
    ...BASE_ENTITY_STATS.movement
    // Bot-specific movement overrides can be added here
  },
  
  /**
   * Physics Configuration (inherits from base entity stats)
   */
  physics: {
    ...BASE_ENTITY_STATS.physics
    // Bot-specific physics overrides can be added here
  },
  
  /**
   * AI Behavior Configuration
   */
  ai: {
    // Direction change behavior
    changeDirectionInterval: {
      min: 2,                  // Minimum seconds before changing direction
      max: 5                   // Maximum seconds before changing direction
    },
    
    // Shooting behavior
    shootInterval: {
      min: 1,                  // Minimum seconds between shots
      max: 2.5                 // Maximum seconds between shots
    },
    shootCooldownVariance: 0.2, // Random variance added to shoot cooldown
    shootRange: 10,            // Maximum distance to shoot at player (units)
    
    // Movement behavior
    avoidanceDistance: 1,      // Distance to maintain from player when too close
    followDistance: 10         // Maximum distance to follow player
  },
  
  /**
   * Respawn Configuration
   */
  respawn: {
    arenaHalfSize: 7          // Half size of arena for random spawn positioning
  }
};

/**
 * Get bot health stats
 * @returns {Object} Health configuration
 */
export function getBotHealthStats() {
  return BOT_STATS.health;
}

/**
 * Get bot movement stats
 * @returns {Object} Movement configuration
 */
export function getBotMovementStats() {
  return BOT_STATS.movement;
}

/**
 * Get bot physics stats
 * @returns {Object} Physics configuration
 */
export function getBotPhysicsStats() {
  return BOT_STATS.physics;
}

/**
 * Get bot AI stats
 * @returns {Object} AI configuration
 */
export function getBotAIStats() {
  return BOT_STATS.ai;
}

