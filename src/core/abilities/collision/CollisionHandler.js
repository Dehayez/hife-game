/**
 * CollisionHandler.js
 * 
 * Handles all collision detection between projectiles, mortars, splash areas, and players.
 * Consolidates all collision checking logic in one place.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { checkBoltPlayerCollision } from '../projectile/Bolt.js';
import { checkMortarCollision, checkMortarGroundCollision } from '../mortar/Mortar.js';
import { checkSplashAreaCollision } from '../mortar/SplashArea.js';

/**
 * Check all projectiles for collision with player
 * @param {Array<THREE.Mesh>} projectiles - Array of projectile meshes
 * @param {THREE.Vector3} playerPos - Player position
 * @param {number} playerSize - Player size
 * @param {string} playerId - Player ID
 * @returns {Object} Collision result with hit, damage, and projectile info
 */
export function checkPlayerCollision(projectiles, playerPos, playerSize, playerId) {
  // Check regular projectiles (bolts)
  for (const projectile of projectiles) {
    const result = checkBoltPlayerCollision(projectile, playerPos, playerSize, playerId);
    if (result.hit) {
      return result;
    }
  }
  
  return { hit: false };
}

/**
 * Check all mortars for collision with player (mid-air explosion)
 * @param {Array<THREE.Mesh>} mortars - Array of mortar meshes
 * @param {THREE.Vector3} playerPos - Player position
 * @param {string} playerId - Player ID
 * @param {Object} collisionManager - Collision manager for ground height checks
 * @returns {Object} Collision result with hit, damage, and mortar info
 */
export function checkMortarPlayerCollision(mortars, playerPos, playerId, collisionManager = null) {
  // Check mortars (explosion radius)
  for (const mortar of mortars) {
    const result = checkMortarCollision(mortar, playerPos, playerId, collisionManager);
    if (result.hit) {
      return result;
    }
  }
  
  return { hit: false };
}

/**
 * Check mortar ground impact and splash areas for collision with player
 * @param {Array<THREE.Mesh>} mortars - Array of mortar meshes
 * @param {Array<THREE.Object3D>} splashAreas - Array of splash area containers
 * @param {THREE.Vector3} playerPos - Player position
 * @param {number} playerSize - Player size
 * @param {string} playerId - Player ID
 * @param {Object} collisionManager - Collision manager for ground height checks
 * @returns {Object} Collision result with hit, damage, and source info
 */
export function checkMortarGroundAndSplashCollision(mortars, splashAreas, playerPos, playerSize, playerId, collisionManager = null) {
  // Check mortars that hit ground - direct hit damage
  for (const mortar of mortars) {
    const result = checkMortarGroundCollision(mortar, playerPos, playerId, collisionManager);
    if (result.hit) {
      return result;
    }
  }
  
  // Check splash areas for area damage
  for (const splashArea of splashAreas) {
    const result = checkSplashAreaCollision(splashArea, playerPos, playerId);
    if (result.hit) {
      return result;
    }
  }
  
  return { hit: false };
}

/**
 * Check all projectile types for collision with player
 * Combines regular projectiles, mortars, and splash areas
 * @param {Array<THREE.Mesh>} projectiles - Array of projectile meshes
 * @param {Array<THREE.Mesh>} mortars - Array of mortar meshes
 * @param {Array<THREE.Object3D>} splashAreas - Array of splash area containers
 * @param {THREE.Vector3} playerPos - Player position
 * @param {number} playerSize - Player size
 * @param {string} playerId - Player ID
 * @param {Object} collisionManager - Collision manager for ground height checks
 * @returns {Object} Collision result with hit, damage, and source info
 */
export function checkAllCollisions(projectiles, mortars, splashAreas, playerPos, playerSize, playerId, collisionManager = null) {
  // Check regular projectiles first (fastest response)
  const projectileResult = checkPlayerCollision(projectiles, playerPos, playerSize, playerId);
  if (projectileResult.hit) {
    return projectileResult;
  }
  
  // Check mortars (mid-air explosion) - pass collisionManager for splash detection
  const mortarResult = checkMortarPlayerCollision(mortars, playerPos, playerId, collisionManager);
  if (mortarResult.hit) {
    return mortarResult;
  }
  
  // Check mortar ground impact and splash areas
  const groundResult = checkMortarGroundAndSplashCollision(mortars, splashAreas, playerPos, playerSize, playerId, collisionManager);
  if (groundResult.hit) {
    return groundResult;
  }
  
  return { hit: false };
}

