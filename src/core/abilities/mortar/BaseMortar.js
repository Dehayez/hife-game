/**
 * BaseMortar.js
 * 
 * Base implementation for mortar projectiles.
 * Contains the general logic used by all characters.
 * Character-specific behavior can be customized via config functions.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

// Global mortar physics constants
export const MORTAR_GRAVITY = -20; // Gravity for arc trajectory
export const MORTAR_LIFETIME = 5; // Maximum lifetime in seconds
export const EXPLOSION_RADIUS = 2.0; // Explosion radius for mid-air detection
export const DIRECT_HIT_RADIUS = 0.8; // Small radius for direct hit damage

/**
 * Default mortar creation configuration
 * These are the default behaviors - can be overridden per character
 */
export const DEFAULT_MORTAR_CONFIG = {
  // Visual settings
  geometrySegments: 12,              // Geometry detail level
  emissiveIntensity: 0.8,            // Base emissive intensity (can be boosted per character)
  metalness: 0.3,                    // Material metalness
  roughness: 0.2,                    // Material roughness
  trailLightIntensity: 1.2,          // Base trail light intensity
  trailLightRange: 4,                // Base trail light range
  
  // Movement
  rotationSpeed: 3,                   // Rotation speed per second
};

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
  const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
  
  if (horizontalDistance < 0.1) return null;
  
  // Calculate trajectory physics to hit exact target with specified arc height
  const gravity = Math.abs(MORTAR_GRAVITY);
  const timeToPeak = Math.sqrt(2 * arcHeight / gravity);
  const totalTime = timeToPeak * 2; // Time to go up and down
  const horizontalSpeed = horizontalDistance / totalTime;
  const verticalSpeed = gravity * timeToPeak; // Initial vertical velocity
  
  const launchVelocity = new THREE.Vector3(
    (dx / horizontalDistance) * horizontalSpeed,
    verticalSpeed,
    (dz / horizontalDistance) * horizontalSpeed
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
  
  const geo = new THREE.SphereGeometry(stats.size, cfg.geometrySegments, cfg.geometrySegments);
  const mat = new THREE.MeshStandardMaterial({
    color: characterColor,
    emissive: characterColor,
    emissiveIntensity: cfg.emissiveIntensity,
    metalness: cfg.metalness,
    roughness: cfg.roughness
  });
  
  const mortar = new THREE.Mesh(geo, mat);
  mortar.castShadow = true;
  
  return mortar;
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
  
  const trailLight = new THREE.PointLight(
    characterColor,
    cfg.trailLightIntensity,
    cfg.trailLightRange
  );
  trailLight.position.copy(position);
  
  return trailLight;
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

