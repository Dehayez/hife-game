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
    spawnInterval: 0.025,         // More frequent for continuous fire trail
    sizeMin: 0.08,                // Larger fire trail particles
    sizeMax: 0.16,                // Larger fire trail particles
    opacityMin: 0.65,             // Brighter for fire trail
    opacityMax: 0.95,             // Brighter for fire trail
    behindDistance: 1.4,          // Further behind for longer fire trail
    randomOffset: 0.6,             // More spread for fire
    lifetimeMin: 0.18,            // Shorter for flickering fire trail
    lifetimeMax: 0.38,            // Shorter for flickering fire trail
    speedMin: 0.5,                // Faster for fire trail
    speedMax: 1.1,                // Faster for fire trail
    backwardDrift: 0.3,           // More drift for fire effect
    randomDirection: 0.65         // More spread for fire
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

