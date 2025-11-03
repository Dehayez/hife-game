/**
 * Herald Bolt Attack Config
 * Herald-specific bolt ability stats and multipliers.
 */
export const HERALD_BOLT_ATTACK_CONFIG = {
  damage: 1.75,             // 175% of base (35 damage) - Much higher damage
  cooldown: 2.0,            // 200% of base (0.8s) - Slower than Lucy
  projectileSpeed: 0.9,     // 90% of base (9 units/s) - Slightly slower (final speed)
  minSpeed: 0.3,            // 30% of base speed (start very slow)
  maxSpeed: 1.2,            // 120% of base speed (accelerate to fast)
  size: 1.385,              // 138.5% of base (0.18 radius) - Larger projectiles
  cursorFollowStrength: 1.25 // 125% of base (0.5) - More cursor following
};

