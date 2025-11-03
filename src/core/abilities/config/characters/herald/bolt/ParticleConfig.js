/**
 * Herald Bolt Particle Config
 * Herald-specific bolt particle overrides
 */
export const HERALD_BOLT_PARTICLE_CONFIG = {
  ambient: {
    particleCount: 7,            // More particles (6 base) - bigger projectile
    sizeMin: 0.04,                // Larger (0.03 base)
    sizeMax: 0.08,                // Larger (0.06 base)
    opacityMin: 0.45,             // Slightly dimmer (0.5 base) - more mystical
    opacityMax: 0.85,             // Slightly dimmer (0.9 base)
    distanceMin: 0.9,             // Further out (0.8 base) - bigger projectile
    distanceMax: 1.4,             // Further out (1.2 base)
    lifetimeMin: 0.5,             // Longer (0.4 base)
    lifetimeMax: 0.8,             // Longer (0.7 base)
    orbitSpeed: 0.018,            // Slower orbit (0.02 base) - more majestic
    outwardSpeedMin: 0.2,        // Slower expansion (0.3 base)
    outwardSpeedMax: 0.5,         // Slower expansion (0.6 base)
    rotationSpeedMin: 0.4,        // Slower rotation (0.5 base)
    rotationSpeedMax: 0.8          // Slower rotation (1.0 base)
  },
  trail: {
    spawnInterval: 0.035,         // Less frequent (0.03 base) - slower projectile
    sizeMin: 0.05,                // Larger (0.04 base)
    sizeMax: 0.1,                  // Larger (0.08 base)
    opacityMin: 0.5,              // Dimmer (0.6 base) - more mystical
    opacityMax: 0.85,             // Dimmer (0.9 base)
    behindDistance: 1.0,          // Further behind (0.8 base)
    randomOffset: 0.4,             // More spread (0.3 base)
    lifetimeMin: 0.25,            // Longer (0.2 base)
    lifetimeMax: 0.45,            // Longer (0.4 base)
    speedMin: 0.4,                // Slower (0.5 base)
    speedMax: 0.9,                 // Slower (1.0 base)
    backwardDrift: 0.25,          // Less drift (0.3 base)
    randomDirection: 0.6          // More spread (0.5 base)
  }
};

