/**
 * Herald Bolt Attack Config
 * Herald-specific bolt ability stats and multipliers.
 */
export const HERALD_BOLT_ATTACK_CONFIG = {
  damage: 1.75,             // 175% of base (35 damage) - Much higher damage
  cooldown: 2.5,            // 250% of base (1.0s) - Slower fire rate
  projectileSpeed: 1,     // 90% of base (9 units/s) - Slightly slower (final speed)
  minSpeed: 0.3,            // 30% of base speed (start very slow)
  maxSpeed: 4,            // 120% of base speed (accelerate to fast)
  size: 1.385,              // 138.5% of base (0.18 radius) - Larger projectiles
  cursorFollowStrength: 3.4, // 125% of base (0.5) - More cursor following
  maxBullets: 1.2,          // 120% of base (12 bullets) - More rounds for sustained fire
  rechargeCooldown: 1.5,    // 150% of base (3.0s) - Slower recharge for powerful shots
  speedBoost: {
    cooldownMultiplier: 0.5, // 50% of base cooldown (2x faster attack speed)
    duration: 5.0,           // 5 seconds duration
    cooldown: 20.0           // 20 seconds cooldown between uses
  },
  joystickSpeedMultiplier: {
    minSpeedMultiplier: 0.3,  // Minimum speed when joystick not pushed (0.7x base speed)
    maxSpeedMultiplier: 1.8   // Maximum speed when joystick fully pushed (1.5x base speed)
  }
};

