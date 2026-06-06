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
   * Set total number of steps
   * @param {number} total - Total number of steps
   */
  setTotalSteps(total) {
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
   * Set progress to a specific step
   * @param {number} step - Step number (0-based)
   * @param {string} task - Description of current task
   */
  setProgress(step, task = '') {
    this.currentStep = step;
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
      // If total steps not set, calculate from percentage
      this.currentStep = Math.round((percentage / 100) * 100);
      this.totalSteps = 100;
    } else {
      this.currentStep = Math.round((percentage / 100) * this.totalSteps);
    }
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

    // Wand progress is an SVG <rect> inside a 0–800 viewBox, so width is
    // expressed in viewBox units. The DOM element still gets style.width as
    // a fallback in case a future CSS swap reverts to a plain div.
    const displayWidth = Math.max(1, percentage);
    if (this.barElement.tagName === 'rect' || this.barElement.tagName === 'RECT') {
      this.barElement.setAttribute('width', String((displayWidth / 100) * 800));
    } else {
      this.barElement.style.width = `${displayWidth}%`;
    }

    // Inscribe the integer percent inside the wand fill.
    if (this.percentElement) {
      this.percentElement.textContent = `${Math.round(percentage)}%`;
    }

    // The bottom line is owned by the splash rotator (see index.html) and
    // cycles handwritten taglines on a timer. We intentionally do NOT write
    // the caller-supplied `task` here so it can't stomp the rotator mid-fade.
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

