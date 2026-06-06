/**
 * Lucy Mortar Particle Config
 * Lucy-specific mortar particle overrides with POISON effects
 */
export const LUCY_MORTAR_PARTICLE_CONFIG = {
  ambient: {
    particleCount: 10,            // More particles for bigger poison effect
    sizeMin: 0.05,                // Larger poison particles
    sizeMax: 0.1,                 // Larger poison particles
    opacityMin: 0.5,              // Brighter for poison visibility
    opacityMax: 0.85,             // Brighter for poison visibility
    distanceMin: 0.9,             // Further out for poison cloud
    distanceMax: 1.4,             // Further out for poison cloud
    lifetimeMin: 0.4,             // Longer for lingering poison
    lifetimeMax: 0.7,             // Longer for lingering poison
    orbitSpeed: 0.025,            // Faster orbit for dynamic poison
    outwardSpeedMin: 0.3,         // Slower expansion for poison cloud
    outwardSpeedMax: 0.6,          // Slower expansion for poison cloud
    rotationSpeedMin: 0.5,       // Slower rotation for poison
    rotationSpeedMax: 1.0          // Slower rotation for poison
  },
  // Subtle baseline opacity — fall-off vs projectile distance is set by the
  // mortar base config (PROJECTILE_TRAIL_BASE with a wider radius).
  trail: {
    spawnInterval: 0.04,
    sizeMin: 0.06,
    sizeMax: 0.12,
    opacityMin: 0.12,
    opacityMax: 0.3,
    behindDistance: 1.2,
    randomOffset: 0.5,
    lifetimeMin: 0.2,
    lifetimeMax: 0.38,
    speedMin: 0.4,
    speedMax: 0.9,
    backwardDrift: 0.25,
    randomDirection: 0.6
  },
  // Poison-specific effects
  effectType: 'poison',           // Mark as poison effect
  poisonColors: {
    core: 0x00ff00,              // Bright green core
    mid: 0x88ff00,                // Yellow-green
    outer: 0x00ff88,              // Cyan-green
    toxic: 0x9c57b6              // Purple toxic (Lucy's color)
  }
};

