/**
 * PhysicsConfig.js
 * 
 * Physics configuration for character movement, jumping, and fly.
 * 
 * This file contains all physics-related settings including:
 * - Gravity and jump mechanics
 * - Fly force and cooldown
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
   * Fly Configuration
   */
  flyForce: 30,          // Upward force when flying (reduces gravity effect)
  flyMaxDuration: 1.5,     // Maximum sustained fly time per use (seconds)
  flyCooldownTime: 1,   // Seconds before fly can be used again after duration is reached
  flyRampUpDuration: 0.25  // Time in seconds to ramp up from 0 to full fly force (smooth start)
};

/**
 * Get character physics stats
 * @returns {Object} Physics configuration
 */
export function getCharacterPhysicsStats() {
  return CHARACTER_PHYSICS_CONFIG;
}

