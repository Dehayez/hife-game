/**
 * VibrationManager.js
 * 
 * Utility for managing gamepad vibration/haptic feedback.
 * Provides different vibration patterns for various game mechanics.
 */

import {
  getVibrationPattern,
  getMechanicVibration,
  getDamageVibration,
  getHealingVibrationInterval
} from '../config/global/VibrationConfig.js';

export class VibrationManager {
  /**
   * Create a new VibrationManager
   * @param {Object} inputManager - Input manager instance to access gamepad
   */
  constructor(inputManager) {
    this.inputManager = inputManager;
    this._vibrationQueue = [];
    this._isVibrating = false;
    this.intensity = 1.0; // Intensity multiplier (0.0 to 1.0)
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
   * Set vibration intensity multiplier
   * @param {number} intensity - Intensity multiplier (0.0 to 1.0)
   */
  setIntensity(intensity) {
    this.intensity = Math.max(0, Math.min(1, intensity));
  }

  /**
   * Get current vibration intensity multiplier
   * @returns {number} Current intensity multiplier (0.0 to 1.0)
   */
  getIntensity() {
    return this.intensity;
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

    // Apply intensity multiplier
    strongMagnitude = strongMagnitude * this.intensity;
    weakMagnitude = weakMagnitude * this.intensity;

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
   * @param {number} duration - Duration in milliseconds (optional, uses config default if not provided)
   */
  light(duration = null) {
    const pattern = getVibrationPattern('light');
    this.vibrate(
      pattern.strongMagnitude,
      pattern.weakMagnitude,
      duration !== null ? duration : pattern.duration
    );
  }

  /**
   * Medium vibration - for regular actions
   * @param {number} duration - Duration in milliseconds (optional, uses config default if not provided)
   */
  medium(duration = null) {
    const pattern = getVibrationPattern('medium');
    this.vibrate(
      pattern.strongMagnitude,
      pattern.weakMagnitude,
      duration !== null ? duration : pattern.duration
    );
  }

  /**
   * Heavy vibration - for impactful actions
   * @param {number} duration - Duration in milliseconds (optional, uses config default if not provided)
   */
  heavy(duration = null) {
    const pattern = getVibrationPattern('heavy');
    this.vibrate(
      pattern.strongMagnitude,
      pattern.weakMagnitude,
      duration !== null ? duration : pattern.duration
    );
  }

  /**
   * Very heavy vibration - for critical events
   * @param {number} duration - Duration in milliseconds (optional, uses config default if not provided)
   */
  veryHeavy(duration = null) {
    const pattern = getVibrationPattern('veryHeavy');
    this.vibrate(
      pattern.strongMagnitude,
      pattern.weakMagnitude,
      duration !== null ? duration : pattern.duration
    );
  }

  /**
   * Pulse vibration - for repeating actions
   * @param {number} count - Number of pulses
   * @param {number} pulseDuration - Duration of each pulse in milliseconds
   * @param {number} interval - Interval between pulses in milliseconds
   * @param {number} magnitude - Vibration magnitude (0.0 to 1.0) - will be multiplied by intensity
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
    const config = getMechanicVibration('jump');
    this.vibrate(config.strongMagnitude, config.weakMagnitude, config.duration);
  }

  /**
   * Double jump vibration
   */
  doubleJump() {
    const config = getMechanicVibration('doubleJump');
    this.pulse(config.pulseCount, config.pulseDuration, config.pulseInterval, config.magnitude);
  }

  /**
   * Landing vibration
   */
  land() {
    const config = getMechanicVibration('land');
    this.vibrate(config.strongMagnitude, config.weakMagnitude, config.duration);
  }

  /**
   * Shoot bolt vibration
   */
  shoot() {
    const config = getMechanicVibration('shoot');
    this.vibrate(config.strongMagnitude, config.weakMagnitude, config.duration);
  }

  /**
   * Shoot mortar vibration
   */
  mortar() {
    const config = getMechanicVibration('mortar');
    this.vibrate(config.strongMagnitude, config.weakMagnitude, config.duration);
  }

  /**
   * Mortar explosion vibration
   */
  mortarExplosion() {
    const config = getMechanicVibration('mortarExplosion');
    this.vibrate(config.strongMagnitude, config.weakMagnitude, config.duration);
  }

  /**
   * Mortar explosion vibration scaled by distance
   * @param {number} distance - Distance from player to explosion (in game units)
   * @param {number} maxDistance - Maximum distance for vibration (default: 8)
   */
  mortarExplosionDistance(distance, maxDistance = 8) {
    const config = getMechanicVibration('mortarExplosion');
    
    // Clamp distance to maxDistance
    const clampedDistance = Math.min(distance, maxDistance);
    
    // Calculate intensity based on distance
    // Closer = stronger (1.0), further = weaker (0.0)
    // Use a very aggressive exponential falloff for quiet distant vibrations
    // Formula: intensity = 1 - (distance/maxDistance)^5.0
    // Higher power = much steeper falloff = very quiet when far away
    const normalizedDistance = clampedDistance / maxDistance;
    const intensity = 1.0 - Math.pow(normalizedDistance, 5.0);
    
    // Minimum intensity threshold (don't vibrate if too far)
    // Higher threshold means vibrations stop much earlier
    const minIntensity = 0.3;
    if (intensity < minIntensity) {
      return; // Too far, no vibration
    }
    
    // Scale vibration magnitudes by distance intensity
    // This ensures far explosions have very quiet vibration
    const strongMagnitude = config.strongMagnitude * intensity;
    const weakMagnitude = config.weakMagnitude * intensity;
    
    this.vibrate(strongMagnitude, weakMagnitude, config.duration);
  }

  /**
   * Take damage vibration
   * @param {number} damage - Damage amount (for scaling intensity)
   */
  takeDamage(damage = 0) {
    const config = getDamageVibration(damage);
    this.vibrate(config.strongMagnitude, config.weakMagnitude, config.duration);
  }

  /**
   * Death vibration
   */
  death() {
    const config = getMechanicVibration('death');
    this.pulse(config.pulseCount, config.pulseDuration, config.pulseInterval, config.magnitude);
  }

  /**
   * Healing vibration
   */
  heal() {
    const config = getMechanicVibration('heal');
    this.vibrate(config.strongMagnitude, config.weakMagnitude, config.duration);
  }

  /**
   * Sword swing vibration
   */
  swordSwing() {
    const config = getMechanicVibration('swordSwing');
    this.vibrate(config.strongMagnitude, config.weakMagnitude, config.duration);
  }

  /**
   * Character swap vibration
   */
  characterSwap() {
    const config = getMechanicVibration('characterSwap');
    this.pulse(config.pulseCount, config.pulseDuration, config.pulseInterval, config.magnitude);
  }

  /**
   * Respawn vibration
   */
  respawn() {
    const config = getMechanicVibration('respawn');
    this.pulse(config.pulseCount, config.pulseDuration, config.pulseInterval, config.magnitude);
  }

  /**
   * Projectile hit vibration (when you hit something)
   */
  projectileHit() {
    const config = getMechanicVibration('projectileHit');
    this.vibrate(config.strongMagnitude, config.weakMagnitude, config.duration);
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
