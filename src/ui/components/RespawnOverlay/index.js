import { createOverlayElements } from './functions.js';

export class RespawnOverlay {
  constructor() {
    this.overlay = null;
    this.countdownText = null;
    this.isVisible = false;
    const elements = createOverlayElements();
    this.overlay = elements.overlay;
    this.countdownText = elements.countdownText;
  }

  show(countdown) {
    this.isVisible = true;
    this.overlay.style.display = 'flex';
    this.updateCountdown(countdown);
    
    // Trigger fade-in by setting opacity to 1
    requestAnimationFrame(() => {
      this.overlay.style.opacity = '1';
    });
  }

  hide() {
    this.isVisible = false;
    this.overlay.style.opacity = '0';
    
    // Hide completely after fade-out transition
    setTimeout(() => {
      if (!this.isVisible) {
        this.overlay.style.display = 'none';
      }
    }, 300); // Match transition duration
  }

  updateCountdown(countdown) {
    if (this.isVisible) {
      this.countdownText.textContent = Math.ceil(countdown);
    }
  }

  reset() {
    this.hide();
    this.countdownText.textContent = '';
  }

  immediateReset() {
    this.isVisible = false;
    this.overlay.style.opacity = '0';
    this.overlay.style.display = 'none';
    this.countdownText.textContent = '';
  }

  destroy() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}

