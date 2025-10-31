import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

export class HealthBarManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.healthBars = new Map();
  }

  createHealthBar(target, isPlayer = false) {
    // Create health bar container - use Object3D for simpler updates
    const container = new THREE.Object3D();
    container.userData.target = target;
    container.userData.isPlayer = isPlayer;
    
    // Background bar - dark forest/mystical color matching game theme
    const bgGeo = new THREE.PlaneGeometry(1.0, 0.15);
    const bgMat = new THREE.MeshBasicMaterial({ 
      color: 0x1a3008, // Dark forest green matching game walls
      transparent: true, 
      opacity: 0.8,
      depthWrite: false
    });
    const bgBar = new THREE.Mesh(bgGeo, bgMat);
    bgBar.position.set(0, 0, 0);
    bgBar.renderOrder = 1000; // Render on top
    container.add(bgBar);

    // Health bar - mystical green matching game theme
    const healthGeo = new THREE.PlaneGeometry(0.96, 0.12);
    const healthMat = new THREE.MeshBasicMaterial({ 
      color: 0x6ab89a, // Mystical green matching game UI theme
      transparent: true, 
      opacity: 0.95,
      depthWrite: false
    });
    const healthBar = new THREE.Mesh(healthGeo, healthMat);
    healthBar.position.set(-0.48, 0, 0.001); // Slightly in front of background
    healthBar.renderOrder = 1001; // Render above background
    container.add(healthBar);

    container.userData.bgBar = bgBar;
    container.userData.healthBar = healthBar;

    // Position above target
    this.updateHealthBarPosition(container, target);

    this.scene.add(container);
    this.healthBars.set(target, container);

    return container;
  }

  updateHealthBarPosition(healthBarContainer, target) {
    if (!target || !healthBarContainer) return;

    // Position health bar above target - use consistent offset
    const offsetY = 1.8;
    
    // Update position directly
    healthBarContainer.position.copy(target.position);
    healthBarContainer.position.y += offsetY;
  }

  updateHealthBar(healthBarContainer, currentHealth, maxHealth) {
    if (!healthBarContainer || !healthBarContainer.userData) return;

    const healthBar = healthBarContainer.userData.healthBar;
    if (!healthBar) return;

    const healthPercent = Math.max(0, Math.min(1, currentHealth / maxHealth));
    
    // Update width - anchor from left side
    const width = 0.96 * healthPercent;
    healthBar.scale.x = healthPercent;
    healthBar.position.x = -0.48 + (width * 0.5); // Keep left-aligned as it shrinks

    // Update color - mystical theme colors matching game aesthetic
    // High: mystical green, Medium: amber/orange, Low: dark red
    // Always check and update color based on current health thresholds
    let targetColor;
    if (healthPercent > 0.6) {
      targetColor = 0x6ab89a; // Mystical green (matches UI theme)
    } else if (healthPercent > 0.3) {
      targetColor = 0xff8c42; // Amber/orange (matches Herald's color)
    } else {
      targetColor = 0xcc4444; // Dark red (matches gem color from game)
    }
    
    // Only update if color actually changed (to avoid unnecessary updates)
    const currentColor = healthBar.material.color.getHex();
    if (currentColor !== targetColor) {
      healthBar.material.color.setHex(targetColor);
    }

    // Hide if dead
    healthBarContainer.visible = healthPercent > 0;
  }

  setCamera(camera) {
    this.camera = camera;
  }

  update(dt) {
    if (!this.camera) return;
    
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
      // Calculate direction from health bar to camera
      const barPos = healthBarContainer.position;
      const dirX = cameraWorldPosition.x - barPos.x;
      const dirZ = cameraWorldPosition.z - barPos.z;
      const distance = Math.sqrt(dirX * dirX + dirZ * dirZ);
      
      if (distance > 0.001) {
        // Calculate angle - health bar faces camera
        const angle = Math.atan2(dirX, dirZ);
        
        // Use direct rotation assignment (no interpolation) but clamp to prevent rapid changes
        // Only update if angle change is significant (> 0.01 rad ≈ 0.57 degrees)
        const currentAngle = healthBarContainer.rotation.y;
        let angleDiff = angle - currentAngle;
        
        // Normalize angle difference to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        // Only update if change is significant (reduces micro-adjustments that cause flicker)
        if (Math.abs(angleDiff) > 0.01) {
          // Update rotation directly but smoothly
          healthBarContainer.rotation.y = currentAngle + angleDiff * 0.3; // 30% interpolation for smoothness
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

  clearAll() {
    for (const target of this.healthBars.keys()) {
      this.removeHealthBar(target);
    }
    this.healthBars.clear();
  }
}

