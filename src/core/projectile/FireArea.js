/**
 * FireArea.js
 * 
 * Handles creation, update, and removal of fire splash areas after mortar impact.
 * Fire areas deal damage over time to players standing in them.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getCharacterColor } from './CharacterStats.js';

/**
 * Create a fire splash area at impact point
 * @param {Object} scene - THREE.js scene
 * @param {number} x - Impact X position
 * @param {number} y - Impact Y position (ground height)
 * @param {number} z - Impact Z position
 * @param {Object} mortarData - Mortar userData containing stats
 * @returns {THREE.Object3D} Fire area container object
 */
export function createFireSplash(scene, x, y, z, mortarData) {
  const splashRadius = mortarData.splashRadius || 1.0;
  const fireDuration = mortarData.fireDuration || 1.5;
  const shrinkDelay = mortarData.mortarShrinkDelay || 0.5;
  const areaDamage = mortarData.areaDamage || 10;
  const characterColor = mortarData.characterName === 'herald' 
    ? getCharacterColor('herald') 
    : getCharacterColor('lucy');
  
  // Create fire effect container
  const fireContainer = new THREE.Object3D();
  // Position at exact impact point (y is ground height)
  fireContainer.position.set(x, y + 0.05, z); // Slightly above ground
  
  // Create radial gradient texture for opacity (opaque center, transparent edges)
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Opaque center
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // Transparent edges
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  
  const opacityTexture = new THREE.CanvasTexture(canvas);
  opacityTexture.needsUpdate = true;
  
  // Create fire base - glowing circle with radial opacity gradient
  const fireGeo = new THREE.CircleGeometry(splashRadius, 32);
  const fireMat = new THREE.MeshStandardMaterial({
    color: characterColor,
    emissive: characterColor,
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 1.0,
    alphaMap: opacityTexture, // Radial opacity gradient
    side: THREE.DoubleSide,
    metalness: 0.1,
    roughness: 0.9
  });
  const fireBase = new THREE.Mesh(fireGeo, fireMat);
  fireBase.rotation.x = -Math.PI / 2; // Lay flat on ground
  fireBase.scale.set(0, 0, 0); // Start at impact point (scale 0)
  fireContainer.add(fireBase);
  
  // Create fire particle system
  const particleCount = 20;
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);
  const lifetimes = new Float32Array(particleCount);
  const initialLifetimes = new Float32Array(particleCount);
  
  // Initialize particles
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    // Random position within splash radius - start slightly above fire base
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * splashRadius;
    positions[i3] = radius * Math.cos(angle);
    positions[i3 + 1] = 0.1; // Start above fire base circle
    positions[i3 + 2] = radius * Math.sin(angle);
    
    // Slow upward velocity for fire-like effect with gentle turbulence
    velocities[i3] = (Math.random() - 0.5) * 0.2; // Gentle horizontal drift
    velocities[i3 + 1] = 0.3 + Math.random() * 0.2; // Slow upward velocity
    velocities[i3 + 2] = (Math.random() - 0.5) * 0.2; // Gentle horizontal drift
    
    // Longer lifetime so particles have time to rise and fade
    const lifetime = 0.8 + Math.random() * 0.6;
    lifetimes[i] = 0;
    initialLifetimes[i] = lifetime;
  }
  
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const particleMaterial = new THREE.PointsMaterial({
    color: characterColor,
    size: 0.15,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true
  });
  
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  fireContainer.add(particles);
  
  // Add point light for fire glow - positioned at exact impact point
  const isHeraldFire = mortarData.characterName === 'herald';
  const fireLightIntensity = isHeraldFire ? 3.5 : 2.0;
  const fireLightRange = isHeraldFire ? splashRadius * 3 : splashRadius * 2;
  const fireLight = new THREE.PointLight(characterColor, fireLightIntensity, fireLightRange);
  fireLight.position.set(x, y + 0.3, z);
  fireLight.intensity = 0; // Start at 0, fade in during expansion
  scene.add(fireLight); // Add directly to scene at correct position
  
  // Store fire area data with initial radius for shrinking
  fireContainer.userData = {
    type: 'fireSplash',
    damagePerTick: areaDamage,
    initialRadius: splashRadius,
    radius: splashRadius, // Current radius (will shrink)
    lifetime: 0,
    duration: fireDuration,
    shrinkDelay: shrinkDelay,
    shrinkDuration: fireDuration - shrinkDelay,
    expandDuration: 0.2, // Fast expansion animation (0.2 seconds)
    position: new THREE.Vector3(x, y, z), // Exact impact position
    fireLight: fireLight,
    fireLightIntensity: fireLightIntensity,
    fireLightPosition: new THREE.Vector3(x, y + 0.3, z),
    hasDamaged: new Set(), // Track who has been damaged this tick
    particles: particles,
    particleVelocities: velocities,
    particleLifetimes: lifetimes,
    particleInitialLifetimes: initialLifetimes,
    particleGeometry: particleGeometry,
    particleSpawned: false
  };
  
  scene.add(fireContainer);
  return fireContainer;
}

