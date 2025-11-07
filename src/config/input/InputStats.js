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
    mortar: ['Mouse2'],       // Right mouse button (button 2)
    
    // Ability keys
    characterSwap: ['c', 'C', 'KeyC'],      // C - Character Swap
    heal: ['h', 'H', 'KeyH'],               // H - Heal (hold)
    swordSwing: ['f', 'F', 'KeyF'],         // F - Melee/Sword Swing
    speedBoost: ['e', 'E', 'KeyE']          // E - Speed Boost
  }
};

/**
 * Get key bindings
 * @returns {Object} Key bindings configuration
 */
export function getKeyBindings() {
  return INPUT_STATS.keys;
}

