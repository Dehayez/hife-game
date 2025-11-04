/**
 * ScreenFlashManager.js
 * 
 * Manages screen flash effects when taking damage or other events.
 */

export class ScreenFlashManager {
  constructor() {
    this.flashElement = null;
    this.flashOpacity = 0;
    this.flashDuration = 0;
    this.flashColor = '#ff0000';
    this.isFlashing = false;
  }

  /**
   * Initialize flash overlay element
   */
  init() {
    if (this.flashElement) return;
    
    // Create flash overlay element
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
    
    document.body.appendChild(this.flashElement);
  }

  /**
   * Flash screen with color
   * @param {string} color - Hex color string (default: red)
   * @param {number} duration - Flash duration in seconds (default: 0.2)
   * @param {number} intensity - Flash intensity 0-1 (default: 0.3)
   */
  flash(color = '#ff0000', duration = 0.2, intensity = 0.3) {
    this.init();
    
    this.flashColor = color;
    this.flashDuration = duration;
    this.flashOpacity = intensity;
    this.isFlashing = true;
    
    // Set color and opacity
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
   * Update flash effect
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    if (this.isFlashing && this.flashElement) {
      // Flash is handled by CSS transition, but we can update here if needed
    }
  }

  /**
   * Cleanup
   */
  dispose() {
    if (this.flashElement && this.flashElement.parentNode) {
      this.flashElement.parentNode.removeChild(this.flashElement);
    }
    this.flashElement = null;
  }
}

