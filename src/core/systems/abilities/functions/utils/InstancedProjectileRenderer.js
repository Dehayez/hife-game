/**
 * InstancedProjectileRenderer.js
 * 
 * Optimized rendering system for projectiles using THREE.InstancedMesh.
 * Batches multiple projectiles with the same material into a single draw call.
 * 
 * Performance Benefits:
 * - Reduces draw calls from N (one per projectile) to 1 per material group
 * - Significantly improves performance when many projectiles are on screen
 * - Maintains compatibility with existing projectile system (trail lights, particles, etc.)
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getBoltStats } from '../CharacterAbilityStats.js';
import { BOLT_ATTACK_CONFIG } from '../../../../../config/abilities/base/BoltAttackConfig.js';
import { createSphereGeometry, createEmissiveMaterial } from './GeometryUtils.js';

/**
 * InstancedProjectileRenderer
 * Manages instanced rendering for projectiles grouped by material/color
 */
export class InstancedProjectileRenderer {
  /**
   * Create a new InstancedProjectileRenderer
   * @param {Object} scene - THREE.js scene
   * @param {number} maxInstances - Maximum number of instances per group (default: 1000)
   */
  constructor(scene, maxInstances = 1000) {
    this.scene = scene;
    this.maxInstances = maxInstances;
    
    // Map of material key (color) to InstancedMesh group
    this.instanceGroups = new Map();
    
    // Map of projectile ID to instance data
    this.projectileInstances = new Map();
    
    // Next available instance index per group
    this.nextInstanceIndex = new Map();
    
    // Free instance indices per group (for reuse)
    this.freeInstanceIndices = new Map();
    
    // Geometry used for all instances (shared)
    this.geometry = null;
    
    // Temporary matrices for updates
    this.tempMatrix = new THREE.Matrix4();
    this.tempPosition = new THREE.Vector3();
    this.tempRotation = new THREE.Euler();
    this.tempScale = new THREE.Vector3();
  }

  /**
   * Get or create geometry for projectiles
   * Uses a standard size geometry that works for all characters
   * @param {string} characterName - Character name (for stats, used for size calculation)
   * @returns {THREE.BufferGeometry} Shared geometry
   */
  _getGeometry(characterName) {
    if (!this.geometry) {
      // Use average size or max size for geometry (instances can be scaled)
      // For now, use Lucy's size as default (can be adjusted)
      const stats = getBoltStats(characterName || 'lucy');
      this.geometry = createSphereGeometry(stats.size, BOLT_ATTACK_CONFIG.visual.geometrySegments);
    }
    return this.geometry;
  }

  /**
   * Get material key from character color
   * @param {number} color - Character color
   * @returns {string} Material key
   */
  _getMaterialKey(color) {
    return `material_${color.toString(16)}`;
  }

  /**
   * Get or create instance group for a material
   * @param {string} materialKey - Material key
   * @param {number} color - Character color
   * @param {string} characterName - Character name
   * @returns {Object} Instance group with instancedMesh and material
   */
  _getInstanceGroup(materialKey, color, characterName) {
    if (!this.instanceGroups.has(materialKey)) {
      const geometry = this._getGeometry(characterName);
      const material = createEmissiveMaterial({
        color: color,
        emissiveIntensity: BOLT_ATTACK_CONFIG.visual.emissiveIntensity,
        metalness: BOLT_ATTACK_CONFIG.visual.metalness,
        roughness: BOLT_ATTACK_CONFIG.visual.roughness
      });

      const instancedMesh = new THREE.InstancedMesh(
        geometry,
        material,
        this.maxInstances
      );

      instancedMesh.castShadow = true;
      instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      
      // Add to scene
      this.scene.add(instancedMesh);

      this.instanceGroups.set(materialKey, {
        instancedMesh,
        material,
        activeCount: 0,
        instanceData: new Map(), // Map of instance index to projectile ID
        needsMatrixUpdate: false // Track if matrices need GPU upload
      });

      this.nextInstanceIndex.set(materialKey, 0);
      this.freeInstanceIndices.set(materialKey, []);
    }

    return this.instanceGroups.get(materialKey);
  }

  /**
   * Get next available instance index for a group
   * @param {string} materialKey - Material key
   * @returns {number} Instance index
   */
  _getNextInstanceIndex(materialKey) {
    const freeIndices = this.freeInstanceIndices.get(materialKey);
    
    // Reuse free index if available
    if (freeIndices && freeIndices.length > 0) {
      return freeIndices.pop();
    }
    
    // Otherwise use next index
    const nextIndex = this.nextInstanceIndex.get(materialKey) || 0;
    
    if (nextIndex >= this.maxInstances) {
      console.warn(`[InstancedProjectileRenderer] Max instances (${this.maxInstances}) reached for material ${materialKey}`);
      return null;
    }
    
    this.nextInstanceIndex.set(materialKey, nextIndex + 1);
    return nextIndex;
  }

