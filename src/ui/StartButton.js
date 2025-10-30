export class StartButton {
  constructor(onStart) {
    this.onStart = onStart;
    this.button = null;
    this.isCounting = false;
    this.isCountdownComplete = false;
    this.countdown = 3;
    this._createButton();
  }

  _createButton() {
    // Create start button
    this.button = document.createElement('button');
    this.button.className = 'ui__start-button';
    this.button.textContent = 'Start';
    this.button.type = 'button';

    this.button.addEventListener('click', () => {
      this.startCountdown();
    });
  }

  getElement() {
    return this.button;
  }

  show() {
    if (this.button) {
      this.button.style.display = 'block';
      this.button.disabled = false;
      this.button.textContent = 'Start';
      this.button.classList.remove('is-counting');
    }
    this.countdown = 3;
    this.isCounting = false;
    this.isCountdownComplete = false;
  }

  hide() {
    if (this.button) {
      this.button.style.display = 'none';
    }
  }

  startCountdown() {
    if (this.isCounting) return;
    
    this.isCounting = true;
    this.isCountdownComplete = false;
    this.button.disabled = true;
    this.button.classList.add('is-counting');

    const countdownInterval = setInterval(() => {
      this.countdown--;
      this.button.textContent = this.countdown > 0 ? this.countdown : 'GO!';

      if (this.countdown <= 0) {
        clearInterval(countdownInterval);
        setTimeout(() => {
          this.isCounting = false;
          this.isCountdownComplete = true;
          if (this.onStart) {
            this.onStart();
          }
        }, 500);
      }
    }, 1000);
  }

  isCountdownFinished() {
    return this.isCountdownComplete;
  }

  isCountdownRunning() {
    return this.isCounting;
  }

  destroy() {
    if (this.button && this.button.parentNode) {
      this.button.parentNode.removeChild(this.button);
    }
  }
}

