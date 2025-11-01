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

      // Update position (skip velocity for sword swing particles - they follow character instead)
      if (!data.followCharacter) {
        particle.position.add(data.velocity.clone().multiplyScalar(dt));
        
        // Slow down over time (drag effect)
        data.velocity.multiplyScalar(stats.dragFactor);
      } else {
        // For sword swing particles, apply velocity but they'll also follow character
        particle.position.add(data.velocity.clone().multiplyScalar(dt));
        
        // Slow down over time (drag effect) - less drag for sword swing
        data.velocity.multiplyScalar(0.95); // Slower drag for sword swing
      }

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
   * Spawn a healing particle at position (character color or green, smaller, faster)
   * @param {THREE.Vector3} position - Spawn position
   * @param {number} characterColor - Optional character color (hex number)
   */
  spawnHealingParticle(position, characterColor = null) {
    // Create healing particle geometry and material (smaller than smoke)
    const size = 0.15 + Math.random() * 0.1; // Much smaller than smoke
    const geometry = new THREE.PlaneGeometry(size, size);
    
    // Use character color if provided, otherwise use green with variation
    let particleColor;
    if (characterColor !== null) {
      // Convert hex to Color and add some variation
      const baseColor = new THREE.Color(characterColor);
      particleColor = new THREE.Color(
        baseColor.r + (Math.random() - 0.5) * 0.2,
        baseColor.g + (Math.random() - 0.5) * 0.2,
        baseColor.b + (Math.random() - 0.5) * 0.2
      );
    } else {
      // Healing color - green with variation
      particleColor = new THREE.Color(
        0.3 + Math.random() * 0.2, // R
        0.8 + Math.random() * 0.2, // G - bright green
        0.4 + Math.random() * 0.2  // B
      );
    }
    
    const material = new THREE.MeshBasicMaterial({
      color: particleColor,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      alphaTest: 0.05,
      depthWrite: false
    });

    const particle = new THREE.Mesh(geometry, material);
    
    // Position particle around character
    particle.position.copy(position);
    particle.position.y += Math.random() * 0.3;
    
    // Initialize particle properties (rise faster and fade quicker)
    const stats = getSmokeStats();
    particle.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        0.8 + Math.random() * 0.5, // Rise quickly
        (Math.random() - 0.5) * 0.5
      ),
      lifetime: 0,
      maxLifetime: 0.5 + Math.random() * 0.3, // Shorter lifetime
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
   * Spawn sword swing particles at position (character-colored, circular burst)
   * @param {THREE.Vector3} position - Spawn position (character position)
   * @param {number} characterColor - Character color (hex number)
   * @param {number} radius - Radius of the sword swing (default: 1.0)
   * @param {number} animationDuration - Animation duration in seconds (particles match this duration)
   */
  spawnSwordSwingParticles(position, characterColor, radius = 1.0, animationDuration = 0.5) {
    const particleCount = 16; // Number of particles in the circle
    
    // Convert hex to Color
    const baseColor = new THREE.Color(characterColor);
    
    // Particle size scales with range (15% of range base, with random variation)
    const baseParticleSize = radius * 0.15; // Scale relative to range variable
    
    for (let i = 0; i < particleCount; i++) {
      // Calculate angle for circular distribution
      const angle = (i / particleCount) * Math.PI * 2;
      
      // Create sword swing particle - size scales with range
      const size = baseParticleSize + Math.random() * (baseParticleSize * 0.67); // 15% to 25% of range
      const geometry = new THREE.PlaneGeometry(size, size);
      
      // Character color with slight variation
      const particleColor = new THREE.Color(
        Math.min(1, baseColor.r + (Math.random() - 0.5) * 0.3),
        Math.min(1, baseColor.g + (Math.random() - 0.5) * 0.3),
        Math.min(1, baseColor.b + (Math.random() - 0.5) * 0.3)
      );
      
      const material = new THREE.MeshBasicMaterial({
        color: particleColor,
        transparent: true,
        opacity: 0.9 + Math.random() * 0.1,
        side: THREE.DoubleSide,
        alphaTest: 0.05,
        depthWrite: false
      });
      
      const particle = new THREE.Mesh(geometry, material);
      
      // Position particle in a circle around the character (80-120% of range)
      const offsetX = Math.cos(angle) * radius * (0.8 + Math.random() * 0.4);
      const offsetZ = Math.sin(angle) * radius * (0.8 + Math.random() * 0.4);
      particle.position.copy(position);
      particle.position.x += offsetX;
      particle.position.z += offsetZ;
      particle.position.y = position.y + 0.2 + Math.random() * 0.3;
      
      // Velocity: outward from center - scales with range (so particles spread proportionally)
      // Base speed scales with range: 2.5 units/sec per unit of range, with random variation
      const baseSpeed = 2.5 * radius; // Scale relative to range variable
      const speed = baseSpeed + Math.random() * (baseSpeed * 0.6); // 100-160% of base speed
      const outwardDir = new THREE.Vector3(offsetX, 0, offsetZ).normalize();
      particle.userData = {
        velocity: new THREE.Vector3(
          outwardDir.x * speed,
          0.5 + Math.random() * 0.5, // Slight upward motion
          outwardDir.z * speed
        ),
        lifetime: 0,
        maxLifetime: animationDuration, // Match animation duration
        initialSize: size,
        initialOpacity: material.opacity,
        followCharacter: true // Mark for following character
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
  }

  /**
   * Update sword swing particles to follow character
   * @param {THREE.Vector3} characterPosition - Current character position
   * @param {THREE.Vector3} lastCharacterPosition - Previous character position (for delta movement)
   */
  updateSwordSwingParticles(characterPosition, lastCharacterPosition) {
    if (!lastCharacterPosition) return;
    
    // Calculate character movement delta
    const deltaX = characterPosition.x - lastCharacterPosition.x;
    const deltaY = characterPosition.y - lastCharacterPosition.y;
    const deltaZ = characterPosition.z - lastCharacterPosition.z;
    
    // Update all sword swing particles to follow character movement
    for (const particle of this.smokeParticles) {
      if (particle.userData.followCharacter) {
        // Move particle by the same delta as the character
        particle.position.x += deltaX;
        particle.position.y += deltaY;
        particle.position.z += deltaZ;
      }
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

