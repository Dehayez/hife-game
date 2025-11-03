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
import { getSmokeStats, getRunningSmokeStats, getCharacterChangeSmokeStats } from './ParticleStats.js';
import { getProjectileParticleConfig } from '../abilities/implementation/particles/ParticleConfigHelper.js';

export class ParticleManager {
  /**
   * Create a new ParticleManager
   * @param {Object} scene - THREE.js scene
   * @param {Object} collisionManager - Optional collision manager for particle collision detection
   */
  constructor(scene, collisionManager = null) {
    this.scene = scene;
    this.collisionManager = collisionManager;
    this.smokeParticles = [];
    
    const stats = getRunningSmokeStats();
    this.maxParticles = stats.maxParticles;
  }

  /**
   * Set the collision manager (can be set after construction)
   * @param {Object} collisionManager - Collision manager instance
   */
  setCollisionManager(collisionManager) {
    this.collisionManager = collisionManager;
  }

  /**
   * Spawn a smoke particle at position
   * @param {THREE.Vector3} position - Spawn position
   * @param {boolean} followCharacter - Whether particle should follow character position (for character changes)
   */
  spawnSmokeParticle(position, followCharacter = false) {
    // Use different stats for character change vs running smoke
    const stats = followCharacter ? getCharacterChangeSmokeStats() : getRunningSmokeStats();
    
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
    
    // Calculate offset from character position
    const offsetX = (Math.random() - 0.5) * stats.horizontalOffset;
    // Use configured vertical offset range (different for running vs character change)
    const offsetY = (Math.random() - 0.5) * stats.verticalOffsetRange;
    const offsetZ = (Math.random() - 0.5) * stats.horizontalOffset;
    
    // Position particle
    if (followCharacter) {
      // For character changes: use character's position (follows character)
      particle.position.copy(position);
      particle.position.x += offsetX;
      particle.position.y += offsetY;
      particle.position.z += offsetZ;
    } else {
      // For running smoke: spawn at character's feet level (works on platforms/objects)
      // Use character's Y position but offset to feet level
      particle.position.set(
        position.x + offsetX,
        position.y + stats.positionY + offsetY, // Character's Y + ground offset + random offset
        position.z + offsetZ
      );
    }
    
    // Store base position and offset for following particles
    const basePosition = followCharacter ? position.clone() : null;
    const positionOffset = followCharacter ? new THREE.Vector3(offsetX, offsetY, offsetZ) : null;
    
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
      initialOpacity: material.opacity,
      followCharacter: followCharacter,
      basePosition: basePosition,
      positionOffset: positionOffset
    };

    this.scene.add(particle);
    this.smokeParticles.push(particle);

