/**
 * BoltVisualEffects.js
 * 
 * Handles visual effects for bolt projectiles (trail light, rotation).
 * Extracted from BoltUpdate.js for better organization.
 */

import { BOLT_CONFIG } from '../AbilityConfig.js';
import { updateTrailLightPosition } from '../utils/LightUtils.js';

/**
 * Update visual effects (trail light and rotation)
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {number} dt - Delta time in seconds
 */
export function updateVisualEffects(projectile, dt) {
  // Update trail light position
  if (projectile.userData.trailLight) {
    updateTrailLightPosition(projectile.userData.trailLight, projectile.position);
  }
  
  // Rotate projectile for visual effect
  const rotationSpeed = BOLT_CONFIG.visual.rotationSpeed;
  projectile.rotation.x += dt * rotationSpeed;
  projectile.rotation.y += dt * rotationSpeed;
}

