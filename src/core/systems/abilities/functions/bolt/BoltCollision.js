/**
 * BoltCollision.js
 * 
 * Handles collision detection between bolt projectiles and players.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getBaseEntityMovementStats } from '../../../../../config/BaseEntityStats.js';

/**
 * Check if bolt collides with a player
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {THREE.Vector3} playerPos - Player position (sprite center)
 * @param {number} playerSize - Player size (horizontal collision size)
 * @param {string} playerId - Player ID to check against
 * @returns {Object} Collision result with hit, damage, and projectile info
 */
export function checkBoltPlayerCollision(projectile, playerPos, playerSize, playerId) {
  // Don't hit yourself or if already hit something
  if (projectile.userData.playerId === playerId || projectile.userData.hasHit) {
    return { hit: false };
  }
  
  // Get character height from base stats (sprite is 1.2 units tall)
  const playerHeight = getBaseEntityMovementStats().playerHeight;
  const halfHeight = playerHeight / 2; // 0.6 units (sprite center to top/bottom)
  const halfSize = playerSize / 2;
  
  // Create hitbox matching actual sprite dimensions
  // Sprite center is at playerPos.y, sprite extends from playerPos.y - halfHeight to playerPos.y + halfHeight
  const playerBox = new THREE.Box3(
    new THREE.Vector3(playerPos.x - halfSize, playerPos.y - halfHeight, playerPos.z - halfSize),
    new THREE.Vector3(playerPos.x + halfSize, playerPos.y + halfHeight, playerPos.z + halfSize)
  );
  
  const projectileBox = new THREE.Box3().setFromObject(projectile);
  if (playerBox.intersectsBox(projectileBox)) {
    // Mark as hit to prevent multiple damage applications
    projectile.userData.hasHit = true;
    const damage = projectile.userData.damage;
    return { hit: true, damage: damage, projectile: projectile };
  }
  
  return { hit: false };
}

