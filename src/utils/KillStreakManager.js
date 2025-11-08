/**
 * KillStreakManager.js
 * 
 * Manages satisfying kill feedback displays (KILL, DOUBLE KILL, TRIPLE KILL, etc.)
 * Similar to floating damage numbers but for kill streaks.
 */

export class KillStreakManager {
  constructor() {
    this.killStreaks = [];
    this.lastKillTime = 0;
    this.streakWindow = 6.0; // Time window in seconds for kill streaks
    this.currentStreak = 0;
    this.container = null;
  }

  /**
   * Initialize kill streak container
   */
  _initContainer() {
    if (this.container) return;
    
    this.container = document.createElement('div');
    this.container.style.position = 'fixed';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = '10000'; // Above other UI elements
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.justifyContent = 'flex-start';
    this.container.style.alignItems = 'center';
    this.container.style.paddingTop = '80px';
    
    document.body.appendChild(this.container);
  }

  /**
   * Get kill streak text based on streak count
   * @param {number} streak - Current streak count
   * @returns {string} Kill streak text
   */
  _getStreakText(streak) {
    if (streak === 1) return 'KILL';
    if (streak === 2) return 'DOUBLE KILL';
    if (streak === 3) return 'TRIPLE KILL';
    if (streak === 4) return 'QUAD KILL';
    if (streak === 5) return 'PENTA KILL';
    if (streak >= 6) return `${streak}x KILL STREAK`;
    return 'KILL';
  }

  /**
   * Get color for kill streak based on streak count
   * @param {number} streak - Current streak count
   * @returns {string} Hex color string
   */
  _getStreakColor(streak) {
    if (streak === 1) return '#ff4444'; // Red
    if (streak === 2) return '#ff8844'; // Orange
    if (streak === 3) return '#ffaa44'; // Yellow-orange
    if (streak === 4) return '#ffcc44'; // Gold
    if (streak === 5) return '#ffff44'; // Yellow
    return '#ffffff'; // White for higher streaks
  }

  /**
   * Create a kill streak display element
   * @param {number} streak - Current streak count
   * @returns {HTMLElement} Kill streak element
   */
  _createKillStreakElement(streak) {
    this._initContainer();
    
    const element = document.createElement('div');
    const text = this._getStreakText(streak);
    const color = this._getStreakColor(streak);
    
    element.textContent = text;
    element.style.position = 'relative';
    element.style.fontSize = streak === 1 ? '32px' : streak === 2 ? '36px' : streak >= 3 ? '40px' : '44px';
    element.style.fontWeight = '900';
    element.style.color = color;
    element.style.textShadow = `
      0 0 10px ${color},
      0 0 20px ${color},
      0 0 30px ${color},
      0 4px 8px rgba(0, 0, 0, 0.8),
      0 8px 16px rgba(0, 0, 0, 0.6)
    `;
    element.style.fontFamily = 'Arial, sans-serif';
    element.style.letterSpacing = '4px';
    element.style.textTransform = 'uppercase';
    element.style.opacity = '0';
    element.style.transform = 'scale(0.5) translateY(0px)';
    element.style.transition = 'none';
    element.style.userSelect = 'none';
    element.style.whiteSpace = 'nowrap';
    
    this.container.appendChild(element);
    
    // Trigger animation
    requestAnimationFrame(() => {
      element.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
      element.style.opacity = '1';
      element.style.transform = 'scale(1) translateY(0px)';
      
      // Scale up and down effect
      setTimeout(() => {
        element.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        element.style.transform = 'scale(1.1) translateY(-20px)';
      }, 200);
      
      // Fade out and move up
      setTimeout(() => {
        element.style.transition = 'all 0.8s ease-out';
        element.style.opacity = '0';
        element.style.transform = 'scale(0.9) translateY(-60px)';
        
        // Remove element after animation
        setTimeout(() => {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
        }, 800);
      }, 1000);
    });
    
    return element;
  }

  /**
   * Register a kill
   * @param {number} currentTime - Current game time in seconds
   */
  registerKill(currentTime) {
    this._initContainer();
    
    // Check if kill is within streak window
    const timeSinceLastKill = currentTime - this.lastKillTime;
    
    if (timeSinceLastKill <= this.streakWindow && this.lastKillTime > 0) {
      // Continue streak
      this.currentStreak++;
    } else {
      // Start new streak
      this.currentStreak = 1;
    }
    
    this.lastKillTime = currentTime;
    
    // Create kill streak display
    this._createKillStreakElement(this.currentStreak);
    
    // Store streak info for potential future use
    this.killStreaks.push({
      streak: this.currentStreak,
      time: currentTime
    });
    
    // Clean up old streaks
    this.killStreaks = this.killStreaks.filter(
      kill => currentTime - kill.time <= this.streakWindow * 2
    );
  }

  /**
   * Update kill streak manager
   * @param {number} dt - Delta time in seconds
   * @param {number} currentTime - Current game time in seconds
   */
  update(dt, currentTime) {
    // Reset streak if too much time has passed
    const timeSinceLastKill = currentTime - this.lastKillTime;
    if (timeSinceLastKill > this.streakWindow && this.currentStreak > 0) {
      this.currentStreak = 0;
    }
  }

  /**
   * Reset kill streak
   */
  reset() {
    this.currentStreak = 0;
    this.lastKillTime = 0;
    this.killStreaks = [];
  }

  /**
   * Get current streak count
   * @returns {number} Current streak count
   */
  getCurrentStreak() {
    return this.currentStreak;
  }

  /**
   * Cleanup
   */
  dispose() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.reset();
  }
}

