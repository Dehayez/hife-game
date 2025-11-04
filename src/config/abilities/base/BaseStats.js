/**
 * BaseStats.js
 * 
 * Global base stats for all characters.
 * 
 * ═══════════════════════════════════════════════════════════════════
 * IMPORTANT: WHEN YOU CHANGE VALUES HERE, ALL CHARACTERS ARE AFFECTED
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Example:
 *   Change base damage from 20 to 25
 *   → Lucy: 25 × 0.5 = 12.5 (was 10)
 *   → Herald: 25 × 1.75 = 43.75 (was 35)
 * 
 * Character-specific files apply multipliers to these values.
 * 
 * ═══════════════════════════════════════════════════════════════════
 * TO CHANGE STATS FOR ALL CHARACTERS:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Edit the values below. All characters will automatically use the new base values
 * multiplied by their character-specific multipliers.
 */

/**
 * Global Base Stats Configuration
 * 
 * These are the base values that all characters inherit.
 * Character-specific files apply multipliers or overrides to these values.
 */
export const GLOBAL_BASE_STATS = {
  /**
   * Base Bolt Ability Stats
   */
  bolt: {
    damage: 20,              // Base damage per hit
    cooldown: 0.4,           // Base seconds between shots
    projectileSpeed: 4,     // Base units per second
    size: 0.13,              // Base projectile radius
    lifetime: 8,              // Seconds before projectile despawns
    cursorFollowStrength: 0.4, // Base cursor follow strength (0.0 = none, 1.0 = full)
    maxBullets: 10,          // Base maximum number of bullets before recharge
    rechargeCooldown: 2.0    // Base seconds to recharge all bullets
  },
  
  /**
   * Base Mortar Ability Stats
   */
  mortar: {
    damage: 35,              // Base direct hit damage
    areaDamage: 8,           // Base area damage per tick
    cooldown: 3.0,           // Base seconds between mortar shots
    arcHeight: 2.5,          // Base maximum height of arc trajectory
    maxRange: 8,            // Base maximum horizontal range in units
    splashRadius: 0.9,       // Base radius of splash area
    fireDuration: 1.75,      // Base how long fire persists on ground (seconds)
    shrinkDelay: 0.9,        // Base wait time before fire starts shrinking (seconds)
    size: 0.18               // Base mortar projectile radius
  },
  
  /**
   * Base Melee Attack Stats
   */
  melee: {
    initialDamage: 15,       // Base initial damage on first hit (immediate damage)
    damage: 11,              // Base damage per tick (damage dealt each tick during animation)
    tickInterval: 0.1,       // Base seconds between damage ticks (10 ticks/second)
    range: 1.4,               // Base attack range in units (how far the attack reaches)
    animationDuration: 1.3,  // Base animation duration in seconds (how long the attack animation lasts)
    cooldown: 3.5,           // Base seconds between melee attacks (cooldown time)
    poisonDamage: 1,         // Base poison damage per tick (damage dealt after animation ends)
    poisonTickInterval: 0.5, // Base seconds between poison damage ticks (2 ticks/second)
    poisonDuration: 3.5,     // Base how long poison lasts in seconds (total poison duration)
    slowSpeedMultiplier: 0.6 // Base speed multiplier when poisoned (0.6 = 60% speed = 40% slow)
  }
};