/**
 * Update fire area animation and particle effects
 * @param {THREE.Object3D} fireArea - Fire area container
 * @param {number} dt - Delta time in seconds
 */
export function updateFireArea(fireArea, dt) {
  if (!fireArea || !fireArea.userData) {
    return { shouldRemove: false };
  }
  
  fireArea.userData.lifetime += dt;
  
  const expandDuration = fireArea.userData.expandDuration || 0.2;
  const shrinkDelay = fireArea.userData.shrinkDelay || 0.5;
  const shrinkDuration = fireArea.userData.shrinkDuration || 1.0;
  
  const fireBase = fireArea.children[0];
  if (!fireBase || !fireBase.material) {
    return { shouldRemove: false };
  }
  
  // Phase 1: Expansion animation (fast scale up from impact point)
  if (fireArea.userData.lifetime < expandDuration) {
    const expandProgress = Math.min(fireArea.userData.lifetime / expandDuration, 1.0);
    const expandFactor = expandProgress; // Goes from 0 to 1
    
    // Scale from impact point to full size
    fireBase.scale.set(expandFactor, expandFactor, expandFactor);
    
    // Opacity fades in from 0 to 1 during expansion
    fireBase.material.opacity = expandFactor;
    
    // Light intensity increases during expansion
    if (fireArea.userData.fireLight) {
      const maxIntensity = fireArea.userData.fireLightIntensity || 2.0;
      fireArea.userData.fireLight.intensity = maxIntensity * expandFactor;
      const lightPos = fireArea.userData.fireLightPosition || fireArea.userData.position.clone();
      fireArea.userData.fireLight.position.set(lightPos.x, lightPos.y, lightPos.z);
    }
    
    // Damage radius expands
    fireArea.userData.radius = fireArea.userData.initialRadius * expandFactor;
  }
  // Phase 2: Hold at full size (before shrinking starts)
  else if (fireArea.userData.lifetime < shrinkDelay + expandDuration) {
    // Keep at full size during delay period
    fireBase.scale.set(1.0, 1.0, 1.0);
    fireBase.material.opacity = 1.0;
    if (fireArea.userData.fireLight) {
      const maxIntensity = fireArea.userData.fireLightIntensity || 2.0;
      fireArea.userData.fireLight.intensity = maxIntensity;
      const lightPos = fireArea.userData.fireLightPosition || fireArea.userData.position.clone();
      fireArea.userData.fireLight.position.set(lightPos.x, lightPos.y, lightPos.z);
    }
    fireArea.userData.radius = fireArea.userData.initialRadius;
  }
  // Phase 3: Shrinking phase
  else {
    const timeSinceShrinkStart = fireArea.userData.lifetime - (shrinkDelay + expandDuration);
    const shrinkProgress = Math.min(timeSinceShrinkStart / shrinkDuration, 1.0);
    const shrinkFactor = 1.0 - shrinkProgress; // Start at full size, shrink to 0
    
    // Shrink the fire area uniformly
    fireBase.scale.set(shrinkFactor, shrinkFactor, shrinkFactor);
    
    // Fade opacity while shrinking
    fireBase.material.opacity = shrinkFactor;
    
    // Update damage radius to shrink as well
    fireArea.userData.radius = fireArea.userData.initialRadius * shrinkFactor;
    
    // Fade out light
    if (fireArea.userData.fireLight) {
      const maxIntensity = fireArea.userData.fireLightIntensity || 2.0;
      fireArea.userData.fireLight.intensity = maxIntensity * shrinkFactor;
      const lightPos = fireArea.userData.fireLightPosition || fireArea.userData.position.clone();
      fireArea.userData.fireLight.position.set(lightPos.x, lightPos.y, lightPos.z);
    }
  }
  
  // Update fire particles
  if (fireArea.userData.particles && fireArea.userData.particleVelocities) {
    updateFireParticles(fireArea, dt);
  }
  
  // Check if fire area should be removed
  if (fireArea.userData.lifetime >= fireArea.userData.duration) {
    return { shouldRemove: true };
  }
  
  return { shouldRemove: false };
}

