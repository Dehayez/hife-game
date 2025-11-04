/**
 * Collectible.js
 * 
 * Handles collectible (gem) creation, collection, and effects.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getCollectibleStats } from '../../../config/entity/EntityStats.js';
import { getGeometryPool } from '../abilities/functions/utils/GeometryPool.js';

/**
 * Create a collectible gem
 * @param {Object} scene - THREE.js scene
 * @param {number} x - X position
 * @param {number} z - Z position
 * @param {string} id - Unique identifier
 * @returns {THREE.Mesh} Created collectible mesh
 */
export function createCollectible(scene, x, z, id) {
  const stats = getCollectibleStats();
  
  // Create magical crystal gem - faceted crystal shape with red color
  // Use geometry pool for optimization
  const pool = getGeometryPool();
  const geo = pool.acquireOctahedron(stats.size, 0);
  const color = stats.color;
  
  const mat = new THREE.MeshStandardMaterial({ 
    color: color, 
    emissive: color,
    emissiveIntensity: stats.emissiveIntensity,
    metalness: stats.metalness,
    roughness: stats.roughness,
    transparent: true,
    opacity: stats.opacity
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, stats.height, z);
  mesh.castShadow = true;
  mesh.userData = { 
    type: 'collectible', 
    id, 
    collected: false, 
    originalColor: color,
    fadingOut: false
  };
  
  // Add magical glow effect with point light
  const glowLight = new THREE.PointLight(
    color, 
    stats.lightIntensity, 
    stats.lightRange
  );
  glowLight.position.set(x, stats.height, z);
  glowLight.decay = stats.lightDecay; // Linear decay for better spread
  mesh.userData.glowLight = glowLight;
  scene.add(glowLight);
  
  scene.add(mesh);
  return mesh;
}

/**
 * Collect an item (removes glow light only)
 * @param {THREE.Mesh} item - Item mesh
 * @param {Object} scene - THREE.js scene
 * @returns {boolean} True if item was collected
 */
export function collectItem(item, scene) {
  if (item.userData.collected) return false;
  
  item.userData.collected = true;
  
  // Remove glow light immediately
  if (item.userData.glowLight) {
    scene.remove(item.userData.glowLight);
    item.userData.glowLight = null;
  }
  
  return true;
}

/**
 * Update collectible animation (fade out)
 * @param {THREE.Mesh} item - Item mesh
 * @param {number} dt - Delta time in seconds
 * @param {Function} onFadeComplete - Callback when fade is complete
 */
export function updateCollectible(item, dt, onFadeComplete) {
  if (!item.userData.fadingOut) return;
  
  const stats = getCollectibleStats();
  
  // Fade out over duration
  item.userData.fadeTime = (item.userData.fadeTime || 0) + dt;
  const fadeProgress = Math.min(item.userData.fadeTime / stats.fadeOutDuration, 1.0);
  
  item.material.opacity = stats.opacity * (1 - fadeProgress);
  
  // Scale down as it fades
  const scale = 1 - fadeProgress * 0.5;
  item.scale.set(scale, scale, scale);
  
  // Rotate while fading
  item.rotation.y += dt * 5;
  
  // Remove when fully faded
  if (fadeProgress >= 1.0 && onFadeComplete) {
    onFadeComplete(item);
  }
}

