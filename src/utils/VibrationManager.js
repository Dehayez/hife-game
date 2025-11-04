/**
 * VibrationManager.js
 * 
 * Utility for managing gamepad vibration/haptic feedback.
 * Provides different vibration patterns for various game mechanics.
 */

export class VibrationManager {
  /**
   * Create a new VibrationManager
   * @param {Object} inputManager - Input manager instance to access gamepad
   */
  constructor(inputManager) {
    this.inputManager = inputManager;
    this._vibrationQueue = [];
    this._isVibrating = false;
  }

  /**
   * Get the active gamepad
   * @returns {Gamepad|null} Active gamepad or null
   * @private
   */
  _getGamepad() {
    if (!this.inputManager || !this.inputManager.gamepadConnected) {
      return null;
    }
    
    // Get current gamepad from navigator
    try {
      const gamepads = navigator.getGamepads();
      if (gamepads && this.inputManager.gamepad) {
        const gamepad = gamepads[this.inputManager.gamepad.index];
        if (gamepad && (gamepad.vibrationActuator || (gamepad.hapticActuators && gamepad.hapticActuators.length > 0))) {
          return gamepad;
        }
      }
    } catch (e) {
      // Gamepad API not available
    }
    
    return null;
  }

  /**
   * Check if vibration is supported
   * @returns {boolean} True if vibration is supported
   */
  isSupported() {
    const gamepad = this._getGamepad();
    if (!gamepad) return false;
    
    // Check for modern vibrationActuator API or legacy hapticActuators
    return (gamepad.vibrationActuator !== undefined) || 
           (gamepad.hapticActuators && gamepad.hapticActuators.length > 0);
  }

  /**
   * Vibrate the gamepad
   * @param {number} strongMagnitude - Strong motor vibration (0.0 to 1.0)
   * @param {number} weakMagnitude - Weak motor vibration (0.0 to 1.0)
   * @param {number} duration - Duration in milliseconds
   */
  vibrate(strongMagnitude = 0.5, weakMagnitude = 0.5, duration = 100) {
    const gamepad = this._getGamepad();
    if (!gamepad) return;

    // Clamp magnitudes to valid range
    strongMagnitude = Math.max(0, Math.min(1, strongMagnitude));
    weakMagnitude = Math.max(0, Math.min(1, weakMagnitude));

    // Use modern Gamepad Haptic Actuator API (preferred)
    if (gamepad.vibrationActuator) {
      gamepad.vibrationActuator.playEffect('dual-rumble', {
        duration: duration,
        strongMagnitude: strongMagnitude,
        weakMagnitude: weakMagnitude
      }).catch(() => {
        // Vibration may fail silently (e.g., if already vibrating or not supported)
      });
      return;
    }

    // Fallback to legacy hapticActuators API
    if (gamepad.hapticActuators && gamepad.hapticActuators.length > 0) {
      const actuator = gamepad.hapticActuators[0];
      if (actuator && typeof actuator.playEffect === 'function') {
        actuator.playEffect('dual-rumble', {
          duration: duration,
          strongMagnitude: strongMagnitude,
          weakMagnitude: weakMagnitude
        }).catch(() => {
          // Vibration may fail silently
        });
      }
    }
  }

  /**
   * Light vibration - for minor actions
   * @param {number} duration - Duration in milliseconds (default: 50)
   */
  light(duration = 50) {
    this.vibrate(0.2, 0.3, duration);
  }

  /**
   * Medium vibration - for regular actions
   * @param {number} duration - Duration in milliseconds (default: 100)
   */
  medium(duration = 100) {
    this.vibrate(0.4, 0.5, duration);
  }

  /**
   * Heavy vibration - for impactful actions
   * @param {number} duration - Duration in milliseconds (default: 150)
   */
  heavy(duration = 150) {
    this.vibrate(0.7, 0.8, duration);
  }

  /**
   * Very heavy vibration - for critical events
   * @param {number} duration - Duration in milliseconds (default: 200)
   */
  veryHeavy(duration = 200) {
    this.vibrate(1.0, 1.0, duration);
  }

  /**
   * Pulse vibration - for repeating actions
   * @param {number} count - Number of pulses
   * @param {number} pulseDuration - Duration of each pulse in milliseconds
   * @param {number} interval - Interval between pulses in milliseconds
   * @param {number} magnitude - Vibration magnitude (0.0 to 1.0)
   */
  pulse(count = 3, pulseDuration = 50, interval = 50, magnitude = 0.5) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.vibrate(magnitude, magnitude * 0.8, pulseDuration);
      }, i * (pulseDuration + interval));
    }
  }

  // Specific vibration patterns for game mechanics

  /**
   * Jump vibration
   */
  jump() {
    this.medium(80);
  }

  /**
   * Double jump vibration
   */
  doubleJump() {
    this.pulse(2, 40, 30, 0.6);
  }

  /**
   * Landing vibration
   */
  land() {
    this.medium(100);
  }

  /**
   * Shoot bolt vibration
   */
  shoot() {
    this.light(60);
  }

  /**
   * Shoot mortar vibration
   */
  mortar() {
    this.heavy(120);
  }

  /**
   * Mortar explosion vibration
   */
  mortarExplosion() {
    this.veryHeavy(180);
  }

  /**
   * Take damage vibration
   * @param {number} damage - Damage amount (for scaling intensity)
   */
  takeDamage(damage = 0) {
    // Scale vibration intensity based on damage
    if (damage >= 50) {
      this.veryHeavy(200);
    } else if (damage >= 25) {
      this.heavy(150);
    } else {
      this.medium(120);
    }
  }

  /**
   * Death vibration
   */
  death() {
    this.pulse(4, 100, 80, 0.8);
  }

  /**
   * Healing vibration
   */
  heal() {
    this.light(40);
  }

  /**
   * Sword swing vibration
   */
  swordSwing() {
    this.heavy(100);
  }

  /**
   * Character swap vibration
   */
  characterSwap() {
    this.pulse(2, 60, 40, 0.5);
  }

  /**
   * Respawn vibration
   */
  respawn() {
    this.pulse(3, 50, 50, 0.4);
  }

  /**
   * Projectile hit vibration (when you hit something)
   */
  projectileHit() {
    this.medium(80);
  }

  /**
   * Stop all vibration
   */
  stop() {
    const gamepad = this._getGamepad();
    if (!gamepad) return;

    // Try to cancel any ongoing vibration
    if (gamepad.vibrationActuator && gamepad.vibrationActuator.reset) {
      gamepad.vibrationActuator.reset().catch(() => {
        // Reset may fail silently
      });
    }

    // Clear queue
    this._vibrationQueue = [];
    this._isVibrating = false;
  }
}
