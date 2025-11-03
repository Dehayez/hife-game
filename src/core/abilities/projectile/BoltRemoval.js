/**
 * BoltRemoval.js
 * 
 * Handles removal of bolt projectiles from the scene.
 */

/**
 * Remove bolt from scene and clean up resources
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {Object} scene - THREE.js scene
 * @param {Object} particleManager - Optional particle manager for impact effects
 */
export function removeBolt(projectile, scene, particleManager = null) {
  // Spawn impact particles if particle manager available
  if (particleManager && projectile.userData) {
    const characterColor = projectile.userData.characterColor || 0xffaa00;
    particleManager.spawnImpactParticles(
      projectile.position.clone(),
      characterColor,
      12,
      0.5
    );
  }
  
  // Remove trail light
  if (projectile.userData.trailLight) {
    scene.remove(projectile.userData.trailLight);
  }
  
  // Remove from scene
  scene.remove(projectile);
  
  // Clean up geometry and material
  projectile.geometry.dispose();
  projectile.material.dispose();
}

