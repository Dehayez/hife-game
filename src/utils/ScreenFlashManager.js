/**
 * ScreenFlashManager.js
 * 
 * Manages screen flash effects when taking damage and persistent health-based red tint.
 */

export class ScreenFlashManager {
  constructor() {
    this.flashElement = null;
    this.healthOverlayElement = null;
    this.flashOpacity = 0;
    this.flashDuration = 0;
    this.flashColor = '#ff0000';
    this.isFlashing = false;
    this.currentHealth = 100;
    this.maxHealth = 100;
  }

  /**
   * Initialize flash overlay element
   */
  init() {
    if (this.flashElement) return;
    
    // Create flash overlay element (for damage flashes)
    this.flashElement = document.createElement('div');
    this.flashElement.style.position = 'fixed';
    this.flashElement.style.top = '0';
    this.flashElement.style.left = '0';
    this.flashElement.style.width = '100%';
    this.flashElement.style.height = '100%';
    this.flashElement.style.pointerEvents = 'none';
    this.flashElement.style.zIndex = '9999';
    this.flashElement.style.opacity = '0';
    this.flashElement.style.backgroundColor = this.flashColor;
    this.flashElement.style.transition = 'opacity 0.1s ease-out';
    this.flashElement.style.mixBlendMode = 'screen'; // Additive blending for flash
    
    document.body.appendChild(this.flashElement);
    
    // Create health-based overlay element (persistent red tint)
    this.healthOverlayElement = document.createElement('div');
    this.healthOverlayElement.style.position = 'fixed';
    this.healthOverlayElement.style.top = '0';
    this.healthOverlayElement.style.left = '0';
    this.healthOverlayElement.style.width = '100%';
    this.healthOverlayElement.style.height = '100%';
    this.healthOverlayElement.style.pointerEvents = 'none';
    this.healthOverlayElement.style.zIndex = '9998'; // Behind flash
    this.healthOverlayElement.style.opacity = '0';
    this.healthOverlayElement.style.backgroundColor = '#ff0000';
    this.healthOverlayElement.style.transition = 'opacity 0.3s ease-out';
    this.healthOverlayElement.style.mixBlendMode = 'overlay'; // Overlay for better visibility and red tint
    
    document.body.appendChild(this.healthOverlayElement);
  }

  /**
   * Flash screen with color (reduced intensity)
   * @param {string} color - Hex color string (default: red)
   * @param {number} duration - Flash duration in seconds (default: 0.15)
   * @param {number} intensity - Flash intensity 0-1 (default: 0.15 - reduced from 0.3)
   */
  flash(color = '#ff0000', duration = 0.15, intensity = 0.15) {
    this.init();
    
    this.flashColor = color;
    this.flashDuration = duration;
    this.flashOpacity = intensity;
    this.isFlashing = true;
    
    // Set color and opacity (reduced intensity)
    this.flashElement.style.backgroundColor = color;
    this.flashElement.style.opacity = intensity.toString();
    
    // Fade out
    setTimeout(() => {
      if (this.flashElement) {
        this.flashElement.style.opacity = '0';
        setTimeout(() => {
          this.isFlashing = false;
        }, 100);
      }
    }, duration * 1000);
  }

  /**
   * Update health-based red tint/saturation
   * @param {number} currentHealth - Current health value
   * @param {number} maxHealth - Maximum health value
   */
  updateHealth(currentHealth, maxHealth) {
    this.currentHealth = currentHealth;
    this.maxHealth = maxHealth;
    this._updateHealthOverlay();
  }

  /**
   * Update health overlay based on current health percentage
   * @private
   */
  _updateHealthOverlay() {
    if (!this.healthOverlayElement) return;
    
    // Calculate health percentage (0-1)
    const healthPercent = Math.max(0, Math.min(1, this.currentHealth / this.maxHealth));
    
    // Invert so lower health = more red
    const damagePercent = 1 - healthPercent;
    
    // Calculate opacity with exponential curve for subtle effect at low health
    // At full health (0% damage): opacity = 0
    // At 50% health (50% damage): opacity ~0.03
    // At 75% damage (25% health): opacity ~0.1
    // At 90% damage (10% health): opacity ~0.2
    // At 95%+ damage (5% health): opacity ~0.3+ (subtle red, almost death)
    // Use exponential curve with power 2.0, reduced max opacity for less visibility
    const opacity = Math.pow(damagePercent, 2.0) * 0.3;
    
    // Apply opacity (no saturation filter)
    this.healthOverlayElement.style.opacity = opacity.toString();
    
    // Remove saturation filter, keep only the red tint overlay
    this.healthOverlayElement.style.filter = 'none';
  }

  /**
   * Update flash effect and health overlay
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    if (this.isFlashing && this.flashElement) {
      // Flash is handled by CSS transition
    }
    
    // Health overlay is updated via updateHealth() call
  }

  /**
   * Cleanup
   */
  dispose() {
    if (this.flashElement && this.flashElement.parentNode) {
      this.flashElement.parentNode.removeChild(this.flashElement);
    }
    if (this.healthOverlayElement && this.healthOverlayElement.parentNode) {
      this.healthOverlayElement.parentNode.removeChild(this.healthOverlayElement);
    }
    this.flashElement = null;
    this.healthOverlayElement = null;
  }
}

