/**
 * SplashArea.js
 * 
 * Handles creation, update, and removal of splash areas after mortar impact.
 * Splash areas deal damage over time to players standing in them.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getCharacterColor } from '../stats/CharacterAbilityStats.js';
import { SPLASH_AREA_CONFIG } from '../AbilityConfig.js';
import { createCircleGeometry, createEmissiveMaterial } from '../utils/GeometryUtils.js';
import { createTrailLight } from '../utils/LightUtils.js';
import { removeFromScene } from '../utils/CleanupUtils.js';
import { distance2D } from '../utils/VectorUtils.js';
import { createSplashParticles, updateSplashParticles } from './SplashAreaParticles.js';
import { updateSplashAnimation } from './SplashAreaAnimation.js';

/**
 * Create a splash area at impact point
 * @param {Object} scene - THREE.js scene
 * @param {number} x - Impact X position
 * @param {number} y - Impact Y position (ground height)
 * @param {number} z - Impact Z position
 * @param {Object} mortarData - Mortar userData containing stats
 * @returns {THREE.Object3D} Splash area container object
 */
export function createSplashArea(scene, x, y, z, mortarData) {
  const splashRadius = mortarData.splashRadius || 1.0;
  const fireDuration = mortarData.fireDuration || 1.5;
  const shrinkDelay = mortarData.mortarShrinkDelay || 0.5;
  const areaDamage = mortarData.areaDamage || 10;
  const characterColor = mortarData.characterName === 'herald' 
    ? getCharacterColor('herald') 
    : getCharacterColor('lucy');
  
  // Create splash effect container
  const splashContainer = new THREE.Object3D();
  // Position at exact impact point (y is ground height)
  splashContainer.position.set(x, y + SPLASH_AREA_CONFIG.visual.groundOffset, z); // Slightly above ground
  
  // Create splash base - glowing circle with radial opacity gradient
  const opacityTexture = createRadialGradientTexture();
  const geometry = createCircleGeometry(splashRadius, SPLASH_AREA_CONFIG.visual.geometrySegments);
  const material = createEmissiveMaterial({
    color: characterColor,
    emissiveIntensity: SPLASH_AREA_CONFIG.visual.emissiveIntensity,
    metalness: SPLASH_AREA_CONFIG.visual.metalness,
    roughness: SPLASH_AREA_CONFIG.visual.roughness,
    transparent: true,
    opacity: 1.0,
    alphaMap: opacityTexture,
    side: THREE.DoubleSide
  });
  const splashBase = new THREE.Mesh(geometry, material);
  splashBase.rotation.x = -Math.PI / 2; // Lay flat on ground
  splashBase.scale.set(0, 0, 0); // Start at impact point (scale 0)
  splashContainer.add(splashBase);
  
  // Create splash particle system
  const { particles, velocities, lifetimes, initialLifetimes } = createSplashParticles(splashRadius, characterColor);
  splashContainer.add(particles);
  
  // Add point light for splash glow - positioned at exact impact point
  const isHeraldSplash = mortarData.characterName === 'herald';
  const splashLightIntensity = isHeraldSplash 
    ? SPLASH_AREA_CONFIG.light.heraldIntensity 
    : SPLASH_AREA_CONFIG.light.lucyIntensity;
  const splashLightRange = isHeraldSplash 
    ? splashRadius * SPLASH_AREA_CONFIG.light.heraldRangeMultiplier 
    : splashRadius * SPLASH_AREA_CONFIG.light.lucyRangeMultiplier;
  const splashLightPosition = new THREE.Vector3(x, y + SPLASH_AREA_CONFIG.visual.lightHeightOffset, z);
  const splashLight = createTrailLight({
    color: characterColor,
    intensity: 0, // Start at 0, fade in during expansion
    range: splashLightRange,
    position: splashLightPosition
  });
  scene.add(splashLight); // Add directly to scene at correct position
  
  // Store splash area data with initial radius for shrinking
  splashContainer.userData = {
    type: 'splashArea',
    damagePerTick: areaDamage,
    initialRadius: splashRadius,
    radius: splashRadius, // Current radius (will shrink)
    lifetime: 0,
    duration: fireDuration,
    shrinkDelay: shrinkDelay,
    shrinkDuration: fireDuration - shrinkDelay,
    expandDuration: SPLASH_AREA_CONFIG.timing.expandDuration,
    position: new THREE.Vector3(x, y, z), // Exact impact position
    splashLight: splashLight,
    splashLightIntensity: splashLightIntensity,
    splashLightPosition: splashLightPosition,
    hasDamaged: new Set(), // Track who has been damaged this tick
    particles: particles,
    particleVelocities: velocities,
    particleLifetimes: lifetimes,
    particleInitialLifetimes: initialLifetimes,
    particleSpawned: false
  };
  
  scene.add(splashContainer);
  return splashContainer;
}

