/**
 * SoundConfig.js
 * 
 * Centralized configuration for all individual sound settings.
 * Set any sound to false to disable it completely.
 */

/**
 * Sound Configuration Settings
 * 
 * All individual sound toggle settings. Set to false to disable a specific sound.
 */
export const SOUND_CONFIG = {
  /**
   * Character Movement Sounds
   */
  movement: {
    footstepGround: true,        // Ground footstep sound
    footstepObstacle: true,      // Obstacle/platform footstep sound
    jump: true,                  // Jump sound
    landingGround: true,         // Ground landing sound
    landingObstacle: true,       // Obstacle/platform landing sound
  },

  /**
   * Background Music
   */
  music: {
    background: true,            // Background music
  },

  /**
   * Ability Sounds
   */
  abilities: {
    mortarLaunch: true,          // Mortar launch whoosh
    mortarArc: true,             // Mortar flight arc sound
    mortarExplosion: true,       // Mortar explosion
    boltShot: true,              // Bolt shot sound
    boltHit: true,               // Bolt hit sound
    meleeSwing: true,            // Melee swing sound
    meleeHit: true,              // Melee hit sound
  },

  /**
   * Character Event Sounds
   */
  character: {
    characterSwap: true,         // Character swap sound
    respawn: true,               // Respawn sound
    death: true,                 // Death sound
    takeDamage: true,            // Take damage sound
  },
};

/**
 * Check if a specific sound is enabled
 * @param {string} category - Sound category ('movement', 'music', 'abilities', 'character')
 * @param {string} soundName - Name of the sound within the category
 * @returns {boolean} True if sound is enabled, false otherwise
 */
export function isSoundEnabled(category, soundName) {
  if (!SOUND_CONFIG[category]) {
    return true; // Default to enabled if category doesn't exist
  }
  return SOUND_CONFIG[category][soundName] !== false; // Default to enabled if not explicitly set to false
}

/**
 * Get all movement sound settings
 * @returns {Object} Movement sound settings
 */
export function getMovementSounds() {
  return SOUND_CONFIG.movement || {};
}

/**
 * Get all music settings
 * @returns {Object} Music settings
 */
export function getMusicSounds() {
  return SOUND_CONFIG.music || {};
}

/**
 * Get all ability sound settings
 * @returns {Object} Ability sound settings
 */
export function getAbilitySounds() {
  return SOUND_CONFIG.abilities || {};
}

/**
 * Get all character sound settings
 * @returns {Object} Character sound settings
 */
export function getCharacterSounds() {
  return SOUND_CONFIG.character || {};
}

