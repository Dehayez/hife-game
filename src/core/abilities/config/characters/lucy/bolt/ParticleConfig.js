/**
 * Lucy Bolt Particle Config
 * Lucy-specific bolt particle overrides
 */
export const LUCY_BOLT_PARTICLE_CONFIG = {
  ambient: {
    particleCount: 6,           // Same as base
    opacityMin: 0.2,             // Slightly brighter (0.5 base)
    opacityMax: 0.4,             // Slightly brighter (0.9 base)
    lifetimeMin: 0.3,            // Slightly shorter (0.4 base)
    lifetimeMax: 0.6,            // Slightly shorter (0.7 base)
    orbitSpeed: 0.025,          // Slightly faster orbit (0.02 base)
  },
  trail: {
    spawnInterval: 0.025,       // More frequent (0.03 base) - faster projectiles
    sizeMin: 0.015,             // Slightly smaller (0.04 base)
    sizeMax: 0.02,              // Slightly smaller (0.08 base)
    opacityMin: 0.7,            // Brighter (0.6 base)
    opacityMax: 0.95,            // Brighter (0.9 base)
    lifetimeMin: 0.15,          // Shorter (0.2 base) - faster fade
    lifetimeMax: 0.35,          // Shorter (0.4 base) - faster fade
    speedMin: 0.6,              // Faster (0.5 base)
    speedMax: 1.2,               // Faster (1.0 base)
  }
};

