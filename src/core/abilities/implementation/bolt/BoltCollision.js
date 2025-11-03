/**
 * BoltCollision.js
 * 
 * Handles collision detection between bolt projectiles and players.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

/**
 * Check if bolt collides with a player
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {THREE.Vector3} playerPos - Player position
 * @param {number} playerSize - Player size
 * @param {string} playerId - Player ID to check against
 * @returns {Object} Collision result with hit, damage, and projectile info
 */
export function checkBoltPlayerCollision(projectile, playerPos, playerSize, playerId) {
  // Don't hit yourself or if already hit something
  if (projectile.userData.playerId === playerId || projectile.userData.hasHit) {
    return { hit: false };
  }
  
  const halfSize = playerSize / 2;
  const playerBox = new THREE.Box3(
    new THREE.Vector3(playerPos.x - halfSize, playerPos.y - 0.5, playerPos.z - halfSize),
    new THREE.Vector3(playerPos.x + halfSize, playerPos.y + 1.5, playerPos.z + halfSize)
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

