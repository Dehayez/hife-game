/**
 * Lucy Melee Attack Config
 * Lucy-specific melee ability stats and multipliers.
 * Lucy's melee fires projectiles in a 360-degree pattern around the character.
 */
export const LUCY_MELEE_ATTACK_CONFIG = {
  damage: 10 / 11,          // Exactly 10 damage (base 11) - Slightly lower damage
  animationDuration: 2 / 1.3, // Exactly 2.0s (base 1.3s) - Longer animation
  cooldown: 3 / 3.5,       // Exactly 3.0s (base 3.5s) - Faster cooldown
  poisonDuration: 3 / 3.5,   // Exactly 3.0s (base 3.5s) - Shorter poison duration
  projectileCount: 16,      // Number of projectiles to fire in 360-degree pattern
  projectileSpeed: 6,        // Speed of projectiles fired from melee
  projectileDamage: 8        // Damage per projectile
};

