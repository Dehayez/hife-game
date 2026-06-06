/**
 * SoundConfig.js
 *
 * Centralized configuration for all individual sound settings.
 * Set any sound to false to disable it completely. Numeric fields tune
 * procedural layers (drums, wood) and are consumed by SoundManager.
 */

export const SOUND_CONFIG = {
  /**
   * Character Movement Sounds
   */
  movement: {
    footstepGround: true,
    footstepObstacle: true,
    jump: true,
    landingGround: true,
    landingObstacle: true,
    fly: true,
  },

  /**
   * Background Music + procedural drum layer
   */
  music: {
    background: true,
    // Background music plays intermittently rather than as a constant loop.
    backgroundIntermittent: true,
    backgroundPlayMs: 18000,          // each on-segment lasts ~18s
    backgroundMinSilenceMs: 25000,    // then silence for 25-55s before next on-segment
    backgroundMaxSilenceMs: 55000,
    backgroundFadeMs: 1500,           // fade in/out duration

    // Procedural drums: OFF by default. Music plays clean unless user enables.
    drums: false,
    drumsBpm: 88,
    drumsVolume: 0.35,                // relative to background music volume (0-1)
    drumsSwing: 0.18,
    // Rare-rhythm knobs: drums skip whole bars and pull back when idle.
    drumsBarPlayChance: 0.35,         // chance a given bar plays at all
    drumsIdleFloor: 0.0,              // intensity 0 -> drums fully muted
    drumsPeakBoost: 0.95,             // intensity 1 -> near full
    drumsMaxDensity: 0.55,            // 0-1, caps how busy the pattern gets
  },

  /**
   * Procedural wood SFX layered onto movement + ambient hits
   */
  wood: {
    onFootstepGround: true,       // wood knock mixed into ground footsteps
    onFootstepObstacle: true,     // wood knock mixed into obstacle footsteps
    onLandingGround: true,        // wood thud accent on ground landings
    onLandingObstacle: true,      // wood thud accent on obstacle landings
    ambient: true,                // periodic random wood creaks/knocks
    ambientMinIntervalMs: 4000,
    ambientMaxIntervalMs: 11000,
    ambientVolume: 0.35,          // relative to sound-effects volume
    stepVolume: 0.45,             // wood layer volume on footsteps (rel to sfx volume)
    landingVolume: 0.7,           // wood layer volume on landings (rel to sfx volume)
  },

  /**
   * Ability Sounds
   */
  abilities: {
    mortarLaunch: true,
    mortarArc: true,
    mortarExplosion: true,
    boltShot: true,
    boltHit: true,
    meleeSwing: true,
    meleeHit: true,
  },

  /**
   * Character Event Sounds
   */
  character: {
    characterSwap: true,
    respawn: true,
    death: true,
    takeDamage: true,
    collectiblePickup: true,
  },
};

/**
 * Check if a specific sound is enabled
 * @param {string} category
 * @param {string} soundName
 * @returns {boolean}
 */
export function isSoundEnabled(category, soundName) {
  if (!SOUND_CONFIG[category]) return true;
  return SOUND_CONFIG[category][soundName] !== false;
}

/**
 * Get a numeric tuning value with a fallback.
 * @param {string} category
 * @param {string} key
 * @param {number} fallback
 * @returns {number}
 */
export function getSoundValue(category, key, fallback) {
  const section = SOUND_CONFIG[category];
  if (!section) return fallback;
  const value = section[key];
  return typeof value === 'number' ? value : fallback;
}

export function getMovementSounds() {
  return SOUND_CONFIG.movement || {};
}

export function getMusicSounds() {
  return SOUND_CONFIG.music || {};
}

export function getWoodSounds() {
  return SOUND_CONFIG.wood || {};
}

export function getAbilitySounds() {
  return SOUND_CONFIG.abilities || {};
}

export function getCharacterSounds() {
  return SOUND_CONFIG.character || {};
}
