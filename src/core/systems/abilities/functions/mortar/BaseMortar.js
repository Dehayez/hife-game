/**
 * BaseMortar.js
 * 
 * Base implementation for mortar projectiles.
 * Contains the general logic used by all characters.
 * Character-specific behavior can be customized via config functions.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { DEFAULT_MORTAR_CONFIG, MORTAR_GRAVITY, MORTAR_LIFETIME, EXPLOSION_RADIUS, DIRECT_HIT_RADIUS } from '../../../../../config/abilities/base/MortarDefaultConfig.js';
import { createSphereGeometry, createEmissiveMaterial, createProjectileMesh } from '../utils/GeometryUtils.js';
import { createTrailLight } from '../utils/LightUtils.js';
import { normalize2D } from '../utils/VectorUtils.js';

// Re-export config constants for convenience
export { MORTAR_GRAVITY, MORTAR_LIFETIME, EXPLOSION_RADIUS, DIRECT_HIT_RADIUS, DEFAULT_MORTAR_CONFIG };

/**
 * Calculate mortar trajectory
 * @param {THREE.Vector3} startPos - Starting position
 * @param {THREE.Vector3} targetPos - Target position
 * @param {number} arcHeight - Maximum arc height
 * @returns {Object} { launchVelocity, horizontalDistance, totalTime }
 */
export function calculateMortarTrajectory(startPos, targetPos, arcHeight) {
  const dx = targetPos.x - startPos.x;
  const dz = targetPos.z - startPos.z;
  const normalized = normalize2D(dx, dz, 0.1);
  
  if (!normalized) return null;
  
  const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
  
  // Calculate trajectory physics to hit exact target with specified arc height
  const gravity = Math.abs(MORTAR_GRAVITY);
  const timeToPeak = Math.sqrt(2 * arcHeight / gravity);
  const totalTime = timeToPeak * 2; // Time to go up and down
  const horizontalSpeed = horizontalDistance / totalTime;
  const verticalSpeed = gravity * timeToPeak; // Initial vertical velocity
  
  const launchVelocity = new THREE.Vector3(
    normalized.x * horizontalSpeed,
    verticalSpeed,
    normalized.z * horizontalSpeed
  );
  
  return {
    launchVelocity,
    horizontalDistance,
    totalTime
  };
}

/**
 * Create mortar mesh and material
 * @param {Object} stats - Mortar stats
 * @param {number} characterColor - Character color
 * @param {Object} config - Configuration overrides (optional)
 * @returns {THREE.Mesh} Created mesh
 */
export function createMortarMesh(stats, characterColor, config = {}) {
  const cfg = { ...DEFAULT_MORTAR_CONFIG, ...config };
  
  const geometry = createSphereGeometry(stats.size, cfg.geometrySegments);
  const material = createEmissiveMaterial({
    color: characterColor,
    emissiveIntensity: cfg.emissiveIntensity,
    metalness: cfg.metalness,
    roughness: cfg.roughness
  });
  
  return createProjectileMesh({
    geometry,
    material,
    castShadow: true
  });
}

/**
 * Create mortar trail light
 * @param {number} characterColor - Character color
 * @param {THREE.Vector3} position - Light position
 * @param {Object} config - Configuration overrides (optional)
 * @returns {THREE.PointLight} Created light
 */
export function createMortarTrailLight(characterColor, position, config = {}) {
  const cfg = { ...DEFAULT_MORTAR_CONFIG, ...config };
  
  return createTrailLight({
    color: characterColor,
    intensity: cfg.trailLightIntensity,
    range: cfg.trailLightRange,
    position: position
  });
}

/**
 * Create mortar userData object
 * @param {string} playerId - Player ID
 * @param {string} characterName - Character name
 * @param {number} characterColor - Character color
 * @param {Object} stats - Mortar stats
 * @param {THREE.Vector3} launchVelocity - Launch velocity
 * @param {THREE.Vector3} targetPos - Target position
 * @param {THREE.PointLight} trailLight - Trail light object
 * @returns {Object} UserData object
 */
export function createMortarUserData(
  playerId,
  characterName,
  characterColor,
  stats,
  launchVelocity,
  targetPos,
  trailLight
) {
  return {
    type: 'mortar',
    playerId: playerId,
    characterName: characterName,
    characterColor: characterColor,
    velocityX: launchVelocity.x,
    velocityY: launchVelocity.y,
    velocityZ: launchVelocity.z,
    lifetime: 0,
    maxLifetime: MORTAR_LIFETIME,
    trailLight: trailLight,
    damage: stats.damage,
    areaDamage: stats.areaDamage,
    size: stats.size,
    hasExploded: false,
    hitPlayer: false,
    targetX: targetPos.x,
    targetZ: targetPos.z,
    splashRadius: stats.splashRadius,
    fireDuration: stats.fireDuration
  };
}

