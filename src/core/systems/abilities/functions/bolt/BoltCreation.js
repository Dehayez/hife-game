/**
 * BoltCreation.js
 * 
 * Handles creation of bolt projectiles.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getBoltStats, getCharacterColor } from '../CharacterAbilityStats.js';
import { BOLT_ATTACK_CONFIG } from '../../../../../config/abilities/base/BoltAttackConfig.js';
import { GENERAL_ABILITY_CONFIG } from '../../../../../config/abilities/base/MeleeAttackConfig.js';
import { createSphereGeometry, createProjectileMesh } from '../utils/GeometryUtils.js';
import { getMaterialCache } from '../utils/MaterialCache.js';
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
 * @param {Object} particleManager - Optional particle manager for projectile effects
 * @param {boolean} enableTrailLight - Whether to enable trail light (default: true)
 * @returns {THREE.Mesh|null} Created projectile mesh or null if invalid direction
 */
export function createBolt(scene, startX, startY, startZ, directionX, directionZ, playerId, characterName, targetX = null, targetZ = null, particleManager = null, enableTrailLight = true) {
  // Get character-specific bolt stats
  const stats = getBoltStats(characterName);
  const characterColor = getCharacterColor(characterName);
  
  // Normalize direction vector
  const normalized = normalize2D(directionX, directionZ, GENERAL_ABILITY_CONFIG.minDistance.directionLength);
  if (!normalized) return null;
  
  const { x: normX, z: normZ } = normalized;

  // Create projectile geometry and material
  // Use material cache to share materials by color (reduces memory and draw calls)
  const geometry = createSphereGeometry(stats.size, BOLT_ATTACK_CONFIG.visual.geometrySegments);
  const materialCache = getMaterialCache();
  const material = materialCache.getMaterial(characterColor);
  
  const projectile = createProjectileMesh({
    geometry,
    material,
    position: new THREE.Vector3(startX, startY, startZ),
    castShadow: true
  });
  
  // Add trail effect - point light with character color (only if enabled)
  let trailLight = null;
  if (enableTrailLight) {
    trailLight = createTrailLight({
      color: characterColor,
      intensity: BOLT_ATTACK_CONFIG.trailLight.intensity,
      range: BOLT_ATTACK_CONFIG.trailLight.range,
      position: new THREE.Vector3(startX, startY, startZ)
    });
    scene.add(trailLight);
  }
  
  // Calculate initial speed based on acceleration/deceleration pattern
  const baseSpeed = stats.projectileSpeed;
  const minSpeed = (stats.minSpeed !== undefined ? stats.minSpeed : 1.0) * baseSpeed;
  const maxSpeed = (stats.maxSpeed !== undefined ? stats.maxSpeed : 1.0) * baseSpeed;
  
  // Herald: start slow (minSpeed) and continuously accelerate (no max cap)
  // Lucy: start fast (maxSpeed) and decelerate to slow (minSpeed)
  const startSpeed = characterName === 'herald' ? minSpeed : maxSpeed;
  // For Herald, endSpeed can exceed maxSpeed to keep accelerating
  const endSpeed = characterName === 'herald' 
    ? maxSpeed * BOLT_ATTACK_CONFIG.physics.heraldAccelerationMultiplier 
    : minSpeed;
  
  // Create ambient particles around projectile if particle manager available
  let ambientParticles = [];
  if (particleManager) {
    const startPos = new THREE.Vector3(startX, startY, startZ);
    ambientParticles = particleManager.spawnProjectileAmbientParticles(
      startPos,
      characterColor,
      stats.size,
      6, // Default number (will be overridden by config)
      characterName, // Pass character name for config
      'bolt' // Pass ability name for config
    );
  }
  
  // Generate unique projectile ID for multiplayer synchronization
  const projectileId = `projectile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Store projectile data with character-specific stats
  projectile.userData = {
    type: 'projectile',
    projectileId: projectileId, // Unique ID for multiplayer synchronization
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
    shooterY: startY, // Store shooter's Y position (bot or player) to follow their height
    particleManager: particleManager, // Store particle manager for trail particles
    ambientParticles: ambientParticles, // Store ambient particle references (for cleanup)
    lastSyncedPosition: { x: startX, y: startY, z: startZ }, // Store last synced position for remote projectiles
    syncTime: 0 // Time since last sync (for periodic syncing)
  };
  
  // Note: When using instanced rendering, the mesh is kept for logic/collision
  // but the visual rendering is handled by InstancedMesh. The mesh should not
  // be added to the scene when instanced rendering is active.
  // The ProjectileManager will handle adding/removing based on rendering mode.
  // For now, we add it to the scene - ProjectileManager will handle visibility
  
  scene.add(projectile);
  return projectile;
}

