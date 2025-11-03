/**
 * BoltCreation.js
 * 
 * Handles creation of bolt projectiles.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getBoltStats, getCharacterColor } from '../stats/CharacterStats.js';
import { BOLT_CONFIG, GENERAL_ABILITY_CONFIG } from '../AbilityConfig.js';
import { createSphereGeometry, createEmissiveMaterial, createProjectileMesh } from '../utils/GeometryUtils.js';
import { createTrailLight } from '../utils/LightUtils.js';
import { normalize2D } from '../utils/VectorUtils.js';

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
  const normalized = normalize2D(directionX, directionZ, GENERAL_ABILITY_CONFIG.minDistance.directionLength);
  if (!normalized) return null;
  
  const { x: normX, z: normZ } = normalized;

  // Create projectile geometry and material
  const geometry = createSphereGeometry(stats.size, BOLT_CONFIG.visual.geometrySegments);
  const material = createEmissiveMaterial({
    color: characterColor,
    emissiveIntensity: BOLT_CONFIG.visual.emissiveIntensity,
    metalness: BOLT_CONFIG.visual.metalness,
    roughness: BOLT_CONFIG.visual.roughness
  });
  
  const projectile = createProjectileMesh({
    geometry,
    material,
    position: new THREE.Vector3(startX, startY, startZ),
    castShadow: true
  });
  
  // Add trail effect - point light with character color
  const trailLight = createTrailLight({
    color: characterColor,
    intensity: BOLT_CONFIG.trailLight.intensity,
    range: BOLT_CONFIG.trailLight.range,
    position: new THREE.Vector3(startX, startY, startZ)
  });
  scene.add(trailLight);
  
  // Calculate initial speed based on acceleration/deceleration pattern
  const baseSpeed = stats.projectileSpeed;
  const minSpeed = (stats.minSpeed !== undefined ? stats.minSpeed : 1.0) * baseSpeed;
  const maxSpeed = (stats.maxSpeed !== undefined ? stats.maxSpeed : 1.0) * baseSpeed;
  
  // Herald: start slow (minSpeed) and continuously accelerate (no max cap)
  // Lucy: start fast (maxSpeed) and decelerate to slow (minSpeed)
  const startSpeed = characterName === 'herald' ? minSpeed : maxSpeed;
  // For Herald, endSpeed can exceed maxSpeed to keep accelerating
  const endSpeed = characterName === 'herald' 
    ? maxSpeed * BOLT_CONFIG.physics.heraldAccelerationMultiplier 
    : minSpeed;
  
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

