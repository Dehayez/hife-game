/**
 * Herald Bolt Particle Config
 * Herald-specific bolt particle overrides with FIRE effects
 */
export const HERALD_BOLT_PARTICLE_CONFIG = {
  ambient: {
    particleCount: 10,            // More particles for fire effect
    sizeMin: 0.05,                // Larger fire particles
    sizeMax: 0.12,                // Larger fire particles
    opacityMin: 0.6,              // Brighter for fire visibility
    opacityMax: 0.95,             // Brighter for fire visibility
    distanceMin: 0.9,             // Further out - bigger fire sphere
    distanceMax: 1.5,             // Further out - bigger fire sphere
    lifetimeMin: 0.4,             // Shorter for flickering fire
    lifetimeMax: 0.7,             // Shorter for flickering fire
    orbitSpeed: 0.025,            // Faster orbit for dynamic fire
    outwardSpeedMin: 0.4,         // Faster expansion for fire
    outwardSpeedMax: 0.8,         // Faster expansion for fire
    rotationSpeedMin: 0.6,        // Faster rotation for fire
    rotationSpeedMax: 1.2          // Faster rotation for fire
  },
  // Opacity stays low so the trail reads as glow, not flame-smear; the
  // distance-fade radius from PROJECTILE_TRAIL_BASE keeps puffs close to
  // the bolt itself.
  trail: {
    spawnInterval: 0.04,
    sizeMin: 0.06,
    sizeMax: 0.14,
    opacityMin: 0.15,
    opacityMax: 0.35,
    behindDistance: 1.2,
    randomOffset: 0.5,
    lifetimeMin: 0.14,
    lifetimeMax: 0.3,
    speedMin: 0.5,
    speedMax: 1.2,
    backwardDrift: 0.3,
    randomDirection: 0.7
  },
  // Fire-specific effects
  effectType: 'fire',             // Mark as fire effect
  fireColors: {
    core: 0xff6600,              // Orange core
    mid: 0xff8800,                // Bright orange
    outer: 0xffaa00,               // Yellow-orange
    smoke: 0x333333               // Dark smoke
  }
};

