/**
 * GameModeConfig.js
 * 
 * Centralized configuration for all game mode settings.
 * This file provides a clear view of every game mode configuration.
 */

/**
 * Game Mode Configurations
 * 
 * All available game modes with their display names and descriptions.
 */
export const GAME_MODE_CONFIG = {
  'free-play': {
    name: 'Forest Wander',
    description: 'Explore the magical forest freely',
    enabled: true,
    image: '/assets/gamemodes/free-play.png'
  },
  'time-trial': {
    name: 'Crystal Shrine',
    description: 'Activate mystical shrines before time runs out',
    enabled: true,
    image: '/assets/gamemodes/time-trial.png'
  },
  'collection': {
    name: 'Gem Gathering',
    description: 'Collect enchanted crystals scattered throughout',
    enabled: true,
    image: '/assets/gamemodes/collection.png'
  },
  'survival': {
    name: 'Shadow Escape',
    description: 'Survive the cursed thorns as long as possible',
    enabled: true,
    image: '/assets/gamemodes/survival.png'
  },
  'shooting': {
    name: 'Mystic Battle',
    description: 'Invite players and battle with magical projectiles',
    enabled: true,
    image: '/assets/gamemodes/shooting.png'
  }
};

/**
 * Get mode configuration by key
 * @param {string} modeKey - Mode key
 * @returns {Object|null} Mode configuration or null if not found
 */
export function getModeConfig(modeKey) {
  return GAME_MODE_CONFIG[modeKey] || null;
}

/**
 * Get all enabled modes
 * @returns {Array<string>} Array of enabled mode keys
 */
export function getAllEnabledModes() {
  return Object.keys(GAME_MODE_CONFIG).filter(key => GAME_MODE_CONFIG[key].enabled);
}

/**
 * Check if a mode is enabled
 * @param {string} modeKey - Mode key
 * @returns {boolean} True if mode is enabled
 */
export function isModeEnabled(modeKey) {
  const config = GAME_MODE_CONFIG[modeKey];
  return config ? config.enabled : false;
}

