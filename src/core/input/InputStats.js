/**
 * InputStats.js
 * 
 * Centralized configuration for all input stats and key bindings.
 * This file provides a clear view of every input stat that can be edited.
 */

/**
 * Input Configuration Stats
 * 
 * All stats related to player movement, speed, and key bindings.
 */
export const INPUT_STATS = {
  /**
   * Movement Configuration
   */
  movement: {
    moveSpeed: 4,              // Base movement speed (units per second)
    runSpeedMultiplier: 1.7     // Speed multiplier when running (shift key)
  },
  
  /**
   * Key Bindings Configuration
   */
  keys: {
    // Movement keys (layout-agnostic using physical key codes)
    up: ['ArrowUp', 'KeyW', 'w', 'W', 'z', 'Z'],      // W or Z (AZERTY)
    down: ['ArrowDown', 'KeyS', 's', 'S'],
    left: ['ArrowLeft', 'KeyA', 'a', 'A', 'q', 'Q'],  // A or Q (AZERTY)
    right: ['ArrowRight', 'KeyD', 'd', 'D'],
    
    // Action keys
    jump: [' '],              // Space
    run: ['Shift'],           // Shift
    shoot: ['Mouse0'],        // Left mouse button (button 0)
    mortar: ['Mouse2']        // Right mouse button (button 2)
  }
};

/**
 * Get movement stats
 * @returns {Object} Movement configuration
 */
export function getMovementStats() {
  return INPUT_STATS.movement;
}

/**
 * Get key bindings
 * @returns {Object} Key bindings configuration
 */
export function getKeyBindings() {
  return INPUT_STATS.keys;
}

