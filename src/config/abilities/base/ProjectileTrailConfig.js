/**
 * Shared trail config for all projectile abilities (bolt, mortar, …).
 *
 * Trails are now consciously SUBTLE: low baseline opacity plus a hard
 * distance-fade so puffs go invisible as soon as the projectile has moved
 * past them. This keeps the projectile core readable and stops the trail
 * from smearing the screen, especially in first-person and with multiple
 * bolts in flight.
 *
 * Per-ability and per-character configs may override any field, but they
 * inherit these defaults — so a single edit here re-tunes every attack.
 */
export const PROJECTILE_TRAIL_BASE = {
  spawnInterval: 0.04,           // Lower spawn rate — fewer puffs in flight
  minVelocity: 0.1,
  sizeMin: 0.04,
  sizeMax: 0.08,
  opacityMin: 0.15,              // Subtle floor — was 0.6
  opacityMax: 0.35,              // Subtle ceiling — was 0.9
  behindDistance: 0.8,
  randomOffset: 0.3,
  lifetimeMin: 0.18,
  lifetimeMax: 0.35,
  speedMin: 0.5,
  speedMax: 1.0,
  backwardDrift: 0.3,
  randomDirection: 0.5,
  // Distance-based fade. Once a particle is `distanceFadeRadius` world units
  // from the projectile it currently belongs to, its opacity is multiplied
  // by 0; closer than that, opacity ramps quadratically from 1 at the
  // projectile to 0 at the radius. Falls back to lifetime fade only after
  // the projectile is removed from the scene.
  distanceFadeRadius: 1.2,
  distanceFadeExponent: 2
};
