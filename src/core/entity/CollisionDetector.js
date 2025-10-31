/**
 * CollisionDetector.js
 * 
 * Handles collision detection between player and entities.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

/**
 * Check player collision with all entities
 * @param {THREE.Vector3} playerPos - Player position
 * @param {number} playerSize - Player size
 * @param {Array<THREE.Mesh>} collectibles - Array of collectible meshes
 * @param {Array<THREE.Group>} hazards - Array of hazard groups
 * @param {Array<THREE.Group>} checkpoints - Array of checkpoint groups
 * @returns {Object} Collision results with collectible, hazard, and checkpoint
 */
export function checkPlayerCollision(playerPos, playerSize, collectibles, hazards, checkpoints) {
  const halfSize = playerSize / 2;
  const playerBox = new THREE.Box3(
    new THREE.Vector3(playerPos.x - halfSize, playerPos.y - 0.5, playerPos.z - halfSize),
    new THREE.Vector3(playerPos.x + halfSize, playerPos.y + 1.5, playerPos.z + halfSize)
  );

  const results = {
    collectible: null,
    hazard: null,
    checkpoint: null
  };

  // Check collectibles
  for (const item of collectibles) {
    // Skip items that are collected or fading out
    if (item.userData.collected || item.userData.fadingOut) continue;
    
    const itemBox = new THREE.Box3().setFromObject(item);
    if (playerBox.intersectsBox(itemBox)) {
      results.collectible = item;
      break;
    }
  }

  // Check hazards
  for (const hazard of hazards) {
    if (!hazard.userData.active) continue;
    
    const hazardBox = new THREE.Box3().setFromObject(hazard);
    if (playerBox.intersectsBox(hazardBox)) {
      results.hazard = hazard;
      break;
    }
  }

  // Check checkpoints
  for (const checkpoint of checkpoints) {
    const checkpointBox = new THREE.Box3().setFromObject(checkpoint);
    if (playerBox.intersectsBox(checkpointBox)) {
      results.checkpoint = checkpoint;
      break;
    }
  }

  return results;
}

