/**
 * HealthBarStats.js
 * 
 * Centralized configuration for all health bar stats.
 * This file provides a clear view of every health bar stat that can be edited.
 */

/**
 * Health Bar Configuration Stats
 * 
 * All stats related to health bar appearance, colors, and positioning.
 */
export const HEALTH_BAR_STATS = {
  /**
   * Size Configuration
   */
  size: {
    width: 1.0,                // Background bar width
    height: 0.15,              // Background bar height
    healthWidth: 0.96,         // Health bar width (slightly smaller than background)
    healthHeight: 0.12          // Health bar height (slightly smaller than background)
  },
  
  /**
   * Color Configuration
   */
  colors: {
    background: 0x1a3008,      // Dark forest green matching game walls
    highHealth: 0x6ab89a,      // Mystical green (matches UI theme) - >60%
    mediumHealth: 0xff8c42,    // Amber/orange (matches Herald's color) - 30-60%
    lowHealth: 0xcc4444        // Dark red (matches gem color from game) - <30%
  },
  
  /**
   * Opacity Configuration
   */
  opacity: {
    background: 0.8,           // Background opacity
    health: 0.95               // Health bar opacity
  },
  
  /**
   * Positioning Configuration
   */
  position: {
    offsetY: 1.8,              // Vertical offset above target
    healthOffsetX: -0.48,       // Health bar X position (left-aligned)
    healthOffsetZ: 0.001        // Health bar Z position (slightly in front)
  },
  
  /**
   * Rendering Configuration
   */
  rendering: {
    renderOrder: {
      background: 1000,        // Background render order
      health: 1001             // Health bar render order
    },
    billboard: {
      angleThreshold: 0.01,    // Minimum angle change to update (radians)
      interpolationFactor: 0.3 // Rotation interpolation factor for smoothness
    }
  },
  
  /**
   * Health Thresholds
   */
  thresholds: {
    high: 0.6,                 // High health threshold (>60%)
    medium: 0.3                // Medium health threshold (30-60%)
  }
};

/**
 * Get health bar size stats
 * @returns {Object} Size configuration
 */
export function getHealthBarSizeStats() {
  return HEALTH_BAR_STATS.size;
}

/**
 * Get health bar color stats
 * @returns {Object} Color configuration
 */
export function getHealthBarColorStats() {
  return HEALTH_BAR_STATS.colors;
}

/**
 * Get health bar opacity stats
 * @returns {Object} Opacity configuration
 */
export function getHealthBarOpacityStats() {
  return HEALTH_BAR_STATS.opacity;
}

/**
 * Get health bar position stats
 * @returns {Object} Position configuration
 */
export function getHealthBarPositionStats() {
  return HEALTH_BAR_STATS.position;
}

/**
 * Get health bar rendering stats
 * @returns {Object} Rendering configuration
 */
export function getHealthBarRenderingStats() {
  return HEALTH_BAR_STATS.rendering;
}

/**
 * Get health bar thresholds
 * @returns {Object} Health threshold configuration
 */
export function getHealthBarThresholds() {
  return HEALTH_BAR_STATS.thresholds;
}

/**
 * Get color for health percentage
 * @param {number} healthPercent - Health percentage (0-1)
 * @returns {number} Color hex value
 */
export function getHealthColor(healthPercent) {
  const colors = HEALTH_BAR_STATS.colors;
  const thresholds = HEALTH_BAR_STATS.thresholds;
  
  if (healthPercent > thresholds.high) {
    return colors.highHealth;
  } else if (healthPercent > thresholds.medium) {
    return colors.mediumHealth;
  } else {
    return colors.lowHealth;
  }
}

