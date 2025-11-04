/**
 * BoltPositionUpdate.js
 * 
 * Handles position updates and collision checking for bolt projectiles.
 * Extracted from BoltUpdate.js for better organization.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { BOLT_ATTACK_CONFIG } from '../../../../../config/abilities/base/BoltAttackConfig.js';

/**
 * Update projectile position and check collisions
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {number} dt - Delta time in seconds
 * @param {Object} collisionManager - Collision manager
 * @param {Object} playerPosition - Player position vector (for fallback Y calculation)
 * @returns {boolean} True if projectile should be removed
 */
export function updatePosition(projectile, dt, collisionManager, playerPosition) {
  // Calculate new position
  const newX = projectile.position.x + projectile.userData.velocityX * dt;
  const newZ = projectile.position.z + projectile.userData.velocityZ * dt;
  
  // Update Y position to track shooter's height
  let newY = projectile.position.y;
  if (projectile.userData.shooterY !== undefined) {
    newY = projectile.userData.shooterY;
  } else if (playerPosition) {
    newY = playerPosition.y;
  }
  
  // Check collision with walls
  let shouldRemove = false;
  if (collisionManager) {
    const projectileSize = projectile.userData.size || 0.1;
    const nextPos = new THREE.Vector3(newX, newY, newZ);
    
    if (collisionManager.willCollide(nextPos, projectileSize)) {
      shouldRemove = true;
    } else {
      projectile.position.x = newX;
      projectile.position.y = newY;
      projectile.position.z = newZ;
    }
  } else {
    // Simple arena bounds check (fallback)
    const halfArena = BOLT_ATTACK_CONFIG.fallbackArena.halfSize;
    if (Math.abs(newX) > halfArena || Math.abs(newZ) > halfArena) {
      shouldRemove = true;
    } else {
      projectile.position.x = newX;
      projectile.position.y = newY;
      projectile.position.z = newZ;
    }
  }
  
  return shouldRemove;
}

