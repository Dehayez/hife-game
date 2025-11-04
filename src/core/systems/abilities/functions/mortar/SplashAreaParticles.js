/**
 * SplashAreaParticles.js
 * 
 * Handles particle system for splash areas.
 * Extracted from SplashArea.js for better organization.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { SPLASH_AREA_CONFIG } from '../../../../../config/abilities/base/MortarAttackConfig.js';

/**
 * Create splash particle system
 * @param {number} splashRadius - Splash area radius
 * @param {number} characterColor - Character color
 * @returns {Object} { particles, velocities, lifetimes, initialLifetimes }
 */
export function createSplashParticles(splashRadius, characterColor) {
  const particleCount = SPLASH_AREA_CONFIG.particles.count;
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);
  const lifetimes = new Float32Array(particleCount);
  const initialLifetimes = new Float32Array(particleCount);
  
  // Initialize particles
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    // Random position within splash radius - start slightly above splash base
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * splashRadius;
    positions[i3] = radius * Math.cos(angle);
    positions[i3 + 1] = SPLASH_AREA_CONFIG.particles.spawnHeight;
    positions[i3 + 2] = radius * Math.sin(angle);
    
    // Slow upward velocity for splash-like effect with gentle turbulence
    const drift = SPLASH_AREA_CONFIG.particles.horizontalDrift;
    velocities[i3] = (Math.random() - 0.5) * drift;
    velocities[i3 + 1] = SPLASH_AREA_CONFIG.particles.upwardVelocityMin + 
      Math.random() * (SPLASH_AREA_CONFIG.particles.upwardVelocityMax - SPLASH_AREA_CONFIG.particles.upwardVelocityMin);
    velocities[i3 + 2] = (Math.random() - 0.5) * drift;
    
    // Longer lifetime so particles have time to rise and fade
    const lifetime = SPLASH_AREA_CONFIG.particles.lifetimeMin + 
      Math.random() * (SPLASH_AREA_CONFIG.particles.lifetimeMax - SPLASH_AREA_CONFIG.particles.lifetimeMin);
    lifetimes[i] = 0;
    initialLifetimes[i] = lifetime;
  }
  
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  // Particle size scales with splash radius
  const particleSize = splashRadius * SPLASH_AREA_CONFIG.particles.sizeMultiplier;
  
  const particleMaterial = new THREE.PointsMaterial({
    color: characterColor,
    size: particleSize,
    transparent: true,
    opacity: SPLASH_AREA_CONFIG.particles.baseOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true
  });
  
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  
  return {
    particles,
    velocities,
    lifetimes,
    initialLifetimes
  };
}

/**
 * Update splash particle positions and lifetimes
 * @param {THREE.Object3D} splashArea - Splash area container
 * @param {number} dt - Delta time in seconds
 */
export function updateSplashParticles(splashArea, dt) {
  const particles = splashArea.userData.particles;
  const velocities = splashArea.userData.particleVelocities;
  const lifetimes = splashArea.userData.particleLifetimes;
  const initialLifetimes = splashArea.userData.particleInitialLifetimes;
  const positions = particles.geometry.attributes.position.array;
  
  // Start emitting particles after expansion phase
  if (!splashArea.userData.particleSpawned && splashArea.userData.lifetime >= splashArea.userData.expandDuration) {
    splashArea.userData.particleSpawned = true;
  }
  
  // Update particle positions and lifetimes
  for (let i = 0; i < velocities.length / 3; i++) {
    const i3 = i * 3;
    
    // Only update if particles should be visible
    if (splashArea.userData.particleSpawned && lifetimes[i] < initialLifetimes[i]) {
      // Update lifetime
      lifetimes[i] += dt;
      
      // Move particles upward slowly with gentle turbulence (no gravity)
      positions[i3] += velocities[i3] * dt;
      positions[i3 + 1] += velocities[i3 + 1] * dt;
      positions[i3 + 2] += velocities[i3 + 2] * dt;
      
      // Add gentle turbulence/wiggle to horizontal movement
      const turbulence = SPLASH_AREA_CONFIG.particles.turbulence;
      positions[i3] += (Math.random() - 0.5) * turbulence * dt;
      positions[i3 + 2] += (Math.random() - 0.5) * turbulence * dt;
      
      // Gradually reduce upward velocity (simulates air resistance)
      velocities[i3 + 1] *= (1 - dt * SPLASH_AREA_CONFIG.particles.airResistance);
    }
    // Reset particles that have expired (recycle them)
    else if (splashArea.userData.particleSpawned && lifetimes[i] >= initialLifetimes[i]) {
      // Continue recycling particles during all phases
      const timeUntilRemoval = splashArea.userData.duration - splashArea.userData.lifetime;
      if (timeUntilRemoval > SPLASH_AREA_CONFIG.particles.recycleThreshold) {
        resetParticle(splashArea, i, i3, positions, velocities, lifetimes, initialLifetimes);
      }
    }
  }
  
  particles.geometry.attributes.position.needsUpdate = true;
  
  // Calculate and set particle opacity based on lifetimes and heights
  calculateParticleOpacity(splashArea, particles, velocities, lifetimes, initialLifetimes);
}

