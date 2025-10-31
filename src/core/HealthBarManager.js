import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

export class HealthBarManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.healthBars = new Map();
  }

  createHealthBar(target, isPlayer = false) {
    // Create health bar container
    const container = new THREE.Group();
    container.userData.target = target;
    container.userData.isPlayer = isPlayer;
    
    // Background bar (gray)
    const bgGeo = new THREE.PlaneGeometry(1, 0.15);
    const bgMat = new THREE.MeshBasicMaterial({ 
      color: 0x333333, 
      transparent: true, 
      opacity: 0.8 
    });
    const bgBar = new THREE.Mesh(bgGeo, bgMat);
    bgBar.position.y = 0.05;
    container.add(bgBar);

    // Health bar (green/red)
    const healthGeo = new THREE.PlaneGeometry(1, 0.12);
    const healthMat = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0.9 
    });
    const healthBar = new THREE.Mesh(healthGeo, healthMat);
    healthBar.position.y = 0.05;
    healthBar.position.x = -0.5;
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

    // Position health bar above target - use consistent offset based on player height
    const offsetY = 1.8; // Position above character head
    healthBarContainer.position.set(
      target.position.x,
      target.position.y + offsetY,
      target.position.z
    );
  }

  updateHealthBar(healthBarContainer, currentHealth, maxHealth) {
    if (!healthBarContainer || !healthBarContainer.userData) return;

    const healthBar = healthBarContainer.userData.healthBar;
    if (!healthBar) return;

    const healthPercent = Math.max(0, Math.min(1, currentHealth / maxHealth));
    
    // Update width
    healthBar.scale.x = healthPercent;
    healthBar.position.x = -0.5 + healthPercent * 0.5; // Center as it shrinks

    // Update color (green -> yellow -> red)
    if (healthPercent > 0.6) {
      healthBar.material.color.setHex(0x00ff00); // Green
    } else if (healthPercent > 0.3) {
      healthBar.material.color.setHex(0xffff00); // Yellow
    } else {
      healthBar.material.color.setHex(0xff0000); // Red
    }

    // Hide if dead
    healthBarContainer.visible = healthPercent > 0;
  }

  setCamera(camera) {
    this.camera = camera;
  }

  update(dt) {
    // Update all health bars
    for (const [target, healthBarContainer] of this.healthBars.entries()) {
      if (!target || !target.userData) {
        // Target is gone, remove health bar
        this.removeHealthBar(target);
        continue;
      }

      // Update position
      this.updateHealthBarPosition(healthBarContainer, target);

      // Billboard to camera - only rotate around Y axis to prevent flickering
      if (this.camera) {
        const cameraPos = this.camera.position;
        const barPos = healthBarContainer.position;
        
        // Calculate direction to camera
        const direction = new THREE.Vector3().subVectors(cameraPos, barPos);
        direction.y = 0; // Keep horizontal - only rotate around Y
        
        // Only update rotation if direction has length
        if (direction.length() > 0.001) {
          direction.normalize();
          healthBarContainer.lookAt(
            barPos.x + direction.x,
            barPos.y,
            barPos.z + direction.z
          );
        }
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

