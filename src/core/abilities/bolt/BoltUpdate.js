/**
 * BoltUpdate.js
 * 
 * Handles update logic for bolt projectiles including cursor tracking,
 * speed calculation, and position updates.
 * 
 * This file orchestrates the update process by delegating to specialized modules.
 */

import { updateCursorTracking } from './BoltCursorTracking.js';
import { applyCursorFollowing } from './BoltCursorFollowing.js';
import { updateSpeed } from './BoltSpeedCalculation.js';
import { updatePosition } from './BoltPositionUpdate.js';
import { updateVisualEffects } from './BoltVisualEffects.js';

/**
 * Update bolt position and check lifetime
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {number} dt - Delta time in seconds
 * @param {Object} collisionManager - Collision manager for wall checks
 * @param {Object} camera - THREE.js camera (optional, for cursor tracking)
 * @param {Object} inputManager - Input manager (optional, for cursor tracking)
 * @param {Object} playerPosition - Player position vector (optional, for cursor tracking)
 * @returns {boolean} True if projectile should be removed
 */
export function updateBolt(projectile, dt, collisionManager, camera = null, inputManager = null, playerPosition = null) {
  // Update lifetime
  projectile.userData.lifetime += dt;
  
  // Remove if lifetime exceeded
  if (projectile.userData.lifetime >= projectile.userData.maxLifetime) {
    return true;
  }
  
  // Track cursor/joystick target if enabled
  updateCursorTracking(projectile, camera, inputManager, playerPosition);
  
  // Apply cursor following if target is set
  applyCursorFollowing(projectile, dt);
  
  // Calculate and apply speed based on character type
  updateSpeed(projectile, camera, inputManager, playerPosition);
  
  // Update position and check collisions
  const shouldRemove = updatePosition(projectile, dt, collisionManager, playerPosition);
  
  // Update visual effects
  updateVisualEffects(projectile, dt);
  
  return shouldRemove;
}

