/**
 * SprintTrailManager.js
 * 
 * Manages visual trail effects when sprinting or moving quickly.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

export class SprintTrailManager {
  constructor(scene) {
    this.scene = scene;
    this.trailParticles = [];
    this.trailInterval = 0.05; // Spawn trail particle every 0.05 seconds
    this.trailTimer = 0;
    this.lastPosition = null;
    this.isActive = false;
  }

  /**
   * Start trail effect
   * @param {THREE.Vector3} position - Current position
   */
  start(position) {
    this.isActive = true;
    this.lastPosition = position.clone();
    this.trailTimer = 0;
  }

  /**
   * Stop trail effect
   */
  stop() {
    this.isActive = false;
  }

  /**
   * Spawn trail particle
   * @param {THREE.Vector3} position - Spawn position
   * @param {number} characterColor - Character color hex
   */
  spawnTrailParticle(position, characterColor) {
    const size = 0.3 + Math.random() * 0.2;
    const geometry = new THREE.PlaneGeometry(size, size);
    
    // Convert hex to Color
    const baseColor = new THREE.Color(characterColor);
    
    // Character color with variation, slightly dimmed
    const particleColor = new THREE.Color(
      Math.min(1, baseColor.r * 0.8 + (Math.random() - 0.5) * 0.2),
      Math.min(1, baseColor.g * 0.8 + (Math.random() - 0.5) * 0.2),
      Math.min(1, baseColor.b * 0.8 + (Math.random() - 0.5) * 0.2)
    );
    
    const material = new THREE.MeshBasicMaterial({
      color: particleColor,
      transparent: true,
      opacity: 0.6 + Math.random() * 0.3,
      side: THREE.DoubleSide,
      alphaTest: 0.05,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    
    const particle = new THREE.Mesh(geometry, material);
    
    // Position at feet level
    particle.position.copy(position);
    particle.position.y = 0.1;
    
    // Add slight random offset
    particle.position.x += (Math.random() - 0.5) * 0.3;
    particle.position.z += (Math.random() - 0.5) * 0.3;
    
    // Initialize particle properties
    particle.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        0.3 + Math.random() * 0.3,
        (Math.random() - 0.5) * 0.5
      ),
      lifetime: 0,
      maxLifetime: 0.4 + Math.random() * 0.2,
      initialSize: size,
      initialOpacity: material.opacity
    };
    
    this.scene.add(particle);
    this.trailParticles.push(particle);
    
    // Limit particle count
    if (this.trailParticles.length > 30) {
      const oldest = this.trailParticles.shift();
      this.scene.remove(oldest);
      oldest.geometry.dispose();
      oldest.material.dispose();
    }
  }

  /**
   * Update trail system
   * @param {number} dt - Delta time in seconds
   * @param {THREE.Vector3} currentPosition - Current character position
   * @param {boolean} isSprinting - Whether character is sprinting
   * @param {number} characterColor - Character color hex
   */
  update(dt, currentPosition, isSprinting, characterColor) {
    // Update trail timer
    if (isSprinting && this.isActive) {
      this.trailTimer += dt;
      
      // Spawn trail particle at intervals
      if (this.trailTimer >= this.trailInterval) {
        this.trailTimer = 0;
        this.spawnTrailParticle(currentPosition, characterColor);
      }
      
      this.lastPosition = currentPosition.clone();
    } else {
      this.isActive = false;
    }
    
    // Update existing trail particles
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const particle = this.trailParticles[i];
      const data = particle.userData;
      
      // Update lifetime
      data.lifetime += dt;
      
      // Remove if expired
      if (data.lifetime >= data.maxLifetime) {
        this.scene.remove(particle);
        particle.geometry.dispose();
        particle.material.dispose();
        this.trailParticles.splice(i, 1);
        continue;
      }
      
      // Update position
      particle.position.add(data.velocity.clone().multiplyScalar(dt));
      
      // Slow down over time
      data.velocity.multiplyScalar(0.95);
      
      // Fade out
      const lifeProgress = data.lifetime / data.maxLifetime;
      particle.material.opacity = data.initialOpacity * (1 - lifeProgress);
      
      // Scale down slightly
      const scale = 1 - lifeProgress * 0.5;
      particle.scale.set(scale, scale, 1);
    }
  }

  /**
   * Billboard particles to camera
   * @param {THREE.Camera} camera - Camera reference
   */
  billboardToCamera(camera) {
    if (!camera || this.trailParticles.length === 0) return;
    
    const cameraWorldPos = new THREE.Vector3();
    camera.getWorldPosition(cameraWorldPos);
    
    for (const particle of this.trailParticles) {
      particle.lookAt(cameraWorldPos);
    }
  }

  /**
   * Clear all trail particles
   */
  clear() {
    for (const particle of this.trailParticles) {
      this.scene.remove(particle);
      particle.geometry.dispose();
      particle.material.dispose();
    }
    this.trailParticles = [];
  }
}

