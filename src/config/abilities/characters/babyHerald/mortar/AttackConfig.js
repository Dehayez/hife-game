/**
 * Baby Herald Mortar Attack Config — "Verdant Bloom"
 *
 * Baby Herald lobs a seed pod that bursts into a creeping patch of moss.
 * Damage is modest but the patch lingers far longer than papa Herald's
 * mortar fire, and arcs in low and tight for close skirmishes.
 */
export const BABY_HERALD_MORTAR_ATTACK_CONFIG = {
  areaDamage: 0.5,          // 50% of base area damage — gentle ticks
  cooldown: 1.4,            // 140% of base cooldown — slightly slower than Lucy
  arcHeight: 0.7,           // 70% of base height — flatter, faster lob
  splashRadius: 1.3,        // 130% of base radius — wider creeping patch
  fireDuration: 3.0,        // 300% of base — the bloom outlasts the fight
  shrinkDelay: 1.6,         // 160% of base — patch holds its size longer
  size: 0.85,               // 85% of base — small seed pod
  visual: {
    emissiveIntensity: 0.85  // Soft, plantlight glow instead of fireball
  },
  trailLight: {
    intensity: 2.5,
    range: 6
  }
};
