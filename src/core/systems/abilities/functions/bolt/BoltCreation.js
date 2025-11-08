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
  const stats = getBoltStats(characterName);
  const characterColor = getCharacterColor(characterName);
  const normalized = normalize2D(directionX, directionZ, GENERAL_ABILITY_CONFIG.minDistance.directionLength);
  if (!normalized) return null;
  
  const { x: normX, z: normZ } = normalized;
  const startPos = new THREE.Vector3(startX, startY, startZ);
  const geometry = createSphereGeometry(stats.size, BOLT_ATTACK_CONFIG.visual.geometrySegments);
  const material = getMaterialCache().getMaterial(characterColor);
  const projectile = createProjectileMesh({ geometry, material, position: startPos, castShadow: true });
  
  const trailLight = null; // Trail lights disabled for performance
  // if (trailLight) scene.add(trailLight);
  
  const baseSpeed = stats.projectileSpeed;
  const minSpeed = (stats.minSpeed ?? 1.0) * baseSpeed;
  const maxSpeed = (stats.maxSpeed ?? 1.0) * baseSpeed;
  const isHerald = characterName === 'herald';
  const startSpeed = isHerald ? minSpeed : maxSpeed;
  const endSpeed = isHerald ? maxSpeed * BOLT_ATTACK_CONFIG.physics.heraldAccelerationMultiplier : minSpeed;
  
  const ambientParticles = particleManager ? particleManager.spawnProjectileAmbientParticles(
    startPos, characterColor, stats.size, 6, characterName, 'bolt'
  ) : [];
  
  projectile.userData = {
    type: 'projectile',
    projectileId: `projectile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    playerId,
    characterName,
    characterColor,
    baseSpeed,
    startSpeed,
    endSpeed,
    currentMaxSpeed: startSpeed,
    velocityX: normX * startSpeed,
    velocityZ: normZ * startSpeed,
    lifetime: 0,
    maxLifetime: stats.lifetime,
    trailLight,
    damage: stats.damage,
    size: stats.size,
    hasHit: false,
    targetX,
    targetZ,
    cursorFollowStrength: stats.cursorFollowStrength || 0,
    initialDirX: normX,
    initialDirZ: normZ,
    shooterY: startY,
    particleManager,
    ambientParticles,
    lastSyncedPosition: { x: startX, y: startY, z: startZ },
    syncTime: 0
  };
  
  scene.add(projectile);
  return projectile;
}

