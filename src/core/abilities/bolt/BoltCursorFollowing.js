/**
 * BoltCursorFollowing.js
 * 
 * Handles cursor following behavior for bolt projectiles.
 * Extracted from BoltUpdate.js for better organization.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getBoltStats } from '../stats/CharacterAbilityStats.js';
import { BOLT_CONFIG, GENERAL_ABILITY_CONFIG } from '../AbilityConfig.js';
import { normalize2D, calculateSpeed2D } from '../utils/VectorUtils.js';

/**
 * Apply cursor following to projectile velocity
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {number} dt - Delta time in seconds
 */
export function applyCursorFollowing(projectile, dt) {
  const followStrength = projectile.userData.cursorFollowStrength || 0;
  const targetX = projectile.userData.targetX;
  const targetZ = projectile.userData.targetZ;
  
  if (followStrength <= 0 || targetX === null || targetZ === null) {
    return;
  }
  
  // Calculate direction to target
  const toTargetX = targetX - projectile.position.x;
  const toTargetZ = targetZ - projectile.position.z;
  const normalized = normalize2D(toTargetX, toTargetZ, 0.01);
  
  if (!normalized) {
    return;
  }
  
  const { x: targetDirX, z: targetDirZ } = normalized;
  
  // Interpolate between current velocity direction and target direction
  const stats = getBoltStats(projectile.userData.characterName);
  const currentSpeed = calculateSpeed2D(
    projectile.userData.velocityX,
    projectile.userData.velocityZ
  ) || stats.projectileSpeed;
  
  // Get current velocity direction
  const currentDirX = projectile.userData.velocityX / currentSpeed;
  const currentDirZ = projectile.userData.velocityZ / currentSpeed;
  
  // Lerp towards target direction based on follow strength
  const followSpeed = BOLT_CONFIG.cursorFollow.followSpeedMultiplier;
  const newDirX = currentDirX + (targetDirX - currentDirX) * followStrength * dt * followSpeed;
  const newDirZ = currentDirZ + (targetDirZ - currentDirZ) * followStrength * dt * followSpeed;
  
  // Normalize and update velocity
  const normalizedNewDir = normalize2D(newDirX, newDirZ, GENERAL_ABILITY_CONFIG.minDistance.directionLength);
  if (normalizedNewDir) {
    projectile.userData.velocityX = normalizedNewDir.x * currentSpeed;
    projectile.userData.velocityZ = normalizedNewDir.z * currentSpeed;
  }
}

