/**
 * BoltCreation.js
 * 
 * Handles creation of bolt projectiles.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getBoltStats, getCharacterColor } from '../stats/CharacterStats.js';

/**
 * Create a bolt projectile
 * @param {Object} scene - THREE.js scene
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position (character height)
 * @param {number} startZ - Starting Z position
 * @param {number} directionX - Direction X component
 * @param {number} directionZ - Direction Z component
 * @param {string} playerId - Player ID ('local' or player identifier)
 * @param {string} characterName - Character name ('lucy' or 'herald')
 * @param {number} targetX - Optional target X position for cursor following
 * @param {number} targetZ - Optional target Z position for cursor following
 * @returns {THREE.Mesh|null} Created projectile mesh or null if invalid direction
 */
export function createBolt(scene, startX, startY, startZ, directionX, directionZ, playerId, characterName, targetX = null, targetZ = null) {
  // Get character-specific bolt stats
  const stats = getBoltStats(characterName);
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
  
  // Calculate initial speed based on acceleration/deceleration pattern
  const baseSpeed = stats.projectileSpeed;
  const minSpeed = (stats.minSpeed !== undefined ? stats.minSpeed : 1.0) * baseSpeed;
  const maxSpeed = (stats.maxSpeed !== undefined ? stats.maxSpeed : 1.0) * baseSpeed;
  
  // Herald: start slow (minSpeed) and continuously accelerate (no max cap)
  // Lucy: start fast (maxSpeed) and decelerate to slow (minSpeed)
  const startSpeed = characterName === 'herald' ? minSpeed : maxSpeed;
  // For Herald, endSpeed can exceed maxSpeed to keep accelerating
  const endSpeed = characterName === 'herald' ? maxSpeed * 1.5 : minSpeed; // Herald accelerates 50% beyond maxSpeed
  
  // Store projectile data with character-specific stats
  projectile.userData = {
    type: 'projectile',
    playerId: playerId,
    characterName: characterName,
    characterColor: characterColor, // Store character color for impact effects
    baseSpeed: baseSpeed, // Base speed for reference
    startSpeed: startSpeed, // Starting speed
    endSpeed: endSpeed, // Ending speed
    currentMaxSpeed: startSpeed, // Track maximum speed achieved (can only increase)
    velocityX: normX * startSpeed,
    velocityZ: normZ * startSpeed,
    lifetime: 0,
    maxLifetime: stats.lifetime,
    trailLight: trailLight,
    damage: stats.damage,
    size: stats.size,
    hasHit: false, // Flag to track if projectile has hit something
    targetX: targetX, // Target X position for cursor following
    targetZ: targetZ, // Target Z position for cursor following
    cursorFollowStrength: stats.cursorFollowStrength || 0, // How much to follow cursor
    initialDirX: normX, // Initial shooting direction X
    initialDirZ: normZ, // Initial shooting direction Z
    shooterY: startY // Store shooter's Y position (bot or player) to follow their height
  };
  
  scene.add(projectile);
  return projectile;
}

