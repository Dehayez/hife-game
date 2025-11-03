/**
 * ParticleStats.js
 * 
 * Centralized configuration for all particle stats.
 * This file provides a clear view of every particle stat that can be edited.
 */

/**
 * Particle Configuration Stats
 * 
 * All stats related to smoke particles and effects.
 */
export const PARTICLE_STATS = {
  /**
   * Running Smoke Particle Configuration (subtle, for running)
   */
  smokeRunning: {
    maxParticles: 150,          // Maximum number of particles
    minParticles: 100,            // Minimum number of particles (not currently used)
    minSize: 0.1,               // Minimum particle size
    maxSize: 0.2,               // Maximum particle size
    minOpacity: 0.2,            // Minimum opacity
    maxOpacity: 0.6,            // Maximum opacity
    minGrayValue: 0.5,          // Minimum gray value for color
    maxGrayValue: 0.9,          // Maximum gray value for color
    positionY: 0,               // Base Y position
    horizontalOffset: 0.5,      // Random horizontal offset range
    verticalOffsetRange: 0.2,    // Vertical offset range
    minVelocityX: -0.5,         // Minimum horizontal velocity
    maxVelocityX: 0.5,          // Maximum horizontal velocity
    minVelocityY: 0.5,          // Minimum upward velocity
    maxVelocityY: 1.0,          // Maximum upward velocity
    minLifetime: 1.0,            // Minimum lifetime in seconds
    maxLifetime: 2.0,           // Maximum lifetime in seconds
    dragFactor: 0.99,            // Velocity drag factor per frame
    fadeSpeed: 1.0,              // Fade speed multiplier (quadratic)
    scaleGrowth: 2.0,           // Scale growth factor over lifetime
    spawnInterval: 0.05         // Spawn particle interval in seconds
  },
  /**
   * Character Change Smoke Particle Configuration (dramatic, for character changes)
   */
  smokeCharacterChange: {
    maxParticles: 20,           // Maximum number of particles
    minParticles: 10,            // Minimum number of particles (not currently used)
    minSize: 0.1,               // Minimum particle size
    maxSize: 0.25,               // Maximum particle size
    minOpacity: 0.2,            // Minimum opacity
    maxOpacity: 0.8,             // Maximum opacity
    minGrayValue: 0.7,          // Minimum gray value for color
    maxGrayValue: 0.9,          // Maximum gray value for color
    positionY: 0,               // Base Y position
    horizontalOffset: 0.1,      // Random horizontal offset range
    verticalOffsetRange: 1,   // Vertical offset range
    minVelocityX: -0.5,         // Minimum horizontal velocity
    maxVelocityX: 0.5,          // Maximum horizontal velocity
    minVelocityY: 0.5,          // Minimum upward velocity
    maxVelocityY: 1.0,          // Maximum upward velocity
    minLifetime: .4,           // Minimum lifetime in seconds
    maxLifetime: .6,           // Maximum lifetime in seconds
    dragFactor: 0.99,            // Velocity drag factor per frame
    fadeSpeed: 1.0,              // Fade speed multiplier (quadratic)
    scaleGrowth: 0.4            // Scale growth factor over lifetime
  }
};

/**
 * Get running smoke particle stats
 * @returns {Object} Running smoke particle configuration
 */
export function getRunningSmokeStats() {
  return PARTICLE_STATS.smokeRunning;
}

/**
 * Get character change smoke particle stats
 * @returns {Object} Character change smoke particle configuration
 */
export function getCharacterChangeSmokeStats() {
  return PARTICLE_STATS.smokeCharacterChange;
}

/**
 * Get smoke particle stats (defaults to running smoke for backward compatibility)
 * @returns {Object} Smoke particle configuration
 */
export function getSmokeStats() {
  return PARTICLE_STATS.smokeRunning;
}

/**
 * Get smoke spawn interval (for running smoke particles)
 * @returns {number} Spawn interval in seconds
 */
export function getSmokeSpawnInterval() {
  return PARTICLE_STATS.smokeRunning.spawnInterval;
}

