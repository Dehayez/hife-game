/**
 * BaseMortar.js
 * 
 * Base implementation for mortar projectiles.
 * Contains the general logic used by all characters.
 * Character-specific behavior can be customized via config functions.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { MORTAR_ATTACK_CONFIG } from '../../config/base/MortarAttackConfig.js';
import { createSphereGeometry, createEmissiveMaterial, createProjectileMesh } from '../utils/GeometryUtils.js';
import { createTrailLight } from '../utils/LightUtils.js';
import { normalize2D } from '../utils/VectorUtils.js';

// Global mortar physics constants (imported from config)
export const MORTAR_GRAVITY = MORTAR_ATTACK_CONFIG.physics.gravity;
export const MORTAR_LIFETIME = MORTAR_ATTACK_CONFIG.physics.lifetime;
export const EXPLOSION_RADIUS = MORTAR_ATTACK_CONFIG.physics.explosionRadius;
export const DIRECT_HIT_RADIUS = MORTAR_ATTACK_CONFIG.physics.directHitRadius;

/**
 * Default mortar creation configuration
 * These are the default behaviors - can be overridden per character
 */
export const DEFAULT_MORTAR_CONFIG = {
  // Visual settings (from config)
  geometrySegments: MORTAR_ATTACK_CONFIG.visual.geometrySegments,
  emissiveIntensity: MORTAR_ATTACK_CONFIG.visual.emissiveIntensity,
  metalness: MORTAR_ATTACK_CONFIG.visual.metalness,
  roughness: MORTAR_ATTACK_CONFIG.visual.roughness,
  trailLightIntensity: MORTAR_ATTACK_CONFIG.trailLight.intensity,
  trailLightRange: MORTAR_ATTACK_CONFIG.trailLight.range,
  
  // Movement
  rotationSpeed: MORTAR_ATTACK_CONFIG.visual.rotationSpeed,
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

