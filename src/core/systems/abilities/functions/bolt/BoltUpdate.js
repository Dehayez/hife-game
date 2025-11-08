/**
 * BoltUpdate.js
 * 
 * Handles update logic for bolt projectiles including cursor tracking,
 * speed calculation, and position updates.
 * 
 * This file orchestrates the update process by delegating to specialized modules.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { updateCursorTracking } from './BoltCursorTracking.js';
import { applyCursorFollowing } from './BoltCursorFollowing.js';
import { updateSpeed } from './BoltSpeedCalculation.js';
import { updatePosition } from './BoltPositionUpdate.js';
import { updateVisualEffects } from './BoltVisualEffects.js';
import { getProjectileParticleConfig } from '../particles/ParticleConfigHelper.js';

/**
 * Update bolt position and check lifetime
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {number} dt - Delta time in seconds
 * @param {Object} collisionManager - Collision manager for wall checks
 * @param {Object} camera - THREE.js camera (optional, for cursor tracking)
 * @param {Object} inputManager - Input manager (optional, for cursor tracking)
 * @param {Object} playerPosition - Player position vector (optional, for cursor tracking)
 * @returns {boolean} True if projectile should be removed
 */
export function updateBolt(projectile, dt, collisionManager, camera = null, inputManager = null, playerPosition = null) {
  // Update lifetime
  projectile.userData.lifetime += dt;
  
  // Remove if lifetime exceeded
  if (projectile.userData.lifetime >= projectile.userData.maxLifetime) {
    return true;
  }
  
  // Track cursor/joystick target if enabled
  updateCursorTracking(projectile, camera, inputManager, playerPosition);
  
  // Apply cursor following if target is set
  applyCursorFollowing(projectile, dt);
  
  // Calculate and apply speed based on character type
  updateSpeed(projectile, camera, inputManager, playerPosition);
  
  // Update position and check collisions
  const shouldRemove = updatePosition(projectile, dt, collisionManager, playerPosition);
  
  // Update visual effects
  updateVisualEffects(projectile, dt);
  
  // Spawn trail particles while moving
  if (projectile.userData.particleManager && !shouldRemove) {
    // Initialize trail spawn timer if not exists
    if (projectile.userData.trailSpawnTimer === undefined) {
      projectile.userData.trailSpawnTimer = 0;
    }
    
    // Get trail config once (avoid duplicate lookups)
    const trailConfig = getProjectileParticleConfig(
      projectile.userData.characterName || 'lucy',
      'bolt',
      'trail'
    );
    const trailSpawnInterval = trailConfig.spawnInterval !== undefined ? trailConfig.spawnInterval : 0.03;
    const minVelocity = trailConfig.minVelocity !== undefined ? trailConfig.minVelocity : 0.1;
    
    projectile.userData.trailSpawnTimer += dt;
    
    if (projectile.userData.trailSpawnTimer >= trailSpawnInterval) {
      projectile.userData.trailSpawnTimer = 0;
      
      // Calculate velocity vector (reuse cached vector if available)
      if (!projectile.userData._cachedVelocity) {
        projectile.userData._cachedVelocity = new THREE.Vector3();
      }
      projectile.userData._cachedVelocity.set(
        projectile.userData.velocityX,
        0,
        projectile.userData.velocityZ
      );
      
      // Only spawn if moving fast enough
      if (projectile.userData._cachedVelocity.length() > minVelocity) {
        projectile.userData.particleManager.spawnProjectileTrailParticle(
          projectile.position.clone(),
          projectile.userData._cachedVelocity,
          projectile.userData.characterColor,
          projectile.userData.size,
          projectile.userData.characterName || 'lucy',
          'bolt'
        );
      }
    }
    
    // Update ambient particles to follow projectile
    if (projectile.userData.ambientParticles && projectile.userData.ambientParticles.length > 0) {
      projectile.userData.particleManager.updateProjectileAmbientParticles(
        projectile.position.clone(),
        projectile.userData.ambientParticles
      );
    }
  }
  
  return shouldRemove;
}