/**
 * Update fire particle positions and lifetimes
 * @param {THREE.Object3D} fireArea - Fire area container
 * @param {number} dt - Delta time in seconds
 */
function updateFireParticles(fireArea, dt) {
  const particles = fireArea.userData.particles;
  const velocities = fireArea.userData.particleVelocities;
  const lifetimes = fireArea.userData.particleLifetimes;
  const initialLifetimes = fireArea.userData.particleInitialLifetimes;
  const positions = particles.geometry.attributes.position.array;
  
  // Start emitting particles after expansion phase
  if (!fireArea.userData.particleSpawned && fireArea.userData.lifetime >= fireArea.userData.expandDuration) {
    fireArea.userData.particleSpawned = true;
  }
  
  // Update particle positions and lifetimes
  for (let i = 0; i < velocities.length / 3; i++) {
    const i3 = i * 3;
    
    // Only update if particles should be visible
    if (fireArea.userData.particleSpawned && lifetimes[i] < initialLifetimes[i]) {
      // Update lifetime
      lifetimes[i] += dt;
      
      // Move particles upward slowly with gentle turbulence (no gravity)
      positions[i3] += velocities[i3] * dt;
      positions[i3 + 1] += velocities[i3 + 1] * dt;
      positions[i3 + 2] += velocities[i3 + 2] * dt;
      
      // Add gentle turbulence/wiggle to horizontal movement
      const turbulence = 0.05;
      positions[i3] += (Math.random() - 0.5) * turbulence * dt;
      positions[i3 + 2] += (Math.random() - 0.5) * turbulence * dt;
      
      // Gradually reduce upward velocity (simulates air resistance)
      velocities[i3 + 1] *= (1 - dt * 0.3);
    }
    // Reset particles that have expired (recycle them)
    else if (fireArea.userData.particleSpawned && lifetimes[i] >= initialLifetimes[i]) {
      // Continue recycling particles during all phases
      const timeUntilRemoval = fireArea.userData.duration - fireArea.userData.lifetime;
      if (timeUntilRemoval > 0.3) {
        // Reset particle to spawn position - use current radius for shrinking phase
        const angle = Math.random() * Math.PI * 2;
        const currentRadius = fireArea.userData.radius || fireArea.userData.initialRadius;
        const radius = Math.random() * currentRadius;
        positions[i3] = radius * Math.cos(angle);
        positions[i3 + 1] = 0.1;
        positions[i3 + 2] = radius * Math.sin(angle);
        
        // Reset velocity
        velocities[i3] = (Math.random() - 0.5) * 0.2;
        velocities[i3 + 1] = 0.3 + Math.random() * 0.2;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.2;
        
        // Reset lifetime
        const lifetime = 0.8 + Math.random() * 0.6;
        lifetimes[i] = 0;
        initialLifetimes[i] = lifetime;
      }
    }
  }
  
  particles.geometry.attributes.position.needsUpdate = true;
  
  // Calculate average opacity based on individual particle lifetimes and heights
  calculateParticleOpacity(fireArea, particles, velocities, lifetimes, initialLifetimes);
}

