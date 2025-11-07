/**
 * Herald Roll Attack Config
 * Controls the knockback behavior applied while Herald is sprinting (rolling).
 */
export const HERALD_ROLL_ATTACK_CONFIG = {
  radiusMultiplier: 1.6,    // Multiplier applied to Herald's collision size to determine knockback radius
  horizontalVelocity: 12.0, // Horizontal velocity applied to affected entities
  verticalVelocity: 3.5,    // Vertical velocity for a small pop-up effect
  cooldownMs: 400,          // Minimum time in milliseconds before the same entity can be knocked again
  minDistance: 0.1          // Minimum separation distance to avoid zero-length direction vectors
};