  /**
   * Add a projectile to instanced rendering
   * @param {string} projectileId - Unique projectile ID
   * @param {Object} position - Position {x, y, z}
   * @param {number} color - Character color
   * @param {string} characterName - Character name
   * @returns {Object} Instance data with group and index, or null if failed
   */
  addProjectile(projectileId, position, color, characterName) {
    const materialKey = this._getMaterialKey(color);
    const group = this._getInstanceGroup(materialKey, color, characterName);
    
    if (!group) {
      return null;
    }

    const instanceIndex = this._getNextInstanceIndex(materialKey);
    
    if (instanceIndex === null) {
      return null;
    }

    // Set initial matrix
    this.tempMatrix.makeTranslation(position.x, position.y, position.z);
    group.instancedMesh.setMatrixAt(instanceIndex, this.tempMatrix);
    
    // Mark group as needing update (will be done in batch)
    group.needsMatrixUpdate = true;
    
    // Track instance
    group.instanceData.set(instanceIndex, projectileId);
    group.activeCount++;
    
    this.projectileInstances.set(projectileId, {
      materialKey,
      instanceIndex,
      group,
      lastPosition: { x: position.x, y: position.y, z: position.z }
    });

    return {
      materialKey,
      instanceIndex,
      group
    };
  }

  /**
   * Update projectile position in instanced rendering
   * @param {string} projectileId - Projectile ID
   * @param {Object} position - New position {x, y, z}
   * @returns {boolean} True if position was updated (matrix changed)
   */
  updateProjectile(projectileId, position) {
    const instanceData = this.projectileInstances.get(projectileId);
    
    if (!instanceData) {
      return false;
    }

    const { instanceIndex, group } = instanceData;
    
    // Check if position actually changed (avoid unnecessary updates)
    const lastPos = instanceData.lastPosition;
    if (lastPos && 
        Math.abs(lastPos.x - position.x) < 0.0001 &&
        Math.abs(lastPos.y - position.y) < 0.0001 &&
        Math.abs(lastPos.z - position.z) < 0.0001) {
      return false; // Position hasn't changed significantly
    }
    
    // Update matrix
    this.tempMatrix.makeTranslation(position.x, position.y, position.z);
    group.instancedMesh.setMatrixAt(instanceIndex, this.tempMatrix);
    
    // Store last position for next comparison
    instanceData.lastPosition = { x: position.x, y: position.y, z: position.z };
    
    // Mark group as needing update (will be done in batch at end of frame)
    group.needsMatrixUpdate = true;
    
    return true;
  }

  /**
   * Mark all instance groups as needing matrix update
   * Call this at the end of the update loop to batch upload all changes
   */
  markMatricesForUpdate() {
    for (const [materialKey, group] of this.instanceGroups.entries()) {
      if (group.needsMatrixUpdate) {
        group.instancedMesh.instanceMatrix.needsUpdate = true;
        group.needsMatrixUpdate = false;
      }
    }
  }

  /**
   * Remove projectile from instanced rendering
   * @param {string} projectileId - Projectile ID
   */
  removeProjectile(projectileId) {
    const instanceData = this.projectileInstances.get(projectileId);
    
    if (!instanceData) {
      return;
    }

    const { materialKey, instanceIndex, group } = instanceData;
    
    // Hide instance by setting scale to 0 (more efficient than removing)
    this.tempMatrix.makeScale(0, 0, 0);
    group.instancedMesh.setMatrixAt(instanceIndex, this.tempMatrix);
    group.needsMatrixUpdate = true;
    
    // Remove from tracking
    group.instanceData.delete(instanceIndex);
    group.activeCount--;
    
    // Add to free indices for reuse
    const freeIndices = this.freeInstanceIndices.get(materialKey);
    freeIndices.push(instanceIndex);
    
    this.projectileInstances.delete(projectileId);
  }

  /**
   * Clear all projectiles
   */
  clear() {
    // Remove all instanced meshes from scene
    for (const [materialKey, group] of this.instanceGroups.entries()) {
      this.scene.remove(group.instancedMesh);
      group.material.dispose();
      group.instancedMesh.geometry.dispose();
    }
    
    this.instanceGroups.clear();
    this.projectileInstances.clear();
    this.nextInstanceIndex.clear();
    this.freeInstanceIndices.clear();
  }

  /**
   * Get statistics about instance groups
   * @returns {Object} Statistics
   */
  getStats() {
    const stats = {
      totalGroups: this.instanceGroups.size,
      totalProjectiles: this.projectileInstances.size,
      groups: {}
    };

    for (const [materialKey, group] of this.instanceGroups.entries()) {
      stats.groups[materialKey] = {
        activeCount: group.activeCount,
        maxInstances: this.maxInstances
      };
    }

    return stats;
  }
}

