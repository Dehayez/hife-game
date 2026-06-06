/**
 * Lucy Bolt Particle Config
 * Lucy-specific bolt particle overrides with POISON effects
 */
export const LUCY_BOLT_PARTICLE_CONFIG = {
  ambient: {
    particleCount: 8,           // More particles for poison effect
    sizeMin: 0.04,               // Larger poison particles
    sizeMax: 0.08,               // Larger poison particles
    opacityMin: 0.5,             // Brighter for poison visibility
    opacityMax: 0.85,            // Brighter for poison visibility
    distanceMin: 0.85,           // Further out for poison cloud
    distanceMax: 1.3,            // Further out for poison cloud
    lifetimeMin: 0.5,            // Longer for lingering poison
    lifetimeMax: 0.8,            // Longer for lingering poison
    orbitSpeed: 0.03,            // Faster orbit for dynamic poison
    outwardSpeedMin: 0.25,       // Slower expansion for poison cloud
    outwardSpeedMax: 0.5,         // Slower expansion for poison cloud
    rotationSpeedMin: 0.4,       // Slower rotation for poison
    rotationSpeedMax: 0.8         // Slower rotation for poison
  },
  // Opacity + distanceFadeRadius inherit from PROJECTILE_TRAIL_BASE so the
  // subtle look stays consistent across attacks. Only the poison-specific
  // shape (frequency, spread, lifetime) is tuned here.
  trail: {
    spawnInterval: 0.04,
    sizeMin: 0.05,
    sizeMax: 0.1,
    opacityMin: 0.12,
    opacityMax: 0.3,
    behindDistance: 1.0,
    randomOffset: 0.4,
    lifetimeMin: 0.22,
    lifetimeMax: 0.4,
    speedMin: 0.4,
    speedMax: 0.9,
    backwardDrift: 0.25,
    randomDirection: 0.6
  },
  // Poison-specific effects
  effectType: 'poison',          // Mark as poison effect
  poisonColors: {
    core: 0x00ff00,             // Bright green core
    mid: 0x88ff00,               // Yellow-green
    outer: 0x00ff88,             // Cyan-green
    toxic: 0x9c57b6              // Purple toxic (Lucy's color)
  }
};

