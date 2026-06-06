/**
 * Draco Bolt Attack Config — "Spore Dart"
 *
 * Tiny emerald spore-darts. Each one barely tickles, but they leave the
 * tube in dense, fast volleys. Draco empties a magazine in the time
 * his elder lines up a single shot.
 */
export const DRACO_BOLT_ATTACK_CONFIG = {
  damage: 0.55,             // 55% of base — every dart is light
  cooldown: 0.45,           // 45% of base — fires nearly twice as fast as base
  projectileSpeed: 1.35,    // 135% of base final speed
  minSpeed: 0.9,            // Launches near top speed; spores don't wind up
  maxSpeed: 1.6,
  size: 0.75,               // 75% of base radius — small, hard to read
  cursorFollowStrength: 1.6,
  maxBullets: 1.8,          // 180% of base (18 darts) — long sustained fire
  rechargeCooldown: 0.55,   // 55% of base — recovers very quickly
  speedBoost: {
    cooldownMultiplier: 0.4,
    duration: 4.0,
    cooldown: 14.0
  },
  joystickSpeedMultiplier: {
    minSpeedMultiplier: 0.55,
    maxSpeedMultiplier: 1.5
  }
};
