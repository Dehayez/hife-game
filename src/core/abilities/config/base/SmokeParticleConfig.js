/**
 * SmokeParticleConfig.js
 * 
 * Base configuration for smoke particle effects (running and character switching).
 * These are passive visual effects triggered during movement/transformation.
 */

/**
 * Running Smoke Particle Configuration (subtle, for running)
 */
export const RUNNING_SMOKE_CONFIG = {
  maxParticles: 150,          // Maximum number of particles
  minSize: 0.1,               // Minimum particle size
  maxSize: 0.2,               // Maximum particle size
  minOpacity: 0.2,            // Minimum opacity
  maxOpacity: 0.6,            // Maximum opacity
  minGrayValue: 0.5,          // Minimum gray value for color
  maxGrayValue: 0.9,          // Maximum gray value for color
  positionY: 0,               // Base Y position
  horizontalOffset: 0.5,      // Random horizontal offset range
  verticalOffsetRange: 0.2,   // Vertical offset range
  minVelocityX: -0.5,         // Minimum horizontal velocity
  maxVelocityX: 0.5,          // Maximum horizontal velocity
  minVelocityY: 0.5,          // Minimum upward velocity
  maxVelocityY: 1.0,          // Maximum upward velocity
  minLifetime: 1.0,           // Minimum lifetime in seconds
  maxLifetime: 2.0,           // Maximum lifetime in seconds
  dragFactor: 0.99,           // Velocity drag factor per frame
  fadeSpeed: 1.0,             // Fade speed multiplier (quadratic)
  scaleGrowth: 2.0,           // Scale growth factor over lifetime
  spawnInterval: 0.05         // Spawn particle interval in seconds
};

/**
 * Character Change Smoke Particle Configuration (dramatic, for character changes)
 */
export const CHARACTER_CHANGE_SMOKE_CONFIG = {
  maxParticles: 20,           // Maximum number of particles
  minSize: 0.1,               // Minimum particle size
  maxSize: 0.25,              // Maximum particle size
  minOpacity: 0.2,            // Minimum opacity
  maxOpacity: 0.8,            // Maximum opacity
  minGrayValue: 0.7,          // Minimum gray value for color
  maxGrayValue: 0.9,          // Maximum gray value for color
  positionY: 0,               // Base Y position
  horizontalOffset: 0.1,      // Random horizontal offset range
  verticalOffsetRange: 1,     // Vertical offset range
  minVelocityX: -0.5,         // Minimum horizontal velocity
  maxVelocityX: 0.5,          // Maximum horizontal velocity
  minVelocityY: 0.5,          // Minimum upward velocity
  maxVelocityY: 1.0,          // Maximum upward velocity
  minLifetime: 0.4,           // Minimum lifetime in seconds
  maxLifetime: 0.6,           // Maximum lifetime in seconds
  dragFactor: 0.99,           // Velocity drag factor per frame
  fadeSpeed: 1.0,             // Fade speed multiplier (quadratic)
  scaleGrowth: 0.4            // Scale growth factor over lifetime
};

/**
 * Get running smoke particle config
 * @returns {Object} Running smoke configuration
 */
export function getRunningSmokeConfig() {
  return RUNNING_SMOKE_CONFIG;
}

/**
 * Get character change smoke particle config
 * @returns {Object} Character change smoke configuration
 */
export function getCharacterChangeSmokeConfig() {
  return CHARACTER_CHANGE_SMOKE_CONFIG;
}

