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
 * @param {number} currentTime - Current time in milliseconds (cached performance.now() to avoid multiple calls)
 */
export function updateCollectibleAnimation(item, dt, baseHeight = null, currentTime = null) {
  if (item.userData.collected || item.userData.fadingOut) return;
  
  // Cache performance.now() call - use provided time or get it once
  const time = currentTime !== null ? currentTime : performance.now();
  
  // Use stored baseHeight from userData, or fallback to provided/default
  const height = baseHeight !== null ? baseHeight : (item.userData.baseHeight ?? 0.8);
  
  // Rotate and float with magical animation (slower, more gentle)
  item.rotation.y += dt * 1.2;  // Reduced from 3 to 1.2 (60% slower)
  item.rotation.x += dt * 0.6;  // Reduced from 1.5 to 0.6 (60% slower)
  item.position.y = height + Math.sin(time * 0.0015 + item.position.x) * 0.15;  // Reduced from 0.003 to 0.0015 (50% slower)
  
  // Update glow light position (only update light every few frames to reduce overhead)
  if (item.userData.glowLight) {
    // Store last update time to throttle light updates
    if (!item.userData.lastLightUpdate) {
      item.userData.lastLightUpdate = 0;
    }
    
    // Update light position every frame (needed for smooth movement)
    item.userData.glowLight.position.set(
      item.position.x,
      item.position.y,
      item.position.z
    );
    
    // Only update light intensity every 2-3 frames to reduce overhead
    const lightUpdateInterval = 16; // ~2-3 frames at 60fps
    if (time - item.userData.lastLightUpdate > lightUpdateInterval) {
      const pulse = Math.sin(time * 0.0025 + item.position.x) * 0.3 + 0.7;  // Reduced from 0.005 to 0.0025 (50% slower)
      item.userData.glowLight.intensity = 0.8 * pulse;
      item.userData.lastLightUpdate = time;
    }
  }
  
  // Pulse emissive intensity (cache to avoid unnecessary updates)
  const pulse = Math.sin(time * 0.0025 + item.position.x) * 0.3 + 0.7;  // Reduced from 0.005 to 0.0025 (50% slower)
  const targetIntensity = 0.7 * pulse;
  // Only update if change is significant (> 1% difference)
  if (Math.abs(item.material.emissiveIntensity - targetIntensity) > 0.007) {
    item.material.emissiveIntensity = targetIntensity;
  }
}

/**
 * Update checkpoint animation
 * @param {THREE.Group} checkpoint - Checkpoint group
 * @param {number} dt - Delta time in seconds
 * @param {number} currentTime - Current time in milliseconds (cached performance.now() to avoid multiple calls)
 */
export function updateCheckpointAnimation(checkpoint, dt, currentTime = null) {
  checkpoint.rotation.y += dt * 0.8;
  
  // Cache performance.now() call - use provided time or get it once
  const time = currentTime !== null ? currentTime : performance.now();
  
  const pulse = checkpoint.userData.activated ? 1.0 : 0.6;
  const variation = Math.sin(time * 0.003 + checkpoint.position.x) * 0.3;
  
  // Animate crystal and ring
  if (checkpoint.userData.crystal) {
    checkpoint.userData.crystal.rotation.y += dt * 1.5;
    const targetIntensity = pulse + variation;
    // Only update if change is significant
    if (Math.abs(checkpoint.userData.crystal.material.emissiveIntensity - targetIntensity) > 0.01) {
      checkpoint.userData.crystal.material.emissiveIntensity = targetIntensity;
    }
  }
  
  if (checkpoint.userData.ring) {
    checkpoint.userData.ring.rotation.z += dt * 0.5;
    const targetIntensity = (checkpoint.userData.activated ? 0.8 : 0.5) + variation * 0.3;
    // Only update if change is significant
    if (Math.abs(checkpoint.userData.ring.material.emissiveIntensity - targetIntensity) > 0.01) {
      checkpoint.userData.ring.material.emissiveIntensity = targetIntensity;
    }
  }
  
  // Pulse glow light (throttle updates)
  if (checkpoint.userData.glowLight) {
    if (!checkpoint.userData.lastLightUpdate) {
      checkpoint.userData.lastLightUpdate = 0;
    }
    
    const lightUpdateInterval = 16; // ~2-3 frames at 60fps
    if (time - checkpoint.userData.lastLightUpdate > lightUpdateInterval) {
      const lightPulse = Math.sin(time * 0.004 + checkpoint.position.x) * 0.2 + 0.8;
      checkpoint.userData.glowLight.intensity = (checkpoint.userData.activated ? 1.0 : 0.6) * lightPulse;
      checkpoint.userData.lastLightUpdate = time;
    }
  }
}

