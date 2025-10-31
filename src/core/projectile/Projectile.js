/**
 * Projectile.js
 * 
 * Handles creation, update, and removal of regular firebolt projectiles.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getFireboltStats, getCharacterColor } from './CharacterStats.js';

/**
 * Create a firebolt projectile
 * @param {Object} scene - THREE.js scene
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position (character height)
 * @param {number} startZ - Starting Z position
 * @param {number} directionX - Direction X component
 * @param {number} directionZ - Direction Z component
 * @param {string} playerId - Player ID ('local' or player identifier)
 * @param {string} characterName - Character name ('lucy' or 'herald')
 * @returns {THREE.Mesh|null} Created projectile mesh or null if on cooldown
 */
export function createProjectile(scene, startX, startY, startZ, directionX, directionZ, playerId, characterName) {
  // Get character-specific firebolt stats
  const stats = getFireboltStats(characterName);
  const characterColor = getCharacterColor(characterName);
  
  // Normalize direction vector
  const dirLength = Math.sqrt(directionX * directionX + directionZ * directionZ);
  if (dirLength < 0.001) return null;
  
  const normX = directionX / dirLength;
  const normZ = directionZ / dirLength;

  // Create projectile geometry and material
  const geo = new THREE.SphereGeometry(stats.size, 8, 8);
  const mat = new THREE.MeshStandardMaterial({
    color: characterColor,
    emissive: characterColor,
    emissiveIntensity: 0.9,
    metalness: 0.7,
    roughness: 0.2
  });
  
  const projectile = new THREE.Mesh(geo, mat);
  projectile.position.set(startX, startY, startZ);
  projectile.castShadow = true;
  
  // Add trail effect - point light with character color
  const trailLight = new THREE.PointLight(characterColor, 1.0, 3);
  trailLight.position.set(startX, startY, startZ);
  scene.add(trailLight);
  
  // Store projectile data with character-specific stats
  projectile.userData = {
    type: 'projectile',
    playerId: playerId,
    characterName: characterName,
    velocityX: normX * stats.projectileSpeed,
    velocityZ: normZ * stats.projectileSpeed,
    lifetime: 0,
    maxLifetime: stats.lifetime,
    trailLight: trailLight,
    damage: stats.damage,
    size: stats.size,
    hasHit: false // Flag to track if projectile has hit something
  };
  
  scene.add(projectile);
  return projectile;
}

/**
 * Update projectile position and check lifetime
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {number} dt - Delta time in seconds
 * @param {Object} collisionManager - Collision manager for wall checks
 * @returns {boolean} True if projectile should be removed
 */
export function updateProjectile(projectile, dt, collisionManager) {
  // Update lifetime
  projectile.userData.lifetime += dt;
  
  // Remove if lifetime exceeded
  if (projectile.userData.lifetime >= projectile.userData.maxLifetime) {
    return true;
  }
  
  // Calculate new position
  const newX = projectile.position.x + projectile.userData.velocityX * dt;
  const newZ = projectile.position.z + projectile.userData.velocityZ * dt;
  
  // Check collision with walls
  let shouldRemove = false;
  if (collisionManager) {
    // Use character-specific size from projectile userData
    const projectileSize = projectile.userData.size || 0.1;
    const nextPos = new THREE.Vector3(newX, projectile.position.y, newZ);
    
    if (collisionManager.willCollide(nextPos, projectileSize)) {
      shouldRemove = true;
    } else {
      projectile.position.x = newX;
      projectile.position.z = newZ;
    }
  } else {
    // Simple arena bounds check (fallback)
    const halfArena = 15; // Default arena size / 2
    if (Math.abs(newX) > halfArena || Math.abs(newZ) > halfArena) {
      shouldRemove = true;
    } else {
      projectile.position.x = newX;
      projectile.position.z = newZ;
    }
  }
  
  // Update trail light position
  if (projectile.userData.trailLight) {
    projectile.userData.trailLight.position.set(
      projectile.position.x,
      projectile.position.y,
      projectile.position.z
    );
  }
  
  // Rotate projectile for visual effect
  projectile.rotation.x += dt * 5;
  projectile.rotation.y += dt * 5;
  
  return shouldRemove;
}

/**
 * Remove projectile from scene and clean up resources
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {Object} scene - THREE.js scene
 */
export function removeProjectile(projectile, scene) {
  // Remove trail light
  if (projectile.userData.trailLight) {
    scene.remove(projectile.userData.trailLight);
  }
  
  // Remove from scene
  scene.remove(projectile);
  
  // Clean up geometry and material
  projectile.geometry.dispose();
  projectile.material.dispose();
}

/**
 * Check if projectile collides with a player
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {THREE.Vector3} playerPos - Player position
 * @param {number} playerSize - Player size
 * @param {string} playerId - Player ID to check against
 * @returns {Object} Collision result with hit, damage, and projectile info
 */
export function checkProjectileCollision(projectile, playerPos, playerSize, playerId) {
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

