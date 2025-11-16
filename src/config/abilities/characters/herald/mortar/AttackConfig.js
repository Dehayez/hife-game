/**
 * Herald Mortar Attack Config
 * Herald-specific mortar ability stats and multipliers.
 */
export const HERALD_MORTAR_ATTACK_CONFIG = {
  areaDamage: 0.625,        // 62.5% of base (5 area damage) - Lower area damage
  cooldown: 2.0,            // 200% of base (6.0s) - Much longer cooldown
  arcHeight: 1.143,         // 114.3% of base (4.0 height) - Higher arc
  splashRadius: 1.111,     // 111.1% of base (1.0 radius) - Larger splash
  fireDuration: 2.286,      // 228.6% of base (4.0s) - Double duration for longer fire
  shrinkDelay: 1.111,       // 111.1% of base (1.0s) - Slower shrink
  size: 1.389,              // 138.9% of base (0.25 radius) - Larger mortar
  // Visual overrides (for mortar projectile appearance)
  visual: {
    emissiveIntensity: 1.2   // More intense fireball
  },
  trailLight: {
    intensity: 5,            // Much brighter trail
    range: 10                // Longer trail range
  }
};