    // Remove oldest particles if we exceed max for the current particle type
    const maxParticlesForType = followCharacter ? stats.maxParticles : this.maxParticles;
    if (this.smokeParticles.length > maxParticlesForType) {
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
    // Use running smoke stats for update (drag factor, fade speed, etc. are the same)
    const stats = getRunningSmokeStats();
    
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

      // Skip position update for ambient particles that orbit projectiles (they're updated separately)
      if (data.projectilePosition && data.orbitRadius !== undefined) {
        // Ambient particles orbiting projectiles - skip velocity-based movement
        // They'll be updated by updateProjectileAmbientParticles() instead
        // But still apply fade and scale
      }
      // Update position (skip velocity for sword swing particles - they follow character instead)
      else if (!data.followCharacter) {
        // Calculate next position
        const nextPos = particle.position.clone().add(data.velocity.clone().multiplyScalar(dt));
        
        // Check collision for impact particles (particles that should bounce)
        if (data.isImpactParticle && this.collisionManager) {
          const particleSize = 0.05; // Small size for collision check
          
          // Ensure Y position is reasonable (particles should be at ground level or slightly above)
          const groundY = Math.max(0, particle.position.y);
          nextPos.y = groundY;
          
          // Check if next position would collide
          if (this.collisionManager.willCollide(nextPos, particleSize)) {
            // Reflect velocity off the wall
            // Simple reflection: reflect velocity vector based on collision direction
            // We'll reflect based on which axis has the collision
            
            // Try to determine collision normal by checking each axis separately
            const currentPos = particle.position.clone();
            currentPos.y = groundY;
            
            const testX = new THREE.Vector3(nextPos.x, groundY, currentPos.z);
            const testZ = new THREE.Vector3(currentPos.x, groundY, nextPos.z);
            
            let reflectionApplied = false;
            
            // Check X-axis collision
            if (this.collisionManager.willCollide(testX, particleSize)) {
              data.velocity.x *= -0.5; // Reflect X velocity with damping
              reflectionApplied = true;
            }
            
            // Check Z-axis collision
            if (this.collisionManager.willCollide(testZ, particleSize)) {
              data.velocity.z *= -0.5; // Reflect Z velocity with damping
              reflectionApplied = true;
            }
            
            // If reflection was applied, reduce speed slightly (damping)
            if (reflectionApplied) {
              data.velocity.multiplyScalar(0.8); // Reduce speed after bounce
              // Keep current position instead of moving to next position
              continue;
            }
          }
        }
        
        // Move particle if no collision
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
   * Update particles to follow character position
   * @param {THREE.Vector3} characterPosition - Current character position
   * @param {THREE.Vector3} lastCharacterPosition - Previous character position (for delta movement)
   */
  updateFollowingParticles(characterPosition, lastCharacterPosition) {
    if (!lastCharacterPosition) return;
    
    // Calculate character movement delta
    const deltaX = characterPosition.x - lastCharacterPosition.x;
    const deltaY = characterPosition.y - lastCharacterPosition.y;
    const deltaZ = characterPosition.z - lastCharacterPosition.z;
    
    // Update all particles that follow character (smoke and sword swing particles)
    for (const particle of this.smokeParticles) {
      if (particle.userData.followCharacter) {
        // Move particle by the same delta as the character
        particle.position.x += deltaX;
        particle.position.y += deltaY;
        particle.position.z += deltaZ;
        
        // Update stored base position if available
        if (particle.userData.basePosition) {
          particle.userData.basePosition.add(new THREE.Vector3(deltaX, deltaY, deltaZ));
        }
      }
    }
  }

  /**
   * Update sword swing particles to follow character (legacy method, calls updateFollowingParticles)
   * @param {THREE.Vector3} characterPosition - Current character position
   * @param {THREE.Vector3} lastCharacterPosition - Previous character position (for delta movement)
   */
  updateSwordSwingParticles(characterPosition, lastCharacterPosition) {
    this.updateFollowingParticles(characterPosition, lastCharacterPosition);
  }

  /**
   * Spawn impact particles at position (for projectiles/mortars hitting)
   * @param {THREE.Vector3} position - Impact position
   * @param {number} characterColor - Character color (hex number)
   * @param {number} particleCount - Number of particles (default: 12)
   * @param {number} spreadRadius - Spread radius (default: 0.5)
   */
  spawnImpactParticles(position, characterColor, particleCount = 12, spreadRadius = 0.5) {
    // Convert hex to Color
    const baseColor = new THREE.Color(characterColor);
    
    for (let i = 0; i < particleCount; i++) {
      // Create impact particle
      const size = 0.1 + Math.random() * 0.1;
      const geometry = new THREE.PlaneGeometry(size, size);
      
      // Character color with variation, brighter for impact
      const particleColor = new THREE.Color(
        Math.min(1, baseColor.r + (Math.random() - 0.5) * 0.4),
        Math.min(1, baseColor.g + (Math.random() - 0.5) * 0.4),
        Math.min(1, baseColor.b + (Math.random() - 0.5) * 0.4)
      );
      
      const material = new THREE.MeshBasicMaterial({
        color: particleColor,
        transparent: true,
        opacity: 0.8 + Math.random() * 0.2,
        side: THREE.DoubleSide,
        alphaTest: 0.05,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      
      const particle = new THREE.Mesh(geometry, material);
      
      // Position particle in a sphere around impact point
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * Math.PI * 0.5;
      const distance = Math.random() * spreadRadius;
      
      particle.position.copy(position);
      particle.position.x += Math.cos(angle) * Math.cos(elevation) * distance;
      particle.position.y += Math.sin(elevation) * distance;
      particle.position.z += Math.sin(angle) * Math.cos(elevation) * distance;
      
      // Velocity: outward from impact point
      const speed = 2 + Math.random() * 3;
      const dirX = Math.cos(angle) * Math.cos(elevation);
      const dirY = Math.sin(elevation);
      const dirZ = Math.sin(angle) * Math.cos(elevation);
      
      particle.userData = {
        velocity: new THREE.Vector3(dirX * speed, dirY * speed, dirZ * speed),
        lifetime: 0,
        maxLifetime: 0.3 + Math.random() * 0.2,
        initialSize: size,
        initialOpacity: material.opacity,
        isImpactParticle: true // Mark as impact particle for collision detection
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
   * Spawn death particles at position (character-colored, upward floating particles)
   * @param {THREE.Vector3} position - Spawn position (character position)
   * @param {number} characterColor - Character color (hex number)
   * @param {number} particleCount - Number of particles (default: 20)
   */
  spawnDeathParticles(position, characterColor, particleCount = 20) {
    // Convert hex to Color
    const baseColor = new THREE.Color(characterColor);
    
    for (let i = 0; i < particleCount; i++) {
      // Create death particle - smaller than impact particles
      const size = 0.08 + Math.random() * 0.08;
      const geometry = new THREE.PlaneGeometry(size, size);
      
      // Character color with variation, slightly dimmed
      const particleColor = new THREE.Color(
        Math.min(1, baseColor.r * 0.7 + (Math.random() - 0.5) * 0.3),
        Math.min(1, baseColor.g * 0.7 + (Math.random() - 0.5) * 0.3),
        Math.min(1, baseColor.b * 0.7 + (Math.random() - 0.5) * 0.3)
      );
      
      const material = new THREE.MeshBasicMaterial({
        color: particleColor,
        transparent: true,
        opacity: 0.6 + Math.random() * 0.4,
        side: THREE.DoubleSide,
        alphaTest: 0.05,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      
      const particle = new THREE.Mesh(geometry, material);
      
      // Position particle around character (smaller spread than impact)
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * Math.PI * 0.4; // Less vertical spread
      const distance = Math.random() * 0.3; // Smaller spread radius
      
      particle.position.copy(position);
      particle.position.x += Math.cos(angle) * Math.cos(elevation) * distance;
      particle.position.y += Math.sin(elevation) * distance + 0.3; // Start slightly above character
      particle.position.z += Math.sin(angle) * Math.cos(elevation) * distance;
      
      // Velocity: upward and outward, slower than impact particles
      const speed = 1 + Math.random() * 1.5;
      const dirX = Math.cos(angle) * Math.cos(elevation) * 0.3;
      const dirY = 0.8 + Math.random() * 0.5; // Mostly upward
      const dirZ = Math.sin(angle) * Math.cos(elevation) * 0.3;
      
      particle.userData = {
        velocity: new THREE.Vector3(dirX * speed, dirY * speed, dirZ * speed),
        lifetime: 0,
        maxLifetime: 0.8 + Math.random() * 0.4, // Longer lifetime
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
  }

  /**
   * Spawn projectile trail particle (behind while moving)
   * @param {THREE.Vector3} position - Projectile position
   * @param {THREE.Vector3} velocity - Projectile velocity (for direction)
   * @param {number} characterColor - Character color (hex number)
   * @param {number} projectileSize - Size of the projectile (affects particle size)
   * @param {string} characterName - Character name ('lucy' or 'herald') for config
   * @param {string} abilityName - Ability name ('bolt' or 'mortar') for config
   */
  spawnProjectileTrailParticle(position, velocity, characterColor, projectileSize = 0.1, characterName = 'lucy', abilityName = 'bolt') {
    // Get config for this character and ability
    const config = getProjectileParticleConfig(characterName, abilityName, 'trail');
    
    // Create trail particle with configurable size
    const size = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin);
    const geometry = new THREE.PlaneGeometry(size, size);
    
    // Convert hex to Color
    const baseColor = new THREE.Color(characterColor);
    
    // Character color with variation, slightly dimmed for trail
    const particleColor = new THREE.Color(
      Math.min(1, baseColor.r * 0.9 + (Math.random() - 0.5) * 0.2),
      Math.min(1, baseColor.g * 0.9 + (Math.random() - 0.5) * 0.2),
      Math.min(1, baseColor.b * 0.9 + (Math.random() - 0.5) * 0.2)
    );
    
    const material = new THREE.MeshBasicMaterial({
      color: particleColor,
      transparent: true,
      opacity: config.opacityMin + Math.random() * (config.opacityMax - config.opacityMin),
      side: THREE.DoubleSide,
      alphaTest: 0.05,
      depthWrite: false,
      blending: THREE.AdditiveBlending // Glowing effect
    });
    
    const particle = new THREE.Mesh(geometry, material);
    
    // Position particle behind projectile (opposite direction of velocity)
    const velocityNormalized = velocity.clone().normalize();
    const trailDistance = projectileSize * config.behindDistance;
    
    particle.position.copy(position);
    particle.position.sub(velocityNormalized.clone().multiplyScalar(trailDistance));
    // Add random offset for variation
    particle.position.x += (Math.random() - 0.5) * projectileSize * config.randomOffset;
    particle.position.y += (Math.random() - 0.5) * projectileSize * config.randomOffset;
    particle.position.z += (Math.random() - 0.5) * projectileSize * config.randomOffset;
    
    // Velocity: slight outward from trail direction, with some randomness
    const speed = config.speedMin + Math.random() * (config.speedMax - config.speedMin);
    const velocityOpposite = velocityNormalized.clone().multiplyScalar(-config.backwardDrift);
    const randomDirection = new THREE.Vector3(
      (Math.random() - 0.5) * config.randomDirection,
      (Math.random() - 0.5) * config.randomDirection,
      (Math.random() - 0.5) * config.randomDirection
    );
    const finalVelocity = velocityOpposite.clone().add(randomDirection).normalize().multiplyScalar(speed);
    
    particle.userData = {
      velocity: finalVelocity,
      lifetime: 0,
      maxLifetime: config.lifetimeMin + Math.random() * (config.lifetimeMax - config.lifetimeMin),
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
   * Spawn projectile ambient particles (around the sphere)
   * @param {THREE.Vector3} position - Projectile position
   * @param {number} characterColor - Character color (hex number)
   * @param {number} projectileSize - Size of the projectile (affects particle distribution)
   * @param {number} particleCount - Number of ambient particles (default: 6, overridden by config)
   * @param {string} characterName - Character name ('lucy' or 'herald') for config
   * @param {string} abilityName - Ability name ('bolt' or 'mortar') for config
   * @returns {Array<THREE.Mesh>} Array of created ambient particles
   */
  spawnProjectileAmbientParticles(position, characterColor, projectileSize = 0.1, particleCount = 6, characterName = 'lucy', abilityName = 'bolt') {
    // Get config for this character and ability
    const config = getProjectileParticleConfig(characterName, abilityName, 'ambient');
    
    // Use config particle count if provided, otherwise use passed parameter
    const finalParticleCount = config.particleCount !== undefined ? config.particleCount : particleCount;
    
    // Convert hex to Color
    const baseColor = new THREE.Color(characterColor);
    const particles = [];
    
    for (let i = 0; i < finalParticleCount; i++) {
      // Create ambient particle with configurable size
      const size = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin);
      const geometry = new THREE.PlaneGeometry(size, size);
      
      // Character color with variation, bright for ambient glow
      const particleColor = new THREE.Color(
        Math.min(1, baseColor.r + (Math.random() - 0.5) * 0.3),
        Math.min(1, baseColor.g + (Math.random() - 0.5) * 0.3),
        Math.min(1, baseColor.b + (Math.random() - 0.5) * 0.3)
      );
      
      const material = new THREE.MeshBasicMaterial({
        color: particleColor,
        transparent: true,
        opacity: config.opacityMin + Math.random() * (config.opacityMax - config.opacityMin),
        side: THREE.DoubleSide,
        alphaTest: 0.05,
        depthWrite: false,
        blending: THREE.AdditiveBlending // Glowing effect
      });
      
      const particle = new THREE.Mesh(geometry, material);
      
      // Position particle around projectile sphere (at surface or slightly outside)
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * Math.PI;
      const distance = projectileSize * (config.distanceMin + Math.random() * (config.distanceMax - config.distanceMin));
      
      particle.position.copy(position);
      particle.position.x += Math.cos(angle) * Math.cos(elevation) * distance;
      particle.position.y += Math.sin(elevation) * distance;
      particle.position.z += Math.sin(angle) * Math.cos(elevation) * distance;
      
      // Velocity: slow outward expansion and rotation around projectile
      const outwardSpeed = config.outwardSpeedMin + Math.random() * (config.outwardSpeedMax - config.outwardSpeedMin);
      const outwardDir = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation),
        Math.sin(elevation),
        Math.sin(angle) * Math.cos(elevation)
      );
      
      // Add rotation velocity
      const rotationSpeed = config.rotationSpeedMin + Math.random() * (config.rotationSpeedMax - config.rotationSpeedMin);
      const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
      const finalVelocity = outwardDir.clone().multiplyScalar(outwardSpeed * 0.3).add(tangent.clone().multiplyScalar(rotationSpeed));
      
      particle.userData = {
        velocity: finalVelocity,
        lifetime: 0,
        maxLifetime: config.lifetimeMin + Math.random() * (config.lifetimeMax - config.lifetimeMin),
        initialSize: size,
        initialOpacity: material.opacity,
        projectilePosition: position.clone(), // Store projectile position for orbit effect
        orbitRadius: distance,
        orbitAngle: angle,
        orbitElevation: elevation,
        orbitSpeed: config.orbitSpeed // Store orbit speed for updates
      };
      
      this.scene.add(particle);
      this.smokeParticles.push(particle);
      particles.push(particle); // Track this particle for return
      
      // Remove oldest particles if we exceed max
      if (this.smokeParticles.length > this.maxParticles) {
        const oldest = this.smokeParticles.shift();
        this.scene.remove(oldest);
        oldest.geometry.dispose();
        oldest.material.dispose();
        // Remove from particles array if it's one of ours
        const index = particles.indexOf(oldest);
        if (index > -1) {
          particles.splice(index, 1);
        }
      }
    }
    
    return particles; // Return array of created particles
  }

  /**
   * Update projectile ambient particles to orbit around projectile
   * @param {THREE.Vector3} projectilePosition - Current projectile position
   * @param {THREE.Mesh[]} ambientParticles - Array of ambient particles attached to this projectile
   */
  updateProjectileAmbientParticles(projectilePosition, ambientParticles) {
    if (!ambientParticles || ambientParticles.length === 0) return;
    
    for (const particle of ambientParticles) {
      const data = particle.userData;
      if (!data.projectilePosition || !data.orbitRadius) continue;
      
      // Calculate new orbit position using configurable orbit speed
      const orbitSpeed = data.orbitSpeed !== undefined ? data.orbitSpeed : 0.02;
      const angle = data.orbitAngle + orbitSpeed; // Configurable rotation speed
      const elevation = data.orbitElevation;
      
      // Update orbit angle
      data.orbitAngle = angle;
      
      // Position relative to projectile
      particle.position.copy(projectilePosition);
      particle.position.x += Math.cos(angle) * Math.cos(elevation) * data.orbitRadius;
      particle.position.y += Math.sin(elevation) * data.orbitRadius;
      particle.position.z += Math.sin(angle) * Math.cos(elevation) * data.orbitRadius;
      
      // Update projectile position reference
      data.projectilePosition.copy(projectilePosition);
    }
  }

  /**
   * Remove projectile particles (used when projectile is removed)
   * @param {THREE.Mesh[]} particles - Array of particles to remove
   */
  removeProjectileParticles(particles) {
    if (!particles || particles.length === 0) return;
    
    for (const particle of particles) {
      const index = this.smokeParticles.indexOf(particle);
      if (index > -1) {
        this.scene.remove(particle);
        particle.geometry.dispose();
        particle.material.dispose();
        this.smokeParticles.splice(index, 1);
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

