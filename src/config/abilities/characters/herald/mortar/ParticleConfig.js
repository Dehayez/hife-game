/**
 * Herald Mortar Particle Config
 * Herald-specific mortar particle overrides with FIRE effects
 */
export const HERALD_MORTAR_PARTICLE_CONFIG = {
  ambient: {
    particleCount: 12,            // More particles for bigger fire effect
    sizeMin: 0.06,                // Larger fire particles
    sizeMax: 0.14,                // Larger fire particles
    opacityMin: 0.5,              // Brighter for fire visibility
    opacityMax: 0.9,              // Brighter for fire visibility
    distanceMin: 1.0,             // Further out - bigger fire sphere
    distanceMax: 1.6,             // Further out - bigger fire sphere
    lifetimeMin: 0.35,            // Shorter for flickering fire
    lifetimeMax: 0.65,            // Shorter for flickering fire
    orbitSpeed: 0.022,            // Faster orbit for dynamic fire
    outwardSpeedMin: 0.35,        // Faster expansion for fire
    outwardSpeedMax: 0.7,         // Faster expansion for fire
    rotationSpeedMin: 0.5,        // Faster rotation for fire
    rotationSpeedMax: 1.0          // Faster rotation for fire
  },
  trail: {
    spawnInterval: 0.04,
    sizeMin: 0.08,
    sizeMax: 0.16,
    opacityMin: 0.15,
    opacityMax: 0.35,
    behindDistance: 1.4,
    randomOffset: 0.6,
    lifetimeMin: 0.16,
    lifetimeMax: 0.32,
    speedMin: 0.5,
    speedMax: 1.1,
    backwardDrift: 0.3,
    randomDirection: 0.65
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

