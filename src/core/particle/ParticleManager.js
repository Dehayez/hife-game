/**
 * ParticleManager.js
 * 
 * Main manager for all particle-related functionality.
 * Handles smoke particle creation, updates, and cleanup.
 * 
 * This file acts as a facade, delegating to specialized modules:
 * - ParticleStats.js: Particle stats configuration
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getSmokeStats } from './ParticleStats.js';

export class ParticleManager {
  /**
   * Create a new ParticleManager
   * @param {Object} scene - THREE.js scene
   */
  constructor(scene) {
    this.scene = scene;
    this.smokeParticles = [];
    
    const stats = getSmokeStats();
    this.maxParticles = stats.maxParticles;
  }

  /**
   * Spawn a smoke particle at position
   * @param {THREE.Vector3} position - Spawn position
   */
  spawnSmokeParticle(position) {
    const stats = getSmokeStats();
    
    // Create smoke particle geometry and material
    const size = stats.minSize + Math.random() * (stats.maxSize - stats.minSize);
    const geometry = new THREE.PlaneGeometry(size, size);
    
    // Smoke color - grayish white with slight variation
    const grayValue = stats.minGrayValue + Math.random() * (stats.maxGrayValue - stats.minGrayValue);
    const smokeColor = new THREE.Color(grayValue, grayValue, grayValue);
    
    const material = new THREE.MeshBasicMaterial({
      color: smokeColor,
      transparent: true,
      opacity: stats.minOpacity + Math.random() * (stats.maxOpacity - stats.minOpacity),
      side: THREE.DoubleSide,
      alphaTest: 0.05,
      depthWrite: false // Allow overlapping particles
    });

    const particle = new THREE.Mesh(geometry, material);
    
    // Position particle at character's feet
    particle.position.copy(position);
    particle.position.y = stats.positionY; // Slightly above ground
    
    // Random horizontal offset for variety
    particle.position.x += (Math.random() - 0.5) * stats.horizontalOffset;
    particle.position.z += (Math.random() - 0.5) * stats.horizontalOffset;
    
    // Initialize particle properties
    const velocityX = stats.minVelocityX + Math.random() * (stats.maxVelocityX - stats.minVelocityX);
    const velocityY = stats.minVelocityY + Math.random() * (stats.maxVelocityY - stats.minVelocityY);
    const velocityZ = stats.minVelocityX + Math.random() * (stats.maxVelocityX - stats.minVelocityX);
    const lifetime = stats.minLifetime + Math.random() * (stats.maxLifetime - stats.minLifetime);
    
    particle.userData = {
      velocity: new THREE.Vector3(velocityX, velocityY, velocityZ),
      lifetime: 0,
      maxLifetime: lifetime,
      initialSize: size,
      initialOpacity: material.opacity
    };

    this.scene.add(particle);
    this.smokeParticles.push(particle);

    // Remove oldest particles if we exceed max
    if (this.smokeParticles.length > this.maxParticles) {
      const oldest = this.smokeParticles.shift();
      this.scene.remove(oldest);
      oldest.geometry.dispose();
      oldest.material.dispose();
    }
  }

  /**
   * Update all particles
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    const stats = getSmokeStats();
    
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const particle = this.smokeParticles[i];
      const data = particle.userData;

      // Update lifetime
      data.lifetime += dt;

      // Check if particle should be removed
      if (data.lifetime >= data.maxLifetime) {
        this.scene.remove(particle);
        particle.geometry.dispose();
        particle.material.dispose();
        this.smokeParticles.splice(i, 1);
        continue;
      }

      // Update position
      particle.position.add(data.velocity.clone().multiplyScalar(dt));
      
      // Slow down over time (drag effect)
      data.velocity.multiplyScalar(stats.dragFactor);

      // Fade out over time
      const lifeProgress = data.lifetime / data.maxLifetime;
      particle.material.opacity = data.initialOpacity * (1 - lifeProgress * lifeProgress * stats.fadeSpeed); // Quadratic fade

      // Scale up as it rises (smoke expands)
      const scale = 1 + lifeProgress * stats.scaleGrowth;
      particle.scale.set(scale, scale, 1);

      // Make particle face camera by billboarding
      // This will be handled externally or we can add camera reference
    }

    // Billboard particles to camera (optional, can be done externally)
    // For now, particles are planes facing up
  }

  /**
   * Billboard particles to camera
   * @param {THREE.Camera} camera - Camera reference
   */
  billboardToCamera(camera) {
    if (!camera || this.smokeParticles.length === 0) return;
    
    const cameraWorldPos = new THREE.Vector3();
    camera.getWorldPosition(cameraWorldPos);
    
    for (const particle of this.smokeParticles) {
      // Make particle face camera by looking at camera position
      particle.lookAt(cameraWorldPos);
    }
  }

  /**
   * Clear all particles
   */
  clear() {
    for (const particle of this.smokeParticles) {
      this.scene.remove(particle);
      particle.geometry.dispose();
      particle.material.dispose();
    }
    this.smokeParticles = [];
  }
}