/**
 * Calculate and set particle opacity based on lifetimes and heights
 * @param {THREE.Object3D} fireArea - Fire area container
 * @param {THREE.Points} particles - Particle system
 * @param {Float32Array} velocities - Particle velocities
 * @param {Float32Array} lifetimes - Current particle lifetimes
 * @param {Float32Array} initialLifetimes - Initial particle lifetimes
 */
function calculateParticleOpacity(fireArea, particles, velocities, lifetimes, initialLifetimes) {
  let totalOpacity = 0;
  let activeParticleCount = 0;
  
  if (fireArea.userData.particleSpawned) {
    const positions = particles.geometry.attributes.position.array;
    
    for (let i = 0; i < velocities.length / 3; i++) {
      const i3 = i * 3;
      
      if (lifetimes[i] < initialLifetimes[i]) {
        // Calculate opacity based on lifetime
        const lifetimeProgress = lifetimes[i] / initialLifetimes[i];
        const lifetimeOpacity = Math.max(0, 1.0 - lifetimeProgress);
        
        // Also fade based on height
        const particleHeight = positions[i3 + 1];
        const maxHeight = 1.5;
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
    
    // Apply fire phase multiplier
    let phaseMultiplier = 1.0;
    if (fireArea.userData.lifetime >= fireArea.userData.shrinkDelay + fireArea.userData.expandDuration) {
      // During shrinking phase, apply additional fade
      const timeSinceShrinkStart = fireArea.userData.lifetime - (fireArea.userData.shrinkDelay + fireArea.userData.expandDuration);
      const shrinkProgress = Math.min(timeSinceShrinkStart / fireArea.userData.shrinkDuration, 1.0);
      phaseMultiplier = 1.0 - shrinkProgress * 0.5;
    }
    
    // Final fade near end
    const timeUntilRemoval = fireArea.userData.duration - fireArea.userData.lifetime;
    if (timeUntilRemoval <= 0.3) {
      phaseMultiplier *= Math.max(0, timeUntilRemoval / 0.3);
    }
    
    particles.material.opacity = averageOpacity * phaseMultiplier;
  } else {
    particles.material.opacity = 0;
  }
}

/**
 * Remove fire area from scene and clean up resources
 * @param {THREE.Object3D} fireArea - Fire area container
 * @param {Object} scene - THREE.js scene
 */
export function removeFireArea(fireArea, scene) {
  if (!fireArea) return;
  
  // Remove light
  if (fireArea.userData && fireArea.userData.fireLight) {
    scene.remove(fireArea.userData.fireLight);
  }
  
  // Clean up geometry and material
  if (fireArea.children) {
    fireArea.children.forEach(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
  
  // Remove from scene
  scene.remove(fireArea);
}

/**
 * Check if player is in fire area and should take damage
 * @param {THREE.Object3D} fireArea - Fire area container
 * @param {THREE.Vector3} playerPos - Player position
 * @param {string} playerId - Player ID to check
 * @returns {Object} Collision result with hit, damage, and fire area info
 */
export function checkFireAreaCollision(fireArea, playerPos, playerId) {
  if (!fireArea || !fireArea.userData) {
    return { hit: false };
  }
  
  const firePos = fireArea.userData.position;
  const dx = playerPos.x - firePos.x;
  const dz = playerPos.z - firePos.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  
  if (distance < fireArea.userData.radius) {
    // Player is in fire area - check if already damaged this tick
    // Reset damage tracking every 0.2 seconds (5 damage ticks per second)
    const currentTick = Math.floor(fireArea.userData.lifetime * 5);
    const damageKey = `${playerId}_${currentTick}`;
    
    if (!fireArea.userData.hasDamaged.has(damageKey)) {
      fireArea.userData.hasDamaged.add(damageKey);
      
      // Clean up old damage keys (keep last 2 ticks)
      if (fireArea.userData.hasDamaged.size > 2) {
        const oldTick = currentTick - 2;
        const oldKey = `${playerId}_${oldTick}`;
        fireArea.userData.hasDamaged.delete(oldKey);
      }
      
      return { 
        hit: true, 
        damage: fireArea.userData.damagePerTick, 
        fireArea: fireArea,
        isFireArea: true
      };
    }
  }
  
  return { hit: false };
}

