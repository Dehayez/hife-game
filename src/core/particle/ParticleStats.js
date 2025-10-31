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
   * Smoke Particle Configuration
   */
  smoke: {
    maxParticles: 50,          // Maximum number of particles
    minSize: 0.12,             // Minimum particle size
    maxSize: 0.20,             // Maximum particle size (0.12 + 0.08)
    minOpacity: 0.5,           // Minimum opacity
    maxOpacity: 0.8,           // Maximum opacity (0.5 + 0.3)
    minGrayValue: 0.7,         // Minimum gray value for color
    maxGrayValue: 0.9,         // Maximum gray value for color (0.7 + 0.2)
    positionY: 0.1,            // Base Y position (slightly above ground)
    horizontalOffset: 0.3,     // Random horizontal offset range
    minVelocityX: -0.2,        // Minimum horizontal velocity
    maxVelocityX: 0.2,         // Maximum horizontal velocity
    minVelocityY: 0.4,        // Minimum upward velocity
    maxVelocityY: 0.8,         // Maximum upward velocity (0.4 + 0.4)
    minLifetime: 1.0,         // Minimum lifetime in seconds
    maxLifetime: 1.5,         // Maximum lifetime in seconds (1.0 + 0.5)
    dragFactor: 0.995,         // Velocity drag factor per frame
    fadeSpeed: 1.0,            // Fade speed multiplier (quadratic)
    scaleGrowth: 0.8           // Scale growth factor over lifetime
  }
};

/**
 * Get smoke particle stats
 * @returns {Object} Smoke particle configuration
 */
export function getSmokeStats() {
  return PARTICLE_STATS.smoke;
}

