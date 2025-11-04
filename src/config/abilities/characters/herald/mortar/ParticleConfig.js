/**
 * Herald Mortar Particle Config
 * Herald-specific mortar particle overrides
 */
export const HERALD_MORTAR_PARTICLE_CONFIG = {
  ambient: {
    particleCount: 8,            // Base count (can be customized)
    sizeMin: 0.05,                // Larger (0.03 base)
    sizeMax: 0.09,                // Larger (0.06 base)
    opacityMin: 0.3,              // Dimmer (0.5 base) - more mystical
    opacityMax: 0.6,              // Dimmer (0.9 base)
    distanceMin: 0.95,            // Further out (0.8 base)
    distanceMax: 1.5,             // Further out (1.2 base)
    lifetimeMin: 0.45,            // Longer (0.4 base)
    lifetimeMax: 0.75,             // Longer (0.7 base)
    orbitSpeed: 0.016,            // Slower orbit (0.02 base)
    outwardSpeedMin: 0.25,        // Slower expansion (0.3 base)
    outwardSpeedMax: 0.55,         // Slower expansion (0.6 base)
    rotationSpeedMin: 0.45,        // Slightly faster rotation (0.5 base)
    rotationSpeedMax: 0.85          // Slower rotation (1.0 base)
  },
  trail: {
    spawnInterval: 0.04,           // Less frequent (0.03 base) - arc trajectory
    sizeMin: 0.06,                // Larger (0.04 base)
    sizeMax: 0.12,                 // Larger (0.08 base)
    opacityMin: 0.55,             // Slightly brighter (0.6 base)
    opacityMax: 0.9,               // Same (0.9 base)
    behindDistance: 1.2,           // Further behind (0.8 base) - bigger mortar
    randomOffset: 0.5,             // More spread (0.3 base)
    lifetimeMin: 0.22,            // Slightly longer (0.2 base)
    lifetimeMax: 0.42,            // Slightly longer (0.4 base)
    speedMin: 0.45,               // Slightly slower (0.5 base)
    speedMax: 0.95,                // Slightly slower (1.0 base)
    backwardDrift: 0.28,          // Slightly less drift (0.3 base)
    randomDirection: 0.55          // Slightly more spread (0.5 base)
  }
};

