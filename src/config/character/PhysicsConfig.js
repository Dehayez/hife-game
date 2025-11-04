/**
 * PhysicsConfig.js
 * 
 * Physics configuration for character movement, jumping, and levitation.
 * 
 * This file contains all physics-related settings including:
 * - Gravity and jump mechanics
 * - Levitation force and cooldown
 * - Jump cooldown timing
 */

import { getBaseEntityPhysicsStats } from '../global/BaseEntityStats.js';

/**
 * Character Physics Configuration
 * 
 * Extends base entity physics stats with character-specific overrides.
 */
export const CHARACTER_PHYSICS_CONFIG = {
  ...getBaseEntityPhysicsStats(),
  
  /**
   * Jump Configuration
   */
  jumpCooldownTime: 0.6,     // Seconds between jumps (prevents rapid jumping)
  
  /**
   * Levitation Configuration
   */
  levitationForce: 35,       // Upward force when levitating (reduces gravity effect)
  levitationCooldownTime: 0.3 // Seconds between levitation uses
};

/**
 * Get character physics stats
 * @returns {Object} Physics configuration
 */
export function getCharacterPhysicsStats() {
  return CHARACTER_PHYSICS_CONFIG;
}

