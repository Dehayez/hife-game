/**
 * CooldownUtils.js
 * 
 * Shared utilities for cooldown management.
 * Used across multiple managers to avoid code duplication.
 */

/**
 * Cooldown manager for tracking cooldowns per entity/player
 */
export class CooldownManager {
  constructor() {
    this.cooldowns = new Map();
  }

  /**
   * Set cooldown for an entity
   * @param {string} entityId - Entity/player identifier
   * @param {number} cooldown - Cooldown duration in seconds
   */
  setCooldown(entityId, cooldown) {
    // Validate cooldown value
    if (typeof cooldown !== 'number' || isNaN(cooldown) || !isFinite(cooldown)) {
      // Invalid cooldown - clear it instead of setting
      this.cooldowns.delete(entityId);
      return;
    }
    
    // Set cooldown (even if 0, to ensure it's tracked)
    if (cooldown > 0) {
      this.cooldowns.set(entityId, cooldown);
    } else {
      // Zero or negative cooldown - clear it (cooldown expired)
      this.cooldowns.delete(entityId);
    }
  }

  /**
   * Get current cooldown for an entity
   * @param {string} entityId - Entity/player identifier
   * @returns {number} Remaining cooldown time in seconds
   */
  getCooldown(entityId) {
    return this.cooldowns.get(entityId) || 0;
  }

  /**
   * Check if entity can perform action (cooldown expired)
   * @param {string} entityId - Entity/player identifier
   * @returns {boolean} True if cooldown expired
   */
  canAct(entityId) {
    return this.getCooldown(entityId) <= 0;
  }

  /**
   * Update all cooldowns
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    // Validate dt - must be a valid positive number
    if (typeof dt !== 'number' || isNaN(dt) || dt <= 0 || !isFinite(dt)) {
      // Invalid dt - don't update cooldowns (but don't crash)
      // This can happen if the game loop hasn't started yet or dt is invalid
      return;
    }
    
    // Early return if no cooldowns to update
    if (this.cooldowns.size === 0) {
      return;
    }
    
    // Create array of entries to avoid modification during iteration
    const entries = Array.from(this.cooldowns.entries());
    
    for (const [entityId, cooldown] of entries) {
      // Ensure cooldown is a valid number
      if (typeof cooldown !== 'number' || isNaN(cooldown) || !isFinite(cooldown)) {
        // Invalid cooldown value - remove it
        this.cooldowns.delete(entityId);
        continue;
      }
      
      // Decrement cooldown by delta time
      const newCooldown = cooldown - dt;
      
      if (newCooldown > 0) {
        // Cooldown still active - update value
        this.cooldowns.set(entityId, newCooldown);
      } else {
        // Cooldown expired - remove it
        this.cooldowns.delete(entityId);
      }
    }
  }

  /**
   * Clear all cooldowns
   */
  clear() {
    this.cooldowns.clear();
  }

  /**
   * Clear cooldown for specific entity
   * @param {string} entityId - Entity/player identifier
   */
  clearCooldown(entityId) {
    this.cooldowns.delete(entityId);
  }

  /**
   * Get cooldown info (remaining time and percentage)
   * @param {string} entityId - Entity/player identifier
   * @param {number} maxCooldown - Maximum cooldown time for percentage calculation
   * @returns {Object} Cooldown info with remaining, percentage, and canAct/canShoot flag
   */
  getCooldownInfo(entityId, maxCooldown) {
    const remaining = this.getCooldown(entityId);
    const percentage = maxCooldown > 0 ? (remaining / maxCooldown) : 0;
    
    return {
      remaining,
      percentage: Math.max(0, Math.min(1, percentage)),
      canAct: remaining <= 0,
      canShoot: remaining <= 0 // Alias for canAct for consistency with existing code
    };
  }
}

