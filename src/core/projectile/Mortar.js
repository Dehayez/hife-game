/**
 * Mortar.js
 * 
 * Handles creation, update, and removal of mortar projectiles.
 * Mortars are arc-projectiles that explode on impact creating fire splash areas.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getMortarStats, getCharacterColor } from './CharacterStats.js';

// Global mortar physics constants
const MORTAR_GRAVITY = -20; // Gravity for arc trajectory
const MORTAR_LIFETIME = 5; // Maximum lifetime in seconds
const EXPLOSION_RADIUS = 2.0; // Explosion radius for mid-air detection
const DIRECT_HIT_RADIUS = 0.8; // Small radius for direct hit damage

/**
 * Create a mortar projectile
 * @param {Object} scene - THREE.js scene
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position (character height)
 * @param {number} startZ - Starting Z position
 * @param {number} targetX - Target X position
 * @param {number} targetZ - Target Z position
 * @param {string} playerId - Player ID ('local' or player identifier)
 * @param {string} characterName - Character name ('lucy' or 'herald')
 * @returns {THREE.Mesh|null} Created mortar mesh or null if on cooldown
 */
export function createMortar(scene, startX, startY, startZ, targetX, targetZ, playerId, characterName) {
  // Get character-specific mortar stats
  const stats = getMortarStats(characterName);
  const characterColor = getCharacterColor(characterName);
  
  // Calculate arc trajectory to hit exact target
  const dx = targetX - startX;
  const dz = targetZ - startZ;
  const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
  
  if (horizontalDistance < 0.1) return null;
  
  // Calculate trajectory physics to hit exact target with specified arc height
  // Formula: v_y^2 = 2 * g * h_max, where h_max is arcHeight
  const gravity = Math.abs(MORTAR_GRAVITY);
  const timeToPeak = Math.sqrt(2 * stats.arcHeight / gravity);
  const totalTime = timeToPeak * 2; // Time to go up and down
  const horizontalSpeed = horizontalDistance / totalTime;
  const verticalSpeed = gravity * timeToPeak; // Initial vertical velocity
  
  const launchVelocityX = (dx / horizontalDistance) * horizontalSpeed;
  const launchVelocityZ = (dz / horizontalDistance) * horizontalSpeed;
  const launchVelocityY = verticalSpeed;

  // Create mortar mesh - larger fireball for Herald
  const isHerald = characterName === 'herald';
  const size = stats.size;
  const geo = new THREE.SphereGeometry(size, 12, 12);
  
  // Fireball effect - more intense for Herald
  const mat = new THREE.MeshStandardMaterial({
    color: characterColor,
    emissive: characterColor,
    emissiveIntensity: isHerald ? 1.2 : 0.8,
    metalness: 0.3,
    roughness: 0.2
  });
  
  const mortar = new THREE.Mesh(geo, mat);
  mortar.position.set(startX, startY, startZ);
  mortar.castShadow = true;
  
  // Enhanced trail effect - brighter for Herald fireball
  const lightIntensity = isHerald ? 5 : 1.2;
  const lightRange = isHerald ? 10 : 4;
  const trailLight = new THREE.PointLight(characterColor, lightIntensity, lightRange);
  trailLight.position.set(startX, startY, startZ);
  scene.add(trailLight);
  
  // Store mortar data with target position for exact landing
  mortar.userData = {
    type: 'mortar',
    playerId: playerId,
    characterName: characterName,
    velocityX: launchVelocityX,
    velocityY: launchVelocityY,
    velocityZ: launchVelocityZ,
    lifetime: 0,
    maxLifetime: MORTAR_LIFETIME,
    trailLight: trailLight,
    damage: stats.damage, // Direct hit damage
    areaDamage: stats.areaDamage, // Area damage per tick
    size: size,
    hasExploded: false,
    hitPlayer: false, // Track if mortar directly hit a player
    targetX: targetX, // Exact target position
    targetZ: targetZ,
    splashRadius: stats.splashRadius,
    fireDuration: stats.fireDuration
  };
  
  scene.add(mortar);
  return mortar;
}

/**
 * Update mortar position and check for ground impact
 * @param {THREE.Mesh} mortar - Mortar mesh
 * @param {number} dt - Delta time in seconds
 * @param {Object} collisionManager - Collision manager for ground height checks
 * @returns {Object|null} Impact data if hit ground, null otherwise
 */
