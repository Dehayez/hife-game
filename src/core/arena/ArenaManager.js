/**
 * ArenaManager.js
 * 
 * Main manager for arena-related functionality.
 * Handles arena selection and configuration.
 * 
 * This file acts as a facade, delegating to specialized modules:
 * - ArenaConfig.js: Arena configurations
 */

import { getArenaConfig, getAllArenas, isLargeArena } from './ArenaConfig.js';

export class ArenaManager {
  /**
   * Create a new ArenaManager
   */
  constructor() {
    this.currentArena = 'standard'; // 'standard' or 'large'
  }

  /**
   * Get all available arenas
   * @returns {Array<Object>} Array of arena objects with value and label
   */
  getArenas() {
    return getAllArenas();
  }

  /**
   * Get current arena key
   * @returns {string} Current arena key
   */
  getCurrentArena() {
    return this.currentArena;
  }

  /**
   * Set the current arena
   * @param {string} arenaKey - Arena key ('standard' or 'large')
   * @returns {boolean} True if arena was set successfully
   */
  setArena(arenaKey) {
    const config = getArenaConfig(arenaKey);
    if (config) {
      this.currentArena = arenaKey;
      return true;
    }
    return false;
  }

  /**
   * Check if current arena is large
   * @returns {boolean} True if current arena is large
   */
  isLargeArena() {
    return isLargeArena(this.currentArena);
  }
}

