/**
 * ScreenShakeManager.js
 * 
 * Manages camera shake effects for impacts, explosions, and other dramatic events.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

export class ScreenShakeManager {
  constructor() {
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeDecay = 0;
    this.shakeOffset = new THREE.Vector3(0, 0, 0);
    this.baseCameraPosition = new THREE.Vector3(0, 0, 0);
    this.time = 0;
  }

  /**
   * Add screen shake
   * @param {number} intensity - Shake intensity (0-1)
   * @param {number} duration - Shake duration in seconds
   * @param {number} decay - Decay rate (higher = faster decay, default: 0.95)
   */
  shake(intensity = 0.1, duration = 0.2, decay = 0.95) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
    this.shakeDecay = decay;
  }

  /**
   * Update shake effect
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    if (this.shakeDuration > 0) {
      // Apply random offset based on intensity (scale by a factor for visibility)
      // Scale intensity by 2 to make shake more noticeable
      const scaledIntensity = this.shakeIntensity * 2;
      const offsetX = (Math.random() - 0.5) * 2 * scaledIntensity;
      const offsetY = (Math.random() - 0.5) * 2 * scaledIntensity;
      const offsetZ = (Math.random() - 0.5) * 2 * scaledIntensity;
      
      this.shakeOffset.set(offsetX, offsetY, offsetZ);
      
      // Decay intensity over time
      this.shakeIntensity *= this.shakeDecay;
      this.shakeDuration -= dt;
      
      // Reset if duration expired
      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0;
        this.shakeOffset.set(0, 0, 0);
      }
    } else {
      this.shakeOffset.set(0, 0, 0);
    }
  }

  /**
   * Get current shake offset
   * @returns {THREE.Vector3} Current shake offset
   */
  getOffset() {
    return this.shakeOffset.clone();
  }

  /**
   * Reset all shake effects
   */
  reset() {
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeOffset.set(0, 0, 0);
  }
}

