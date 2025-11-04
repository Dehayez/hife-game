/**
 * Lucy Multi-Projectile Attack Config
 * Lucy-specific multi-projectile ability stats and multipliers.
 * Blows multiple projectiles around her at character height.
 */
export const LUCY_MULTI_PROJECTILE_ATTACK_CONFIG = {
  projectileCount: 12,      // Number of projectiles to spawn around her
  damage: 15,               // Damage per projectile
  cooldown: 4.0,            // Cooldown in seconds
  animationDuration: 0.6,   // Animation duration in seconds
  projectileSpeed: 8,       // Speed of projectiles
  spreadRadius: 2.0,        // Radius around character to spawn projectiles
};

