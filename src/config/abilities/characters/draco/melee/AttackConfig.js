/**
 * Draco Melee Attack Config — "Briar Sting"
 *
 * A whiplash sprig swing. Snappy animation, weak per-hit, but the thorns
 * leave a lingering verdant poison that bleeds opponents for a long time
 * and slows them more than papa Herald's sword.
 */
export const DRACO_MELEE_ATTACK_CONFIG = {
  damage: 7 / 11,                  // Exactly 7 damage per tick (base 11)
  initialDamage: 8 / 15,           // Exactly 8 initial damage (base 15)
  animationDuration: 0.4 / 1.3,    // Exactly 0.4s (base 1.3s) — very snappy
  cooldown: 2.4 / 3.5,             // Exactly 2.4s (base 3.5s) — much faster recovery
  range: 1.2 / 1.4,                // Exactly 1.2 units — shorter reach, baby arms
  poisonDamage: 2 / 1,             // Exactly 2 dmg/tick (base 1)
  poisonDuration: 6 / 3.5,         // Exactly 6.0s (base 3.5s) — long bleed
  slowSpeedMultiplier: 0.45 / 0.6  // Exactly 0.45 (base 0.6) — heavier slow
};