/**
 * Update splash area animation and particle effects
 * @param {THREE.Object3D} splashArea - Splash area container
 * @param {number} dt - Delta time in seconds
 */
export function updateSplashArea(splashArea, dt) {
  if (!splashArea || !splashArea.userData) {
    return { shouldRemove: false };
  }
  
  splashArea.userData.lifetime += dt;
  
  // Update animation phases
  updateSplashAnimation(splashArea, dt);
  
  // Update splash particles
  if (splashArea.userData.particles && splashArea.userData.particleVelocities) {
    updateSplashParticles(splashArea, dt);
  }
  
  // Check if splash area should be removed
  if (splashArea.userData.lifetime >= splashArea.userData.duration) {
    return { shouldRemove: true };
  }
  
  return { shouldRemove: false };
}

/**
 * Remove splash area from scene and clean up resources
 * @param {THREE.Object3D} splashArea - Splash area container
 * @param {Object} scene - THREE.js scene
 */
export function removeSplashArea(splashArea, scene) {
  if (!splashArea) return;
  
  // Remove light
  if (splashArea.userData && splashArea.userData.splashLight) {
    scene.remove(splashArea.userData.splashLight);
  }
  
  // Remove from scene and dispose resources
  removeFromScene(splashArea, scene);
}

/**
 * Create radial gradient texture for splash opacity
 * @returns {THREE.CanvasTexture} Radial gradient texture
 */
function createRadialGradientTexture() {
  const canvas = document.createElement('canvas');
  const textureSize = SPLASH_AREA_CONFIG.visual.opacityTextureSize;
  canvas.width = textureSize;
  canvas.height = textureSize;
  const ctx = canvas.getContext('2d');
  const center = textureSize / 2;
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Opaque center
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // Transparent edges
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, textureSize, textureSize);
  
  const opacityTexture = new THREE.CanvasTexture(canvas);
  opacityTexture.needsUpdate = true;
  return opacityTexture;
}

/**
 * Check if player is in splash area and should take damage
 * @param {THREE.Object3D} splashArea - Splash area container
 * @param {THREE.Vector3} playerPos - Player position
 * @param {string} playerId - Player ID to check
 * @returns {Object} Collision result with hit, damage, and splash area info
 */
export function checkSplashAreaCollision(splashArea, playerPos, playerId) {
  if (!splashArea || !splashArea.userData) {
    return { hit: false };
  }
  
  const splashPos = splashArea.userData.position;
  const distance = distance2D(splashPos.x, splashPos.z, playerPos.x, playerPos.z);
  
  if (distance < splashArea.userData.radius) {
    // Player is in splash area - check if already damaged this tick
    // Reset damage tracking based on ticks per second
    const ticksPerSecond = SPLASH_AREA_CONFIG.damage.ticksPerSecond;
    const currentTick = Math.floor(splashArea.userData.lifetime * ticksPerSecond);
    const damageKey = `${playerId}_${currentTick}`;
    
    if (!splashArea.userData.hasDamaged.has(damageKey)) {
      splashArea.userData.hasDamaged.add(damageKey);
      
      // Clean up old damage keys (keep last 2 ticks)
      if (splashArea.userData.hasDamaged.size > 2) {
        const oldTick = currentTick - 2;
        const oldKey = `${playerId}_${oldTick}`;
        splashArea.userData.hasDamaged.delete(oldKey);
      }
      
      return { 
        hit: true, 
        damage: splashArea.userData.damagePerTick, 
        splashArea: splashArea,
        isSplashArea: true
      };
    }
  }
  
  return { hit: false };
}

