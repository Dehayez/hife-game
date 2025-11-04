/**
 * Lucy Bolt Attack Config
 * 
 * Lucy-specific bolt ability stats and multipliers.
 * These values are applied to the global base stats.
 */

export const LUCY_BOLT_ATTACK_CONFIG = {
  damage: 0.5,              // 50% of base (10 damage) - Lower for Uzi-like rapid fire
  cooldown: 0.375,          // 37.5% of base (0.15s) - Much faster for rapid fire
  projectileSpeed: 1.2,     // 120% of base (12 units/s) - Faster (final speed)
  minSpeed: 0.6,            // 60% of base speed (decelerate to slower)
  maxSpeed: 2.0,            // 200% of base speed (start very fast)
  size: 0.615,              // 61.5% of base (0.08 radius) - Smaller projectiles
  cursorFollowStrength: 0.75, // 75% of base (0.3) - Less cursor following
  maxBullets: 1.5,          // 150% of base (15 bullets) - More bullets for rapid fire
  rechargeCooldown: 0.7     // 70% of base (1.4s) - Faster recharge for rapid fire
};

