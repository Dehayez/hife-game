/**
 * CharacterCollisionDetector.js
 * 
 * Handles collision detection between characters (player, bots, remote players).
 * Prevents characters from running through each other.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

/**
 * Check if two character positions would collide
 * @param {THREE.Vector3} pos1 - First character position
 * @param {number} size1 - First character size
 * @param {THREE.Vector3} pos2 - Second character position
 * @param {number} size2 - Second character size
 * @returns {boolean} True if positions would collide
 */
export function checkCharacterCollision(pos1, size1, pos2, size2) {
  const halfSize1 = size1 / 2;
  const halfSize2 = size2 / 2;
  
  // Calculate horizontal distance
  const dx = pos1.x - pos2.x;
  const dz = pos1.z - pos2.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  
  // Check if circles overlap (using horizontal radius)
  const minDistance = halfSize1 + halfSize2;
  
  return distance < minDistance;
}

/**
 * Check if a position would collide with any character
 * @param {THREE.Vector3} position - Position to check
 * @param {number} size - Size of the character at this position
 * @param {THREE.Mesh} player - Player mesh (to exclude from check)
 * @param {Array<THREE.Mesh>} bots - Array of bot meshes
 * @param {Map} remotePlayers - Map of remote players (from RemotePlayerManager)
 * @returns {Object|null} Collision result with colliding entity and push vector, or null
 */
export function checkCharacterCollisions(position, size, player, bots, remotePlayers) {
  const halfSize = size / 2;
  
  // Check collision with player (if different from the moving entity)
  if (player && player.position) {
    const playerPos = player.position;
    const playerSize = player.userData?.size || size; // Use stored size or default
    
    if (checkCharacterCollision(position, size, playerPos, playerSize)) {
      // Calculate push vector (push away from collision)
      const dx = position.x - playerPos.x;
      const dz = position.z - playerPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance > 0.001) { // Avoid division by zero
        const minDistance = halfSize + (playerSize / 2);
        const overlap = minDistance - distance;
        const pushX = (dx / distance) * overlap;
        const pushZ = (dz / distance) * overlap;
        
        return {
          collided: true,
          entity: player,
          pushX,
          pushZ
        };
      }
    }
  }
  
  // Check collision with bots
  if (bots && bots.length > 0) {
    for (const bot of bots) {
      if (!bot || !bot.position || !bot.userData || bot.userData.health <= 0) continue;
      
      const botPos = bot.position;
      const botSize = bot.userData?.size || size; // Use stored size or default
      
      if (checkCharacterCollision(position, size, botPos, botSize)) {
        // Calculate push vector
        const dx = position.x - botPos.x;
        const dz = position.z - botPos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance > 0.001) {
          const minDistance = halfSize + (botSize / 2);
          const overlap = minDistance - distance;
          const pushX = (dx / distance) * overlap;
          const pushZ = (dz / distance) * overlap;
          
          return {
            collided: true,
            entity: bot,
            pushX,
            pushZ
          };
        }
      }
    }
  }
  
  // Check collision with remote players
  if (remotePlayers && remotePlayers.size > 0) {
    for (const [playerId, remotePlayer] of remotePlayers) {
      if (!remotePlayer || !remotePlayer.mesh || !remotePlayer.mesh.position) continue;
      
      const remotePos = remotePlayer.mesh.position;
      const remoteSize = remotePlayer.mesh.userData?.size || size; // Use stored size or default
      
      if (checkCharacterCollision(position, size, remotePos, remoteSize)) {
        // Calculate push vector
        const dx = position.x - remotePos.x;
        const dz = position.z - remotePos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance > 0.001) {
          const minDistance = halfSize + (remoteSize / 2);
          const overlap = minDistance - distance;
          const pushX = (dx / distance) * overlap;
          const pushZ = (dz / distance) * overlap;
          
          return {
            collided: true,
            entity: remotePlayer.mesh,
            pushX,
            pushZ
          };
        }
      }
    }
  }
  
  return null;
}

/**
 * Resolve collision by pushing positions apart
 * @param {THREE.Vector3} pos1 - First character position (will be modified)
 * @param {number} size1 - First character size
 * @param {THREE.Vector3} pos2 - Second character position (will be modified)
 * @param {number} size2 - Second character size
 * @param {number} pushFactor - Factor for how much to push (0-1, default 0.5 for equal push)
 */
export function resolveCharacterCollision(pos1, size1, pos2, size2, pushFactor = 0.5) {
  const halfSize1 = size1 / 2;
  const halfSize2 = size2 / 2;
  
  const dx = pos1.x - pos2.x;
  const dz = pos1.z - pos2.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  const minDistance = halfSize1 + halfSize2;
  
  if (distance < minDistance && distance > 0.001) {
    const overlap = minDistance - distance;
    const pushX = (dx / distance) * overlap;
    const pushZ = (dz / distance) * overlap;
    
    // Push both entities apart proportionally
    pos1.x += pushX * pushFactor;
    pos1.z += pushZ * pushFactor;
    pos2.x -= pushX * (1 - pushFactor);
    pos2.z -= pushZ * (1 - pushFactor);
  }
}


