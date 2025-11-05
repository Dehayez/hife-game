/**
 * HealthBarManager.js
 * 
 * Main manager for health bar rendering and updates.
 * Handles creation, positioning, billboarding, and health display updates.
 * 
 * This file acts as a facade, delegating to specialized modules:
 * - HealthBarStats.js: Health bar stats configuration (colors, sizes, thresholds)
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { 
  getHealthBarSizeStats, 
  getHealthBarColorStats, 
  getHealthBarOpacityStats,
  getHealthBarPositionStats,
  getHealthBarRenderingStats,
  getHealthColor 
} from '../../../config/healthbar/HealthBarStats.js';

export class HealthBarManager {
  /**
   * Create a new HealthBarManager
   * @param {Object} scene - THREE.js scene
   * @param {THREE.Camera} camera - Camera reference for billboarding
   */
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.healthBars = new Map();
  }

  /**
   * Create a health bar for a target
   * @param {THREE.Object3D} target - Target object to track
   * @param {boolean} isPlayer - Whether target is the player
   * @returns {THREE.Object3D} Health bar container
   */
  createHealthBar(target, isPlayer = false) {
    // Check if health bar already exists for this target
    if (this.healthBars.has(target)) {
      // Return existing health bar to prevent duplicates
      return this.healthBars.get(target);
    }
    
    const sizeStats = getHealthBarSizeStats();
    const colorStats = getHealthBarColorStats();
    const opacityStats = getHealthBarOpacityStats();
    const positionStats = getHealthBarPositionStats();
    const renderingStats = getHealthBarRenderingStats();
    
    // Create health bar container
    const container = new THREE.Object3D();
    container.userData.target = target;
    container.userData.isPlayer = isPlayer;
    
    // Background bar - dark forest/mystical color matching game theme
    const bgGeo = new THREE.PlaneGeometry(sizeStats.width, sizeStats.height);
    const bgMat = new THREE.MeshBasicMaterial({ 
      color: colorStats.background,
      transparent: true, 
      opacity: opacityStats.background,
      depthWrite: false
    });
    const bgBar = new THREE.Mesh(bgGeo, bgMat);
    bgBar.position.set(0, 0, 0);
    bgBar.renderOrder = renderingStats.renderOrder.background;
    container.add(bgBar);

    // Health bar - mystical green matching game theme
    const healthGeo = new THREE.PlaneGeometry(sizeStats.healthWidth, sizeStats.healthHeight);
    const healthMat = new THREE.MeshBasicMaterial({ 
      color: colorStats.highHealth,
      transparent: true, 
      opacity: opacityStats.health,
      depthWrite: false
    });
    const healthBar = new THREE.Mesh(healthGeo, healthMat);
    healthBar.position.set(positionStats.healthOffsetX, 0, positionStats.healthOffsetZ);
    healthBar.renderOrder = renderingStats.renderOrder.health;
    container.add(healthBar);

    container.userData.bgBar = bgBar;
    container.userData.healthBar = healthBar;

    // Position above target
    this.updateHealthBarPosition(container, target);

    this.scene.add(container);
    this.healthBars.set(target, container);

    return container;
  }

  /**
   * Update health bar position above target
   * @param {THREE.Object3D} healthBarContainer - Health bar container
   * @param {THREE.Object3D} target - Target object
   */
  updateHealthBarPosition(healthBarContainer, target) {
    if (!target || !healthBarContainer) return;

    const positionStats = getHealthBarPositionStats();
    
    // Position health bar above target - use consistent offset
    healthBarContainer.position.copy(target.position);
    healthBarContainer.position.y += positionStats.offsetY;
  }

  /**
   * Update health bar display
   * @param {THREE.Object3D} healthBarContainer - Health bar container
   * @param {number} currentHealth - Current health value
   * @param {number} maxHealth - Maximum health value
   */
  updateHealthBar(healthBarContainer, currentHealth, maxHealth) {
    if (!healthBarContainer || !healthBarContainer.userData) return;

    const healthBar = healthBarContainer.userData.healthBar;
    if (!healthBar) return;

    const sizeStats = getHealthBarSizeStats();
    const positionStats = getHealthBarPositionStats();
    
    const healthPercent = Math.max(0, Math.min(1, currentHealth / maxHealth));
    
    // Update width - anchor from left side
    const width = sizeStats.healthWidth * healthPercent;
    healthBar.scale.x = healthPercent;
    healthBar.position.x = positionStats.healthOffsetX + (width * 0.5); // Keep left-aligned as it shrinks

    // Update color based on health percentage
    const targetColor = getHealthColor(healthPercent);
    
    // Only update if color actually changed (to avoid unnecessary updates)
    const currentColor = healthBar.material.color.getHex();
    if (currentColor !== targetColor) {
      healthBar.material.color.setHex(targetColor);
    }

    // Hide if dead
    healthBarContainer.visible = healthPercent > 0;
  }

  /**
   * Set the camera reference
   * @param {THREE.Camera} camera - Camera instance
   */
  setCamera(camera) {
    this.camera = camera;
  }

  /**
   * Update all health bars
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    if (!this.camera) return;
    
    const renderingStats = getHealthBarRenderingStats();
    
    // Cache camera world matrix for stability
    this.camera.updateMatrixWorld();
    const cameraWorldPosition = new THREE.Vector3();
    this.camera.getWorldPosition(cameraWorldPosition);
    
    // Update all health bars
    for (const [target, healthBarContainer] of this.healthBars.entries()) {
      if (!target || !target.userData) {
        // Target is gone, remove health bar
        this.removeHealthBar(target);
        continue;
      }

      // Update position
      this.updateHealthBarPosition(healthBarContainer, target);

      // Simple billboard - make health bar always face camera (only rotate around Y)
      const barPos = healthBarContainer.position;
      const dirX = cameraWorldPosition.x - barPos.x;
      const dirZ = cameraWorldPosition.z - barPos.z;
      const distance = Math.sqrt(dirX * dirX + dirZ * dirZ);
      
      if (distance > 0.001) {
        // Calculate angle - health bar faces camera
        const angle = Math.atan2(dirX, dirZ);
        
        // Use direct rotation assignment but clamp to prevent rapid changes
        const currentAngle = healthBarContainer.rotation.y;
        let angleDiff = angle - currentAngle;
        
        // Normalize angle difference to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        // Only update if change is significant
        const angleThreshold = renderingStats.billboard.angleThreshold;
        if (Math.abs(angleDiff) > angleThreshold) {
          // Update rotation with interpolation for smoothness
          const interpolationFactor = renderingStats.billboard.interpolationFactor;
          healthBarContainer.rotation.y = currentAngle + angleDiff * interpolationFactor;
        }
        
        // Keep health bar upright
        healthBarContainer.rotation.x = 0;
        healthBarContainer.rotation.z = 0;
      }

      // Update health display
      const currentHealth = target.userData.health || 0;
      const maxHealth = target.userData.maxHealth || 100;
      this.updateHealthBar(healthBarContainer, currentHealth, maxHealth);
    }
  }

  /**
   * Remove a health bar
   * @param {THREE.Object3D} target - Target object
   */
  removeHealthBar(target) {
    const healthBarContainer = this.healthBars.get(target);
    if (healthBarContainer) {
      this.scene.remove(healthBarContainer);
      
      // Clean up
      if (healthBarContainer.children) {
        healthBarContainer.children.forEach(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
      }
      
      this.healthBars.delete(target);
    }
  }

  /**
   * Clear all health bars
   */
  clearAll() {
    for (const target of this.healthBars.keys()) {
      this.removeHealthBar(target);
    }
    this.healthBars.clear();
  }

  /**
   * Find and remove orphaned health bars from the scene
   * This helps clean up any health bars that were created but not properly tracked
   * @returns {number} Number of orphaned health bars removed
   */
  cleanupOrphanedHealthBars() {
    if (!this.scene) return 0;
    
    let removedCount = 0;
    const trackedHealthBars = new Set();
    
    // Collect all tracked health bar containers
    for (const healthBarContainer of this.healthBars.values()) {
      if (healthBarContainer) {
        trackedHealthBars.add(healthBarContainer);
      }
    }
    
    // Find all health bar containers in the scene that aren't tracked
    const sceneChildren = [...this.scene.children];
    for (const child of sceneChildren) {
      // Check if this looks like a health bar container (has userData.target and userData.isPlayer)
      if (child.userData && 
          (child.userData.target !== undefined || child.userData.isPlayer !== undefined)) {
        // Check if it has health bar structure (bgBar and healthBar)
        const hasHealthBarStructure = child.userData.bgBar && child.userData.healthBar;
        
        if (hasHealthBarStructure && !trackedHealthBars.has(child)) {
          // This is an orphaned health bar - remove it
          this.scene.remove(child);
          
          // Clean up geometry and materials
          if (child.children) {
            child.children.forEach(subChild => {
              if (subChild.geometry) subChild.geometry.dispose();
              if (subChild.material) subChild.material.dispose();
            });
          }
          
          removedCount++;
          console.warn(`Removed orphaned health bar at position (${child.position.x}, ${child.position.y}, ${child.position.z})`);
        }
      }
    }
    
    return removedCount;
  }
}

