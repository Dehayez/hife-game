/**
 * SmokeParticleConfig.js
 *
 * Base configuration for smoke particle effects (running and character switching).
 * These are passive visual effects triggered during movement/transformation.
 */

/**
 * Running Smoke Particle Configuration (subtle, for running)
 * Used as the fallback when a character has no override.
 */
export const RUNNING_SMOKE_CONFIG = {
  maxParticles: 150,
  minSize: 0.1,
  maxSize: 0.2,
  minOpacity: 0.2,
  maxOpacity: 0.6,
  minGrayValue: 0.5,
  maxGrayValue: 0.9,
  positionY: 0,
  horizontalOffset: 0.5,
  verticalOffsetRange: 0.2,
  minVelocityX: -0.5,
  maxVelocityX: 0.5,
  minVelocityY: 0.5,
  maxVelocityY: 1.0,
  minLifetime: 1.0,
  maxLifetime: 2.0,
  dragFactor: 0.99,
  fadeSpeed: 1.0,
  scaleGrowth: 2.0,
  spawnInterval: 0.05
};

/**
 * Per-character running smoke overrides. Merged on top of RUNNING_SMOKE_CONFIG
 * so each character only needs to specify what differs.
 *
 * lucy   — fewer puffs, narrow, near-vertical trail (low horizontal velocity,
 *          small scale growth). Reads as quick, clean footwork.
 * herald — fluffy smoke: bigger puffs, more opaque, slower rise so they linger
 *          and read as billowing rather than wispy. Slight performance trim via
 *          lower maxParticles since each puff is larger.
 * babyHerald — same fluffy family as herald (sprout sibling), kept slightly
 *          smaller to match the model scale.
 */
const RUNNING_SMOKE_OVERRIDES = {
  lucy: {
    maxParticles: 60,
    minSize: 0.08,
    maxSize: 0.14,
    minOpacity: 0.18,
    maxOpacity: 0.45,
    horizontalOffset: 0.18,
    verticalOffsetRange: 0.1,
    minVelocityX: -0.15,
    maxVelocityX: 0.15,
    minVelocityY: 0.4,
    maxVelocityY: 0.8,
    minLifetime: 0.7,
    maxLifetime: 1.2,
    scaleGrowth: 0.8,
    spawnInterval: 0.09
  },
  herald: {
    maxParticles: 90,
    minSize: 0.18,
    maxSize: 0.32,
    minOpacity: 0.3,
    maxOpacity: 0.7,
    minGrayValue: 0.55,
    maxGrayValue: 0.85,
    horizontalOffset: 0.45,
    verticalOffsetRange: 0.25,
    minVelocityX: -0.45,
    maxVelocityX: 0.45,
    minVelocityY: 0.3,
    maxVelocityY: 0.7,
    minLifetime: 1.4,
    maxLifetime: 2.4,
    scaleGrowth: 3.0,
    spawnInterval: 0.06
  },
  babyHerald: {
    maxParticles: 70,
    minSize: 0.14,
    maxSize: 0.24,
    minOpacity: 0.28,
    maxOpacity: 0.65,
    minGrayValue: 0.55,
    maxGrayValue: 0.85,
    horizontalOffset: 0.35,
    verticalOffsetRange: 0.2,
    minVelocityX: -0.35,
    maxVelocityX: 0.35,
    minVelocityY: 0.3,
    maxVelocityY: 0.7,
    minLifetime: 1.2,
    maxLifetime: 2.0,
    scaleGrowth: 2.6,
    spawnInterval: 0.07
  }
};

/**
 * First-person view tweaks layered on top of the resolved running config when
 * smoke is being spawned for the locally-controlled player. Cuts spawn rate
 * and pushes puffs down/back so they don't fill the camera. Each value is a
 * partial override; unspecified keys keep the resolved per-character value.
 */
const RUNNING_SMOKE_FPV_OVERRIDES = {
  spawnInterval: 0.18,         // much fewer puffs per second
  maxOpacity: 0.35,            // softer when they do appear
  minOpacity: 0.1,
  positionY: -0.1,             // sink toward the ground, away from eye line
  verticalOffsetRange: 0.05,
  minVelocityY: 0.1,           // don't rise into the camera
  maxVelocityY: 0.35,
  horizontalOffset: 0.2,
  scaleGrowth: 0.6,            // stay small so they don't smear the view
  minLifetime: 0.5,
  maxLifetime: 0.9
};

/**
 * Character Change Smoke Particle Configuration (dramatic, for character changes)
 */
export const CHARACTER_CHANGE_SMOKE_CONFIG = {
  maxParticles: 20,
  minSize: 0.1,
  maxSize: 0.25,
  minOpacity: 0.2,
  maxOpacity: 0.8,
  minGrayValue: 0.7,
  maxGrayValue: 0.9,
  positionY: 0,
  horizontalOffset: 0.1,
  verticalOffsetRange: 1,
  minVelocityX: -0.5,
  maxVelocityX: 0.5,
  minVelocityY: 0.5,
  maxVelocityY: 1.0,
  minLifetime: 0.4,
  maxLifetime: 0.6,
  dragFactor: 0.99,
  fadeSpeed: 1.0,
  scaleGrowth: 0.4
};

/**
 * Get running smoke particle config (default — no character context).
 * Kept for back-compat with callers that don't have a character name yet.
 * @returns {Object} Running smoke configuration
 */
export function getRunningSmokeConfig() {
  return RUNNING_SMOKE_CONFIG;
}

/**
 * Get running smoke particle config tuned for a specific character, with an
 * optional first-person overlay for the local player.
 * @param {string|null} characterName
 * @param {boolean} firstPerson - apply FPV overlay (only for the local player)
 * @returns {Object}
 */
export function getRunningSmokeConfigFor(characterName, firstPerson = false) {
  const perChar = (characterName && RUNNING_SMOKE_OVERRIDES[characterName]) || null;
  const base = perChar ? { ...RUNNING_SMOKE_CONFIG, ...perChar } : RUNNING_SMOKE_CONFIG;
  return firstPerson ? { ...base, ...RUNNING_SMOKE_FPV_OVERRIDES } : base;
}

/**
 * Get character change smoke particle config
 * @returns {Object} Character change smoke configuration
 */
export function getCharacterChangeSmokeConfig() {
  return CHARACTER_CHANGE_SMOKE_CONFIG;
}