/**
 * Reset a particle to spawn position
 * @param {THREE.Object3D} splashArea - Splash area container
 * @param {number} i - Particle index
 * @param {number} i3 - Particle index * 3
 * @param {Float32Array} positions - Position array
 * @param {Float32Array} velocities - Velocity array
 * @param {Float32Array} lifetimes - Lifetime array
 * @param {Float32Array} initialLifetimes - Initial lifetime array
 */
function resetParticle(splashArea, i, i3, positions, velocities, lifetimes, initialLifetimes) {
  // Reset particle to spawn position - use current radius for shrinking phase
  const angle = Math.random() * Math.PI * 2;
  const currentRadius = splashArea.userData.radius || splashArea.userData.initialRadius;
  const radius = Math.random() * currentRadius;
  positions[i3] = radius * Math.cos(angle);
  positions[i3 + 1] = SPLASH_AREA_CONFIG.particles.spawnHeight;
  positions[i3 + 2] = radius * Math.sin(angle);
  
  // Reset velocity
  const drift = SPLASH_AREA_CONFIG.particles.horizontalDrift;
  velocities[i3] = (Math.random() - 0.5) * drift;
  velocities[i3 + 1] = SPLASH_AREA_CONFIG.particles.upwardVelocityMin + 
    Math.random() * (SPLASH_AREA_CONFIG.particles.upwardVelocityMax - SPLASH_AREA_CONFIG.particles.upwardVelocityMin);
  velocities[i3 + 2] = (Math.random() - 0.5) * drift;
  
  // Reset lifetime
  const lifetime = SPLASH_AREA_CONFIG.particles.lifetimeMin + 
    Math.random() * (SPLASH_AREA_CONFIG.particles.lifetimeMax - SPLASH_AREA_CONFIG.particles.lifetimeMin);
  lifetimes[i] = 0;
  initialLifetimes[i] = lifetime;
}

/**
 * Calculate and set particle opacity based on lifetimes and heights
 * @param {THREE.Object3D} splashArea - Splash area container
 * @param {THREE.Points} particles - Particle system
 * @param {Float32Array} velocities - Particle velocities
 * @param {Float32Array} lifetimes - Current particle lifetimes
 * @param {Float32Array} initialLifetimes - Initial particle lifetimes
 */
function calculateParticleOpacity(splashArea, particles, velocities, lifetimes, initialLifetimes) {
  let totalOpacity = 0;
  let activeParticleCount = 0;
  
  if (splashArea.userData.particleSpawned) {
    const positions = particles.geometry.attributes.position.array;
    
    for (let i = 0; i < velocities.length / 3; i++) {
      const i3 = i * 3;
      
      if (lifetimes[i] < initialLifetimes[i]) {
        // Calculate opacity based on lifetime
        const lifetimeProgress = lifetimes[i] / initialLifetimes[i];
        const lifetimeOpacity = Math.max(0, 1.0 - lifetimeProgress);
        
        // Also fade based on height
        const particleHeight = positions[i3 + 1];
        const maxHeight = SPLASH_AREA_CONFIG.particles.maxHeight;
        const heightFade = Math.max(0, Math.min(1.0, 1.0 - (particleHeight / maxHeight)));
        
        // Combine both fade factors
        const particleOpacity = Math.min(lifetimeOpacity, heightFade);
        totalOpacity += particleOpacity;
        activeParticleCount++;
      }
    }
  }
  
  // Set overall particle opacity based on average
  if (activeParticleCount > 0) {
    const averageOpacity = totalOpacity / activeParticleCount;
    
    // Apply splash phase multiplier
    let phaseMultiplier = 1.0;
    if (splashArea.userData.lifetime >= splashArea.userData.shrinkDelay + splashArea.userData.expandDuration) {
      // During shrinking phase, apply additional fade
      const timeSinceShrinkStart = splashArea.userData.lifetime - (splashArea.userData.shrinkDelay + splashArea.userData.expandDuration);
      const shrinkProgress = Math.min(timeSinceShrinkStart / splashArea.userData.shrinkDuration, 1.0);
      phaseMultiplier = 1.0 - shrinkProgress * SPLASH_AREA_CONFIG.particles.shrinkPhaseMultiplier;
    }
    
    // Final fade near end
    const timeUntilRemoval = splashArea.userData.duration - splashArea.userData.lifetime;
    if (timeUntilRemoval <= SPLASH_AREA_CONFIG.particles.finalFadeDuration) {
      phaseMultiplier *= Math.max(0, timeUntilRemoval / SPLASH_AREA_CONFIG.particles.finalFadeDuration);
    }
    
    particles.material.opacity = averageOpacity * phaseMultiplier;
  } else {
    particles.material.opacity = 0;
  }
}

