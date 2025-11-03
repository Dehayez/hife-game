/**
 * Base Melee Particle Config
 * Melee doesn't have projectile particles, but this can be used for sword swing effects
 */
export const MELEE_PARTICLE_CONFIG = {
  // Sword swing visual effect settings (if needed in future)
  visual: {
    circleSegments: 32,               // Circle geometry segments for sword swing effect
    innerRadiusMultiplier: 0.875,     // Inner radius scale relative to range
    opacity: 0.8,                     // Base opacity
  },
};

