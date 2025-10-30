export class StartButton {
  constructor(onStart, onCancel) {
    this.onStart = onStart;
    this.onCancel = onCancel;
    this.overlay = null;
    this.button = null;
    this.cancelButton = null;
    this.countdownOverlay = null;
    this.countdownText = null;
    this.isCounting = false;
    this.countdown = 3;
    this._createOverlay();
  }

  _createOverlay() {
    // Create start button overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'start-button-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2000;
      pointer-events: auto;
    `;

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    `;

    // Create start button
    this.button = document.createElement('button');
    this.button.className = 'start-button';
    this.button.textContent = 'Start';
    this.button.style.cssText = `
      background: #3c8ce7;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 16px 48px;
      font-size: 24px;
      font-weight: 600;
      cursor: pointer;
      font-family: system-ui, -apple-system, sans-serif;
      transition: transform 0.1s ease, background 0.1s ease;
      box-shadow: 0 4px 12px rgba(60, 140, 231, 0.3);
    `;

    this.button.addEventListener('mouseenter', () => {
      this.button.style.transform = 'scale(1.05)';
      this.button.style.background = '#4a9ef5';
    });

    this.button.addEventListener('mouseleave', () => {
      this.button.style.transform = 'scale(1)';
      this.button.style.background = '#3c8ce7';
    });

    this.button.addEventListener('click', () => {
      this.startCountdown();
    });

    // Create cancel button
    this.cancelButton = document.createElement('button');
    this.cancelButton.className = 'cancel-button';
    this.cancelButton.textContent = 'Cancel';
    this.cancelButton.style.cssText = `
      background: rgba(231, 76, 60, 0.8);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 12px 48px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      font-family: system-ui, -apple-system, sans-serif;
      transition: transform 0.1s ease, background 0.1s ease;
      box-shadow: 0 4px 12px rgba(231, 76, 60, 0.2);
    `;

    this.cancelButton.addEventListener('mouseenter', () => {
      this.cancelButton.style.transform = 'scale(1.05)';
      this.cancelButton.style.background = 'rgba(231, 76, 60, 1)';
    });

    this.cancelButton.addEventListener('mouseleave', () => {
      this.cancelButton.style.transform = 'scale(1)';
      this.cancelButton.style.background = 'rgba(231, 76, 60, 0.8)';
    });

    this.cancelButton.addEventListener('click', () => {
      this.hide();
      if (this.onCancel) {
        this.onCancel();
      }
    });

    buttonContainer.appendChild(this.button);
    buttonContainer.appendChild(this.cancelButton);
    this.overlay.appendChild(buttonContainer);

    // Create countdown overlay
    this.countdownOverlay = document.createElement('div');
    this.countdownOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 2001;
      pointer-events: none;
    `;

    this.countdownText = document.createElement('div');
    this.countdownText.style.cssText = `
      font-size: 8rem;
      font-weight: bold;
      color: #ffffff;
      text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
      font-family: system-ui, -apple-system, sans-serif;
      animation: pulseCountdown 0.5s ease-out;
    `;

    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulseCountdown {
        0% { transform: scale(0.5); opacity: 0; }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    this.countdownOverlay.appendChild(this.countdownText);
    document.body.appendChild(this.countdownOverlay);
    document.body.appendChild(this.overlay);
  }

  show() {
    this.overlay.style.display = 'flex';
    this.button.disabled = false;
    this.cancelButton.disabled = false;
    this.countdown = 3;
    this.isCounting = false;
  }

  hide() {
    this.overlay.style.display = 'none';
  }

  startCountdown() {
    if (this.isCounting) return;
    
    this.isCounting = true;
    this.button.disabled = true;
    this.cancelButton.disabled = true;
    this.overlay.style.display = 'none';
    this.countdownOverlay.style.display = 'flex';

    const countdownInterval = setInterval(() => {
      this.countdown--;
      this.countdownText.textContent = this.countdown > 0 ? this.countdown : 'GO!';

      if (this.countdown <= 0) {
        clearInterval(countdownInterval);
        setTimeout(() => {
          this.countdownOverlay.style.display = 'none';
          this.isCounting = false;
          if (this.onStart) {
            this.onStart();
          }
        }, 500);
      } else {
        // Reset animation
        this.countdownText.style.animation = 'none';
        requestAnimationFrame(() => {
          this.countdownText.style.animation = 'pulseCountdown 0.5s ease-out';
        });
      }
    }, 1000);
  }

  destroy() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    if (this.countdownOverlay && this.countdownOverlay.parentNode) {
      this.countdownOverlay.parentNode.removeChild(this.countdownOverlay);
    }
  }
}

