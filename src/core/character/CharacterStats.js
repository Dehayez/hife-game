/**
 * CharacterStats.js
 * 
 * Centralized configuration for all player character stats.
 * This file provides a clear view of every character stat that can be edited.
 */

/**
 * Player Character Configuration Stats
 * 
 * All stats related to player character behavior, health, movement, and physics.
 */
export const CHARACTER_STATS = {
  /**
   * Health Configuration
   */
  health: {
    maxHealth: 100,           // Maximum health for player
    defaultHealth: 100         // Starting health when character is created
  },
  
  /**
   * Movement Configuration
   */
  movement: {
    playerSize: 0.5,           // Player collision size
    playerHeight: 1.2,         // Player height for positioning
    moveSpeed: 4,              // Base movement speed (units per second)
    runSpeedMultiplier: 1.7    // Speed multiplier when running (shift key)
  },
  
  /**
   * Physics Configuration
   */
  physics: {
    gravity: -30,              // Gravity force (negative pulls down)
    jumpForce: 8,              // Upward velocity when jumping
    groundY: 0.6,              // Default ground level (half of playerHeight)
    jumpCooldownTime: 0.6      // Seconds between jumps (prevents rapid jumping)
  },
  
  /**
   * Particle Configuration
   */
  particles: {
    smokeSpawnInterval: 0.05,  // Spawn particle every 0.05 seconds when running
    smokeSpawnTimer: 0          // Timer for smoke particle spawning
  }
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
export function getCharacterPhysicsStats() {
  return CHARACTER_STATS.physics;
}

/**
 * Get character particle stats
 * @returns {Object} Particle configuration
 */
export function getCharacterParticleStats() {
  return CHARACTER_STATS.particles;
}

