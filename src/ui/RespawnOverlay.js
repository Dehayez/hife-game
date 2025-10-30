export class RespawnOverlay {
  constructor() {
    this.overlay = null;
    this.countdownText = null;
    this.isVisible = false;
    this._createOverlay();
  }

  _createOverlay() {
    // Create overlay container
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: saturate(0.1) brightness(0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      pointer-events: none;
      font-family: 'Arial', sans-serif;
      opacity: 0;
      transition: opacity 2s ease-in-out;
    `;

    // Create countdown text
    this.countdownText = document.createElement('div');
    this.countdownText.style.cssText = `
      font-size: 4rem;
      font-weight: bold;
      color: rgba(255, 255, 255, 0.9);
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      animation: pulse 1s ease-in-out infinite alternate;
    `;

    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        from { transform: scale(1); opacity: 0.8; }
        to { transform: scale(1.1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    this.overlay.appendChild(this.countdownText);
    document.body.appendChild(this.overlay);
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
