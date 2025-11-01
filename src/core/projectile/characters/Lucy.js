/**
 * Lucy.js
 * 
 * Lucy-specific character stats and multipliers.
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
 *   Lucy multiplier: 0.5
 *   Lucy final damage: 20 × 0.5 = 10
 * 
 * For exact values, use division:
 *   damage: 10 / 11  means: (Global Base × 10/11) = Final Value
 *   This ensures Lucy gets exactly 10 when global base is 11
 * 
 * If a property is not specified, it uses the global base value as-is.
 * 
 * ═══════════════════════════════════════════════════════════════════
 * TO CHANGE LUCY'S STATS:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * 1. Change this file to adjust Lucy's multipliers
 * 2. Or change GlobalCharacterStats.js to affect all characters
 * 
 * Example: To make Lucy's damage exactly 12:
 *   damage: 12 / 11  (where 11 is the current global base)
 */

export const LUCY_STATS = {
  name: 'Lucy',
  color: 0x9c57b6, // Purple color (#9c57b6)
  
  /**
   * Lucy - Agile spellcaster
   * Fast, lower damage attacks with smaller projectiles
   */
  
  // Firebolt Ability Stats
  firebolt: {
    damage: 0.5,              // 50% of base (10 damage) - Lower for Uzi-like rapid fire
    cooldown: 0.375,          // 37.5% of base (0.15s) - Much faster for rapid fire
    projectileSpeed: 1.2,     // 120% of base (12 units/s) - Faster
    size: 0.615,              // 61.5% of base (0.08 radius) - Smaller projectiles
    // lifetime: uses global base (3)
    cursorFollowStrength: 0.75 // 75% of base (0.3) - Less cursor following
  },
  
  // Mortar Ability Stats
  mortar: {
    // damage: uses global base (35)
    areaDamage: 1.25,         // 125% of base (10 area damage) - Higher area damage
    cooldown: 0.833,          // 83.3% of base (2.5s) - Faster cooldown
    arcHeight: 0.857,         // 85.7% of base (3.0 height) - Lower arc
    splashRadius: 0.889,     // 88.9% of base (0.8 radius) - Smaller splash
    fireDuration: 0.857,      // 85.7% of base (1.5s) - Shorter fire duration
    shrinkDelay: 0.889,       // 88.9% of base (0.8s) - Faster shrink
    size: 0.667               // 66.7% of base (0.12 radius) - Smaller mortar
  },
  
  // Melee Attack Stats
  melee: {
    damage: 10 / 11,          // Exactly 10 damage (base 11) - Slightly lower damage
    // tickInterval: uses global base (0.1)
    // range: uses global base (1.4)
    animationDuration: 2 / 1.3, // Exactly 2.0s (base 1.3s) - Longer animation
    cooldown: 3 / 3.5,       // Exactly 3.0s (base 3.5s) - Faster cooldown
    // poisonDamage: uses global base (1)
    // poisonTickInterval: uses global base (0.5)
    poisonDuration: 3 / 3.5   // Exactly 3.0s (base 3.5s) - Shorter poison duration
  }
};

