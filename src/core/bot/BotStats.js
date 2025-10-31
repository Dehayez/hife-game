/**
 * BotStats.js
 * 
 * Centralized configuration for all bot stats.
 * This file provides a clear view of every bot stat that can be edited.
 */

/**
 * Bot Configuration Stats
 * 
 * All stats related to bot behavior, health, movement, and AI.
 */
export const BOT_STATS = {
  /**
   * Health Configuration
   */
  health: {
    maxHealth: 100,           // Maximum health for bots
    defaultHealth: 100         // Starting health when bot is created
  },
  
  /**
   * Movement Configuration
   */
  movement: {
    moveSpeed: 4,             // Base movement speed (units per second)
    runSpeedMultiplier: 1.7,   // Speed multiplier when running (not currently used for bots)
    playerSize: 0.5,           // Bot collision size
    playerHeight: 1.2          // Bot height for positioning
  },
  
  /**
   * Physics Configuration
   */
  physics: {
    gravity: -30,              // Gravity force (negative pulls down)
    jumpForce: 8,              // Upward velocity when jumping
    groundY: 0.6               // Default ground level
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