export function updateMortar(mortar, dt, collisionManager) {
  // Update lifetime
  mortar.userData.lifetime += dt;
  
  // Remove if lifetime exceeded
  if (mortar.userData.lifetime >= mortar.userData.maxLifetime) {
    return { shouldRemove: true };
  }
  
  // Update velocity (apply gravity)
  mortar.userData.velocityY += MORTAR_GRAVITY * dt;
  
  // Calculate new position
  const newX = mortar.position.x + mortar.userData.velocityX * dt;
  const newY = mortar.position.y + mortar.userData.velocityY * dt;
  const newZ = mortar.position.z + mortar.userData.velocityZ * dt;
  
  // Get ground height at the mortar's current position
  const currentGroundHeight = collisionManager 
    ? collisionManager.getGroundHeight(mortar.position.x, mortar.position.z, mortar.userData.size)
    : 0;
  
  // Calculate the bottom of the mortar sphere
  const mortarBottom = newY - mortar.userData.size;
  
  // Get target position (where user clicked)
  const targetX = mortar.userData.targetX;
  const targetZ = mortar.userData.targetZ;
  
  // Get ground height at TARGET position (where splash should appear)
  const targetGroundHeight = collisionManager 
    ? collisionManager.getGroundHeight(targetX, targetZ, mortar.userData.size)
    : 0;
  
  // Check if mortar has hit the ground at target position
  const distanceToTarget = Math.sqrt(
    (newX - targetX) ** 2 + 
    (newZ - targetZ) ** 2
  );
  const isMovingDownward = mortar.userData.velocityY < 0;
  const isNearTarget = distanceToTarget < 1.0;
  
  // Only explode if:
  // 1. The bottom of the mortar has reached or passed the ground surface AT TARGET
  // 2. AND we're moving downward (not still ascending)
  // 3. AND we're close to the target position
  // This ensures splash always happens at target location, even if mortar hit player mid-air
  if (mortarBottom <= targetGroundHeight && isMovingDownward && isNearTarget) {
    // Hit ground at target - return impact data for fire splash creation
    return {
      shouldRemove: true,
      impact: {
        x: targetX,  // Always use target position, not current position
        y: targetGroundHeight,
        z: targetZ,  // Always use target position, not current position
        mortarData: mortar.userData
      }
    };
  }
  
  // Update position
  mortar.position.set(newX, newY, newZ);
  
  // Update trail light position
  if (mortar.userData.trailLight) {
    mortar.userData.trailLight.position.set(newX, newY, newZ);
  }
  
  // Rotate mortar for visual effect
  mortar.rotation.x += dt * 3;
  mortar.rotation.y += dt * 3;
  
  return null;
}

/**
 * Remove mortar from scene and clean up resources
 * @param {THREE.Mesh} mortar - Mortar mesh
 * @param {Object} scene - THREE.js scene
 */
export function removeMortar(mortar, scene) {
  // Remove trail light
  if (mortar.userData.trailLight) {
    scene.remove(mortar.userData.trailLight);
  }
  
  // Remove from scene
  scene.remove(mortar);
  
  // Clean up geometry and material
  mortar.geometry.dispose();
  mortar.material.dispose();
}

/**
 * Check if mortar collides with a player (mid-air explosion)
 * @param {THREE.Mesh} mortar - Mortar mesh
 * @param {THREE.Vector3} playerPos - Player position
 * @param {string} playerId - Player ID to check against
 * @param {Object} collisionManager - Collision manager for ground height checks (optional)
 * @returns {Object} Collision result with hit, damage, and mortar info
 */
export function checkMortarCollision(mortar, playerPos, playerId, collisionManager = null) {
  // Don't hit yourself or if already exploded/hit
  if (mortar.userData.playerId === playerId || mortar.userData.hasExploded) {
    return { hit: false };
  }
  
  // Check if mortar is near player (explosion radius)
  const dx = playerPos.x - mortar.position.x;
  const dy = playerPos.y - mortar.position.y;
  const dz = playerPos.z - mortar.position.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  
  if (distance < EXPLOSION_RADIUS) {
    // Mark as exploded to prevent multiple hits
    mortar.userData.hasExploded = true;
    // Mark as hit player so mortar continues to target for splash
    mortar.userData.hitPlayer = true;
    
    // Don't create splash here - let mortar continue to target position
    // The splash will be created at target when mortar hits ground
    const damage = mortar.userData.damage;
    return { hit: true, damage: damage, projectile: mortar, isMortar: true };
  }
  
  return { hit: false };
}

/**
 * Check if player is hit by mortar projectile (direct hit damage)
 * Only checks when mortar is close to impact (actually traveling)
 * @param {THREE.Mesh} mortar - Mortar mesh
 * @param {THREE.Vector3} playerPos - Player position
 * @param {string} playerId - Player ID to check against
 * @param {Object} collisionManager - Collision manager for ground height checks
 * @returns {Object} Collision result with hit, damage, and mortar info
 */
export function checkMortarGroundCollision(mortar, playerPos, playerId, collisionManager = null) {
  // Skip if already exploded or same player
  if (mortar.userData.hasExploded || mortar.userData.playerId === playerId) {
    return { hit: false };
  }
  
  // Only check for direct hit when mortar is actually close to impact
  // Get ground height at mortar's current position
  const currentGroundHeight = collisionManager 
    ? collisionManager.getGroundHeight(mortar.position.x, mortar.position.z, mortar.userData.size)
    : 0;
  
  // Calculate the bottom of the mortar sphere
  const mortarBottom = mortar.position.y - mortar.userData.size;
  
  // Only check for direct hit when mortar is:
  // 1. Close to ground (within 0.5 units) AND moving downward
  // 2. This ensures we only check when the ball is actually about to hit
  const isCloseToGround = mortarBottom <= currentGroundHeight + 0.5;
  const isMovingDownward = mortar.userData.velocityY < 0;
  
  if (!isCloseToGround || !isMovingDownward) {
    return { hit: false };
  }
  
  // Check if player is within direct hit radius of the mortar's ACTUAL position (not target)
  const dx = playerPos.x - mortar.position.x;
  const dy = playerPos.y - mortar.position.y;
  const dz = playerPos.z - mortar.position.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  
  // Use mortar size + a small buffer for direct hit detection
  const hitRadius = mortar.userData.size + DIRECT_HIT_RADIUS;
  
  if (distance < hitRadius) {
    // Direct hit - full damage (ball actually hit the player)
    // Mark as hit but don't create splash here - let it continue to target for splash
    const damage = mortar.userData.damage;
    mortar.userData.hitPlayer = true; // Track that it hit a player
    mortar.userData.hasExploded = true; // Mark as exploded to prevent multiple hits
    
    // Return hit but don't create splash yet - mortar will continue to target
    return { 
      hit: true, 
      damage: damage, 
      projectile: mortar, 
      isMortar: true, 
      isDirectHit: true
    };
  }
  
  return { hit: false };
}

