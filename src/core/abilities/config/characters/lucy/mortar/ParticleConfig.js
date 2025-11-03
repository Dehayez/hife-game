/**
 * Lucy Mortar Particle Config
 * Lucy-specific mortar particle overrides
 */
export const LUCY_MORTAR_PARTICLE_CONFIG = {
  ambient: {
    // particleCount: uses base (8 default for mortar)
    sizeMin: 0.04,                // Slightly larger (0.03 base)
    sizeMax: 0.07,                // Slightly larger (0.06 base)
    opacityMin: 0.55,            // Slightly brighter (0.5 base)
    opacityMax: 0.92,             // Slightly brighter (0.9 base)
    lifetimeMin: 0.35,            // Slightly shorter (0.4 base)
    lifetimeMax: 0.65,            // Slightly shorter (0.7 base)
    orbitSpeed: 0.022,            // Slightly faster (0.02 base)
  },
  trail: {
    spawnInterval: 0.028,         // Slightly more frequent (0.03 base)
    sizeMin: 0.045,               // Slightly larger (0.04 base)
    sizeMax: 0.09,                // Slightly larger (0.08 base)
    opacityMin: 0.65,            // Slightly brighter (0.6 base)
    opacityMax: 0.93,             // Slightly brighter (0.9 base)
    lifetimeMin: 0.18,           // Slightly shorter (0.2 base)
    lifetimeMax: 0.38,           // Slightly shorter (0.4 base)
  }
};

