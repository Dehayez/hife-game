/**
 * Herald.js
 * 
 * Herald-specific character stats and multipliers.
 * These values are applied to the global base stats.
 * 
 * ═══════════════════════════════════════════════════════════════════
 * HOW IT WORKS:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Final Value = Global Base × Multiplier
 * 
 * Example:
 *   Global base damage: 20
 *   Herald multiplier: 1.75
 *   Herald final damage: 20 × 1.75 = 35
 * 
 * For exact values, use division:
 *   damage: 12 / 11  means: (Global Base × 12/11) = Final Value
 *   This ensures Herald gets exactly 12 when global base is 11
 * 
 * If a property is not specified, it uses the global base value as-is.
 * 
 * ═══════════════════════════════════════════════════════════════════
 * TO CHANGE HERALD'S STATS:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * 1. Change this file to adjust Herald's multipliers
 * 2. Or change GlobalCharacterStats.js to affect all characters
 * 
 * Example: To make Herald's damage exactly 15:
 *   damage: 15 / 11  (where 11 is the current global base)
 */

export const HERALD_STATS = {
  name: 'Herald',
  color: 0xf5ba0b, // Gold color (#f5ba0b)
  
  /**
   * Herald - Powerful warrior
   * Slower, higher damage attacks with larger projectiles
   */
  
  // Firebolt Ability Stats
  firebolt: {
    damage: 1.75,             // 175% of base (35 damage) - Much higher damage
    cooldown: 2.0,            // 200% of base (0.8s) - Slower than Lucy
    projectileSpeed: 0.9,     // 90% of base (9 units/s) - Slightly slower (final speed)
    minSpeed: 0.3,            // 30% of base speed (start very slow)
    maxSpeed: 1.2,            // 120% of base speed (accelerate to fast)
    size: 1.385,              // 138.5% of base (0.18 radius) - Larger projectiles
    // lifetime: uses global base (3)
    cursorFollowStrength: 1.25 // 125% of base (0.5) - More cursor following
  },
  
  // Mortar Ability Stats
  mortar: {
    // damage: uses global base (35)
    areaDamage: 0.625,        // 62.5% of base (5 area damage) - Lower area damage
    cooldown: 1.167,          // 116.7% of base (3.5s) - Slower cooldown
    arcHeight: 1.143,         // 114.3% of base (4.0 height) - Higher arc
    splashRadius: 1.111,     // 111.1% of base (1.0 radius) - Larger splash
    fireDuration: 1.143,      // 114.3% of base (2.0s) - Longer fire duration
    shrinkDelay: 1.111,       // 111.1% of base (1.0s) - Slower shrink
    size: 1.389               // 138.9% of base (0.25 radius) - Larger mortar
  },
  
  // Melee Attack Stats
  melee: {
    damage: 12 / 11,          // Exactly 12 damage (base 11) - Higher damage per tick
    // tickInterval: uses global base (0.1)
    // range: uses global base (1.4)
    animationDuration: 0.6 / 1.3, // Exactly 0.6s (base 1.3s) - Faster animation
    cooldown: 4 / 3.5,        // Exactly 4.0s (base 3.5s) - Slower cooldown
    // poisonDamage: uses global base (1)
    // poisonTickInterval: uses global base (0.5)
    poisonDuration: 4 / 3.5   // Exactly 4.0s (base 3.5s) - Longer poison duration
  }
};

