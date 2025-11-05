/**
 * MaterialCache.js
 * 
 * Caches and reuses materials for projectiles to reduce memory usage and draw calls.
 * Materials are shared by color, reducing the number of unique materials created.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { createEmissiveMaterial } from './GeometryUtils.js';
import { BOLT_ATTACK_CONFIG } from '../../../../../config/abilities/base/BoltAttackConfig.js';

/**
 * MaterialCache
 * Singleton cache for projectile materials
 */
class MaterialCache {
  constructor() {
    this.materials = new Map(); // Map<colorKey, THREE.Material>
  }

  /**
   * Get material key from color
   * @param {number} color - Character color
   * @returns {string} Material key
   */
  _getMaterialKey(color) {
    return `material_${color.toString(16)}`;
  }

  /**
   * Get or create material for a color
   * @param {number} color - Character color
   * @returns {THREE.MeshStandardMaterial} Material
   */
  getMaterial(color) {
    const key = this._getMaterialKey(color);
    
    if (!this.materials.has(key)) {
      const material = createEmissiveMaterial({
        color: color,
        emissiveIntensity: BOLT_ATTACK_CONFIG.visual.emissiveIntensity,
        metalness: BOLT_ATTACK_CONFIG.visual.metalness,
        roughness: BOLT_ATTACK_CONFIG.visual.roughness
      });
      
      this.materials.set(key, material);
    }
    
    return this.materials.get(key);
  }

  /**
   * Clear all materials
   */
  clear() {
    for (const material of this.materials.values()) {
      material.dispose();
    }
    this.materials.clear();
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      materialCount: this.materials.size,
      materials: Array.from(this.materials.keys())
    };
  }
}

// Singleton instance
let materialCacheInstance = null;

/**
 * Get the singleton material cache instance
 * @returns {MaterialCache} Cache instance
 */
export function getMaterialCache() {
  if (!materialCacheInstance) {
    materialCacheInstance = new MaterialCache();
  }
  return materialCacheInstance;
}

/**
 * Reset the singleton instance
 */
export function resetMaterialCache() {
  if (materialCacheInstance) {
    materialCacheInstance.clear();
    materialCacheInstance = null;
  }
}

