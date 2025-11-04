/**
 * BaseEntityStats.js
 * 
 * Shared base stats for entities (characters and bots).
 * These are common stats that apply to both player characters and bots.
 * 
 * Individual entity types can override or extend these values.
 */

/**
 * Base Entity Stats Configuration
 * 
 * Shared stats for health, movement, and physics that apply to all entities.
 */
export const BASE_ENTITY_STATS = {
  /**
   * Health Configuration
   */
  health: {
    maxHealth: 100,           // Maximum health
    defaultHealth: 100        // Starting health when entity is created
  },
  
  /**
   * Movement Configuration
   */
  movement: {
    moveSpeed: 4,             // Base movement speed (units per second)
    runSpeedMultiplier: 1.7,  // Speed multiplier when running
    playerSize: 0.5,          // Entity collision size
    playerHeight: 1.2         // Entity height for positioning
  },
  
  /**
   * Physics Configuration
   */
  physics: {
    gravity: -30,             // Gravity force (negative pulls down)
    jumpForce: 8,             // Upward velocity when jumping
    groundY: 0                // Default ground level
  }
};

/**
 * Get base entity health stats
 * @returns {Object} Health configuration
 */
export function getBaseEntityHealthStats() {
  return BASE_ENTITY_STATS.health;
}

/**
 * Get base entity movement stats
 * @returns {Object} Movement configuration
 */
export function getBaseEntityMovementStats() {
  return BASE_ENTITY_STATS.movement;
}

/**
 * Get base entity physics stats
 * @returns {Object} Physics configuration
 */
export function getBaseEntityPhysicsStats() {
  return BASE_ENTITY_STATS.physics;
}

