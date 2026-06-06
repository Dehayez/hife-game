/**
 * LoadingProgressManager.js
 * 
 * Manages loading progress tracking and UI updates for the game loading screen.
 */

/**
 * Loading progress manager
 */
export class LoadingProgressManager {
  constructor() {
    this.totalSteps = 0;
    this.currentStep = 0;
    this.currentTask = '';
    this.progressElement = null;
    this.textElement = null;
    this.barElement = null;

    // Smoothing state: the bar visually lerps toward _targetPercent at a
    // capped rate so chunky setProgress / setPercentage calls don't pop.
    this._displayedPercent = 0;
    this._targetPercent = 0;
    this._tweenRafId = null;
    this._lastTweenTime = 0;

    this._initializeElements();
  }

  /**
   * Initialize DOM elements
   * @private
   */
  _initializeElements() {
    this.progressElement = document.getElementById('loading-progress');
    this.textElement = document.getElementById('loading-status-text');
    this.barElement = document.getElementById('loading-progress-bar');
    this.percentElement = document.getElementById('loading-progress-percent');

    if (!this.progressElement || !this.textElement || !this.barElement) {
      console.warn('Loading progress elements not found in DOM', {
        progress: !!this.progressElement,
        text: !!this.textElement,
        bar: !!this.barElement
      });
    }
  }

  /**
   * Set total number of steps, preserving the currently-displayed
   * percentage so callers can re-bucket without snapping the bar to
   * 100% (or worse, dropping it back to small numbers).
   * @param {number} total - Total number of steps
   */
  setTotalSteps(total) {
    const prevTotal = this.totalSteps;
    if (prevTotal > 0 && total > 0) {
      const ratio = Math.min(1, this.currentStep / prevTotal);
      this.currentStep = ratio * total;
    }
    this.totalSteps = total;
    this._updateProgress();
  }

  /**
   * Increment progress by one step
   * @param {string} task - Description of current task
   */
  increment(task = '') {
    this.currentStep++;
    if (task) {
      this.currentTask = task;
    }
    this._updateProgress();
  }

  /**
   * Set progress to a specific step. Loading progress is monotonic — a
   * caller marking the *start* of a phase (e.g. setProgress(0, '...'))
   * must not rewind the bar after earlier milestones have already moved it
   * forward. Step is clamped against the current value.
   * @param {number} step - Step number (0-based)
   * @param {string} task - Description of current task
   */
  setProgress(step, task = '') {
    this.currentStep = Math.max(this.currentStep, step);
    if (task) {
      this.currentTask = task;
    }
    this._updateProgress();
  }

  /**
   * Set progress percentage directly
   * @param {number} percentage - Progress percentage (0-100)
   * @param {string} task - Description of current task
   */
  setPercentage(percentage, task = '') {
    if (this.totalSteps === 0) {
      this.totalSteps = 100;
    }
    const nextStep = (percentage / 100) * this.totalSteps;
    this.currentStep = Math.max(this.currentStep, nextStep);
    if (task) {
      this.currentTask = task;
    }
    this._updateProgress();
  }

  /**
   * Update progress UI
   * @private
   */
  _updateProgress() {
    if (!this.progressElement || !this.textElement || !this.barElement) {
      // Re-initialize elements in case DOM wasn't ready
      this._initializeElements();
      if (!this.progressElement || !this.textElement || !this.barElement) {
        return;
      }
    }

    const percentage = this.totalSteps > 0
      ? Math.min(100, Math.max(0, (this.currentStep / this.totalSteps) * 100))
      : 0;

    // The bar is an SVG <rect> width attribute, which CSS transitions don't
    // animate reliably — so we tween manually toward the new target each
    // frame. Big jumps get eased instead of popping.
    this._targetPercent = percentage;
    this._ensureTween();

    // The bottom line is owned by the splash rotator (see index.html) and
    // cycles handwritten taglines on a timer. We intentionally do NOT write
    // the caller-supplied `task` here so it can't stomp the rotator mid-fade.
  }

  _ensureTween() {
    if (this._tweenRafId !== null) return;
    this._lastTweenTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const tick = () => {
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const dt = Math.max(0, Math.min(0.1, (now - this._lastTweenTime) / 1000));
      this._lastTweenTime = now;

      // Lerp toward target. Rate is tuned so a 0→100 jump takes ~0.6s.
      const RATE = 5.5;
      const delta = this._targetPercent - this._displayedPercent;
      const step = delta * (1 - Math.exp(-RATE * dt));
      // Snap when very close to avoid hanging at .9% forever.
      this._displayedPercent = Math.abs(delta) < 0.05
        ? this._targetPercent
        : this._displayedPercent + step;

      this._paint(this._displayedPercent);

      if (this._displayedPercent === this._targetPercent) {
        this._tweenRafId = null;
        return;
      }
      this._tweenRafId = requestAnimationFrame(tick);
    };
    this._tweenRafId = requestAnimationFrame(tick);
  }

  _paint(percentage) {
    if (!this.barElement) return;
    const displayWidth = Math.max(1, percentage);
    if (this.barElement.tagName === 'rect' || this.barElement.tagName === 'RECT') {
      this.barElement.setAttribute('width', String((displayWidth / 100) * 800));
    } else {
      this.barElement.style.width = `${displayWidth}%`;
    }
    if (this.percentElement) {
      this.percentElement.textContent = `${Math.round(percentage)}%`;
    }
  }

  /**
   * Get current progress percentage
   * @returns {number} Progress percentage (0-100)
   */
  getPercentage() {
    if (this.totalSteps === 0) return 0;
    return Math.min(100, Math.max(0, (this.currentStep / this.totalSteps) * 100));
  }
}

// Create singleton instance
let loadingProgressManager = null;

/**
 * Get or create loading progress manager instance
 * @returns {LoadingProgressManager} Loading progress manager instance
 */
export function getLoadingProgressManager() {
  if (!loadingProgressManager) {
    loadingProgressManager = new LoadingProgressManager();
  }
  return loadingProgressManager;
}

