/**
 * ArenaConfig.js
 * 
 * Centralized configuration for all arena settings.
 * This file provides a clear view of every arena configuration that can be edited.
 */

/**
 * Arena Configuration
 * 
 * All available arenas with their display names and sizes.
 */
export const ARENA_CONFIG = {
  'standard': {
    label: 'Forest Plaza (20x20)',
    size: 20,
    description: 'A cozy forest clearing perfect for quick matches'
  },
  'large': {
    label: 'Ancient Grove (40x40)',
    size: 40,
    description: 'A vast ancient forest for epic battles'
  }
};

/**
 * Get arena configuration by key
 * @param {string} arenaKey - Arena key ('standard' or 'large')
 * @returns {Object|null} Arena configuration or null if not found
 */
export function getArenaConfig(arenaKey) {
  return ARENA_CONFIG[arenaKey] || null;
}

/**
 * Get all available arenas
 * @returns {Array<Object>} Array of arena objects with value and label
 */
export function getAllArenas() {
  return Object.entries(ARENA_CONFIG).map(([value, config]) => ({
    value,
    label: config.label
  }));
}

/**
 * Check if arena is large
 * @param {string} arenaKey - Arena key
 * @returns {boolean} True if arena is large
 */
export function isLargeArena(arenaKey) {
  return arenaKey === 'large';
}

