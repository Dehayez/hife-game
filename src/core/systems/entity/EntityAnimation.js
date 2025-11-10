/**
 * EntityAnimation.js
 * 
 * Handles entity animations (collectibles, checkpoints, etc.).
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

/**
 * Update collectible animation
 * @param {THREE.Mesh} item - Collectible mesh
 * @param {number} dt - Delta time in seconds
 * @param {number} baseHeight - Base height position (optional, uses item.userData.baseHeight if not provided)
 */
export function updateCollectibleAnimation(item, dt, baseHeight = null) {
  if (item.userData.collected || item.userData.fadingOut) return;
  
  // Use stored baseHeight from userData, or fallback to provided/default
  const height = baseHeight !== null ? baseHeight : (item.userData.baseHeight ?? 0.8);
  
  // Rotate and float with magical animation
  item.rotation.y += dt * 3;
  item.rotation.x += dt * 1.5;
  item.position.y = height + Math.sin(performance.now() * 0.003 + item.position.x) * 0.15;
  
  // Update glow light position
  if (item.userData.glowLight) {
    item.userData.glowLight.position.set(
      item.position.x,
      item.position.y,
      item.position.z
    );
    // Pulse the glow (base intensity 0.8)
    const pulse = Math.sin(performance.now() * 0.005 + item.position.x) * 0.3 + 0.7;
    item.userData.glowLight.intensity = 0.8 * pulse;
  }
  
  // Pulse emissive intensity
  const pulse = Math.sin(performance.now() * 0.005 + item.position.x) * 0.3 + 0.7;
  item.material.emissiveIntensity = 0.7 * pulse;
}

/**
 * Update checkpoint animation
 * @param {THREE.Group} checkpoint - Checkpoint group
 * @param {number} dt - Delta time in seconds
 */
export function updateCheckpointAnimation(checkpoint, dt) {
  checkpoint.rotation.y += dt * 0.8;
  
  const pulse = checkpoint.userData.activated ? 1.0 : 0.6;
  const variation = Math.sin(performance.now() * 0.003 + checkpoint.position.x) * 0.3;
  
  // Animate crystal and ring
  if (checkpoint.userData.crystal) {
    checkpoint.userData.crystal.rotation.y += dt * 1.5;
    checkpoint.userData.crystal.material.emissiveIntensity = pulse + variation;
  }
  
  if (checkpoint.userData.ring) {
    checkpoint.userData.ring.rotation.z += dt * 0.5;
    checkpoint.userData.ring.material.emissiveIntensity = (checkpoint.userData.activated ? 0.8 : 0.5) + variation * 0.3;
  }
  
  // Pulse glow light
  if (checkpoint.userData.glowLight) {
    const lightPulse = Math.sin(performance.now() * 0.004 + checkpoint.position.x) * 0.2 + 0.8;
    checkpoint.userData.glowLight.intensity = (checkpoint.userData.activated ? 1.0 : 0.6) * lightPulse;
  }
}

