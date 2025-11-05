/**
 * PerformanceOptimizer.js
 * 
 * Advanced performance optimizations for projectile rendering:
 * - Dynamic LOD (Level of Detail) based on projectile count
 * - Trail light reduction when many projectiles active
 * - Frustum culling for off-screen projectiles
 * - Adaptive update rates
 * - Early culling for out-of-bounds projectiles
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

/**
 * Performance optimization settings
 */
export class PerformanceOptimizer {
  constructor() {
    // Thresholds for different optimization levels
    this.thresholds = {
      low: 20,      // < 20 projectiles: full quality
      medium: 50,   // 20-50 projectiles: reduced quality
      high: 100,    // 50-100 projectiles: medium quality
      extreme: 200  // > 100 projectiles: minimal quality
    };
    
    // Current optimization level
    this.currentLevel = 'low';
    this.activeProjectileCount = 0;
  }

  /**
   * Update optimization level based on active projectile count
   * @param {number} count - Active projectile count
   * @returns {string} Current optimization level
   */
  updateLevel(count) {
    this.activeProjectileCount = count;
    
    if (count < this.thresholds.low) {
      this.currentLevel = 'low';
    } else if (count < this.thresholds.medium) {
      this.currentLevel = 'medium';
    } else if (count < this.thresholds.high) {
      this.currentLevel = 'high';
    } else {
      this.currentLevel = 'extreme';
    }
    
    return this.currentLevel;
  }

  /**
   * Check if trail lights should be enabled
   * @returns {boolean} True if trail lights should be enabled
   */
  shouldEnableTrailLights() {
    // Disable trail lights when many projectiles are active
    return this.currentLevel === 'low' || this.currentLevel === 'medium';
  }

  /**
   * Get trail light intensity multiplier (0.0 - 1.0)
   * @returns {number} Intensity multiplier
   */
  getTrailLightIntensity() {
    switch (this.currentLevel) {
      case 'low': return 1.0;
      case 'medium': return 0.7;
      case 'high': return 0.4;
      case 'extreme': return 0.2;
      default: return 1.0;
    }
  }

  /**
   * Check if particles should be reduced
   * @returns {boolean} True if particles should be reduced
   */
  shouldReduceParticles() {
    return this.currentLevel === 'high' || this.currentLevel === 'extreme';
  }

  /**
   * Get particle spawn rate multiplier (0.0 - 1.0)
   * @returns {number} Particle spawn rate multiplier
   */
  getParticleSpawnRate() {
    switch (this.currentLevel) {
      case 'low': return 1.0;
      case 'medium': return 0.8;
      case 'high': return 0.5;
      case 'extreme': return 0.3;
      default: return 1.0;
    }
  }

  /**
   * Check if update frequency should be reduced
   * @returns {boolean} True if update frequency should be reduced
   */
  shouldReduceUpdateFrequency() {
    return this.currentLevel === 'extreme';
  }

  /**
   * Get update frequency (1.0 = every frame, 0.5 = every other frame, etc.)
   * @returns {number} Update frequency
   */
  getUpdateFrequency() {
    switch (this.currentLevel) {
      case 'low': return 1.0;
      case 'medium': return 1.0;
      case 'high': return 0.8; // Update 80% of projectiles per frame
      case 'extreme': return 0.6; // Update 60% of projectiles per frame
      default: return 1.0;
    }
  }

  /**
   * Check if geometry LOD should be reduced
   * @returns {boolean} True if geometry should use fewer segments
   */
  shouldReduceGeometryLOD() {
    return this.currentLevel === 'extreme';
  }

  /**
   * Get geometry segment multiplier (0.5 = half segments, etc.)
   * @returns {number} Segment multiplier
   */
  getGeometrySegmentMultiplier() {
    switch (this.currentLevel) {
      case 'low': return 1.0;
      case 'medium': return 1.0;
      case 'high': return 0.8;
      case 'extreme': return 0.6;
      default: return 1.0;
    }
  }

  /**
   * Early culling check - remove projectiles that are definitely out of bounds
   * @param {Object} projectile - Projectile mesh
   * @param {number} arenaSize - Arena size
   * @returns {boolean} True if projectile should be culled
   */
  shouldEarlyCull(projectile, arenaSize = 40) {
    const halfArena = arenaSize / 2;
    const margin = 5; // Extra margin for projectiles
    
    // Check if projectile is way out of bounds
    if (Math.abs(projectile.position.x) > halfArena + margin ||
        Math.abs(projectile.position.z) > halfArena + margin) {
      return true;
    }
    
    // Check if projectile is way below ground (fell through map)
    if (projectile.position.y < -10) {
      return true;
    }
    
    return false;
  }

  /**
   * Frustum culling check - check if projectile is in camera view
   * @param {Object} projectile - Projectile mesh
   * @param {Object} camera - THREE.js camera
   * @param {Object} frustum - Optional frustum object (will be created if not provided)
   * @returns {boolean} True if projectile is in view
   */
  isInFrustum(projectile, camera, frustum = null) {
    if (!camera) return true; // If no camera, assume in view
    
    // Create frustum if not provided
    if (!frustum) {
      frustum = new THREE.Frustum();
      const matrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(matrix);
    }
    
    // Check if projectile sphere is in frustum
    const sphere = new THREE.Sphere(projectile.position, projectile.userData.size || 0.1);
    return frustum.intersectsSphere(sphere);
  }
}

