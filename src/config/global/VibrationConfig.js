/**
 * VibrationConfig.js
 * 
 * Centralized configuration for all gamepad vibration/haptic feedback settings.
 * This file provides a clear view of every vibration pattern that can be edited.
 */

/**
 * Vibration Configuration Stats
 * 
 * All settings related to gamepad vibration patterns, intensities, and durations.
 */
export const VIBRATION_CONFIG = {
  /**
   * Base Vibration Patterns
   */
  patterns: {
    light: {
      strongMagnitude: 0.2,
      weakMagnitude: 0.3,
      duration: 50  // milliseconds
    },
    medium: {
      strongMagnitude: 0.4,
      weakMagnitude: 0.5,
      duration: 100  // milliseconds
    },
    heavy: {
      strongMagnitude: 0.7,
      weakMagnitude: 0.8,
      duration: 150  // milliseconds
    },
    veryHeavy: {
      strongMagnitude: 1.0,
      weakMagnitude: 1.0,
      duration: 200  // milliseconds
    }
  },

  /**
   * Game Mechanic Vibration Settings
   */
  mechanics: {
    jump: {
      strongMagnitude: 0.4,
      weakMagnitude: 0.5,
      duration: 80  // milliseconds
    },
    doubleJump: {
      pulseCount: 2,
      pulseDuration: 40,  // milliseconds
      pulseInterval: 30,  // milliseconds
      magnitude: 0.6
    },
    land: {
      strongMagnitude: 0.4,
      weakMagnitude: 0.5,
      duration: 100  // milliseconds
    },
    shoot: {
      strongMagnitude: 0.2,
      weakMagnitude: 0.3,
      duration: 60  // milliseconds
    },
    mortar: {
      strongMagnitude: 1.0,
      weakMagnitude: 1.0,
      duration: 180  // milliseconds
    },
    mortarExplosion: {
      strongMagnitude: 1.0,
      weakMagnitude: 1.0,
      duration: 250  // milliseconds
    },
    takeDamage: {
      // Damage thresholds for scaling vibration intensity
      thresholds: {
        low: {
          damageMax: 24,
          strongMagnitude: 0.4,
          weakMagnitude: 0.5,
          duration: 120  // milliseconds
        },
        medium: {
          damageMax: 49,
          strongMagnitude: 0.7,
          weakMagnitude: 0.8,
          duration: 150  // milliseconds
        },
        high: {
          damageMax: Infinity,
          strongMagnitude: 1.0,
          weakMagnitude: 1.0,
          duration: 200  // milliseconds
        }
      }
    },
    death: {
      pulseCount: 4,
      pulseDuration: 100,  // milliseconds
      pulseInterval: 80,   // milliseconds
      magnitude: 0.8
    },
    heal: {
      strongMagnitude: 0.2,
      weakMagnitude: 0.3,
      duration: 40  // milliseconds
    },
    swordSwing: {
      strongMagnitude: 0.7,
      weakMagnitude: 0.8,
      duration: 100  // milliseconds
    },
    characterSwap: {
      pulseCount: 2,
      pulseDuration: 60,   // milliseconds
      pulseInterval: 40,   // milliseconds
      magnitude: 0.5
    },
    respawn: {
      pulseCount: 3,
      pulseDuration: 50,   // milliseconds
      pulseInterval: 50,   // milliseconds
      magnitude: 0.4
    },
    projectileHit: {
      strongMagnitude: 0.4,
      weakMagnitude: 0.5,
      duration: 80  // milliseconds
    }
  },

  /**
   * Healing Vibration Throttle Settings
   */
  healing: {
    vibrationInterval: 0.0001  // seconds between vibrations during continuous healing
  },

  /**
   * Vibration Intensity/Volume Multiplier
   * Applied to all vibration magnitudes (0.0 to 1.0)
   */
  defaultIntensity: 0.001  // Default intensity multiplier (-12dB reduction, significantly reduced)
};

/**
 * Get base vibration pattern
 * @param {string} patternName - Pattern name ('light', 'medium', 'heavy', 'veryHeavy')
 * @returns {Object} Vibration pattern configuration
 */
export function getVibrationPattern(patternName) {
  return VIBRATION_CONFIG.patterns[patternName] || VIBRATION_CONFIG.patterns.medium;
}

/**
 * Get vibration settings for a specific game mechanic
 * @param {string} mechanicName - Mechanic name
 * @returns {Object} Vibration settings for the mechanic
 */
export function getMechanicVibration(mechanicName) {
  return VIBRATION_CONFIG.mechanics[mechanicName] || null;
}

/**
 * Get damage-based vibration settings
 * @param {number} damage - Damage amount
 * @returns {Object} Vibration settings scaled by damage
 */
export function getDamageVibration(damage) {
  const damageConfig = VIBRATION_CONFIG.mechanics.takeDamage.thresholds;
  
  if (damage >= 50) {
    return damageConfig.high;
  } else if (damage >= 25) {
    return damageConfig.medium;
  } else {
    return damageConfig.low;
  }
}

/**
 * Get healing vibration throttle interval
 * @returns {number} Vibration interval in seconds
 */
export function getHealingVibrationInterval() {
  return VIBRATION_CONFIG.healing.vibrationInterval;
}

/**
 * Get default vibration intensity multiplier
 * @returns {number} Default intensity multiplier (0.0 to 1.0)
 */
export function getDefaultVibrationIntensity() {
  return VIBRATION_CONFIG.defaultIntensity;
}
