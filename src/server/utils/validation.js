/**
 * validation.js
 * 
 * Server-side validation utilities for secure multiplayer gameplay.
 * Validates all incoming data to prevent cheating and ensure fair play.
 */

import { ARENA_CONFIG } from '../../config/arena/ArenaConfig.js';
import { BASE_ENTITY_STATS } from '../../config/global/BaseEntityStats.js';
import { GAME_CONSTANTS } from '../../config/global/GameConstants.js';

// Validation constants
const VALIDATION_LIMITS = {
  MAX_POSITION_DELTA: 10, // Maximum position change per update (units)
  MAX_SPEED: 15, // Maximum movement speed (units per second)
  MAX_ROTATION_DELTA: Math.PI * 2, // Maximum rotation change
  MIN_HEALTH: 0,
  MAX_HEALTH: BASE_ENTITY_STATS.health.maxHealth,
  MAX_DAMAGE: BASE_ENTITY_STATS.health.maxHealth,
  MAX_PROJECTILE_SPEED: 30, // Maximum projectile speed
  MAX_ARENA_SIZE: 50, // Maximum arena size for bounds checking
  MIN_ARENA_SIZE: -50,
  MAX_Y_POSITION: 20, // Maximum Y position (jump height limit)
  MIN_Y_POSITION: -5 // Minimum Y position (below ground)
};

// Rate limiting configuration
const RATE_LIMITS = {
  'player-state': { maxPerSecond: 20, windowMs: 1000 },
  'projectile-create': { maxPerSecond: 5, windowMs: 1000 },
  'projectile-update': { maxPerSecond: 30, windowMs: 1000 },
  'player-damage': { maxPerSecond: 10, windowMs: 1000 },
  'character-change': { maxPerSecond: 2, windowMs: 1000 },
  'world-event': { maxPerSecond: 40, windowMs: 1000 }
};

// Valid character names
// Canonical character names — exposed as the source of truth.
const VALID_CHARACTERS = ['lucy', 'herald', 'babyHerald'];

/**
 * Normalize an incoming character name to its canonical form.
 * Returns null if the name does not match any valid character.
 */
function canonicalizeCharacterName(name) {
  if (typeof name !== 'string') return null;
  const lower = name.toLowerCase();
  return VALID_CHARACTERS.find(c => c.toLowerCase() === lower) || null;
}

// Valid animation keys (common ones - can be extended)
const VALID_ANIMATION_KEYS = [
  'idle_front', 'idle_back', 'walk_front', 'walk_back',
  'run_front', 'run_back', 'jump_front', 'jump_back',
  'spawn_front', 'spawn_back', 'roll'
];

/**
 * Sanitize a number to ensure it's valid and within bounds
 * @param {*} value - Value to sanitize
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} Sanitized number
 */
export function sanitizeNumber(value, min = -Infinity, max = Infinity, defaultValue = 0) {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num) || !isFinite(num)) {
    return defaultValue;
  }
  return Math.max(min, Math.min(max, num));
}

/**
 * Sanitize a string to prevent injection attacks
 * @param {*} value - Value to sanitize
 * @param {number} maxLength - Maximum length
 * @param {string} defaultValue - Default value if invalid
 * @returns {string} Sanitized string
 */
export function sanitizeString(value, maxLength = 100, defaultValue = '') {
  if (typeof value !== 'string') {
    return defaultValue;
  }
  // Remove any potentially dangerous characters
  const sanitized = value.trim().slice(0, maxLength).replace(/[<>\"'&]/g, '');
  return sanitized || defaultValue;
}

/**
 * Validate room code format
 * @param {string} roomCode - Room code to validate
 * @returns {boolean} True if valid
 */
export function validateRoomCode(roomCode) {
  if (typeof roomCode !== 'string') {
    return false;
  }
  // Room codes should be 6 uppercase alphanumeric characters
  return /^[A-Z0-9]{6}$/.test(roomCode);
}

/**
 * Validate character name
 * @param {string} characterName - Character name to validate
 * @returns {boolean} True if valid
 */
export function validateCharacterName(characterName) {
  return canonicalizeCharacterName(characterName) !== null;
}

/**
 * Validate player position
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} z - Z position
 * @param {string} arena - Arena name
 * @param {Object} previousPosition - Previous position for delta validation
 * @returns {Object} { valid: boolean, position: {x, y, z}, error: string }
 */
export function validatePlayerPosition(x, y, z, arena = 'standard', previousPosition = null) {
  const arenaConfig = ARENA_CONFIG[arena] || ARENA_CONFIG['standard'];
  const arenaSize = arenaConfig.size;
  const halfSize = arenaSize / 2;
  const bounds = halfSize + 2; // Allow 2 units outside bounds for edge cases

  // Sanitize positions
  const sanitizedX = sanitizeNumber(x, -bounds, bounds, 0);
  const sanitizedY = sanitizeNumber(y, VALIDATION_LIMITS.MIN_Y_POSITION, VALIDATION_LIMITS.MAX_Y_POSITION, 0);
  const sanitizedZ = sanitizeNumber(z, -bounds, bounds, 0);

  const position = { x: sanitizedX, y: sanitizedY, z: sanitizedZ };

  // Check delta if previous position exists (anti-teleport)
  if (previousPosition) {
    const dx = sanitizedX - previousPosition.x;
    const dy = sanitizedY - previousPosition.y;
    const dz = sanitizedZ - previousPosition.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance > VALIDATION_LIMITS.MAX_POSITION_DELTA) {
      return {
        valid: false,
        position: previousPosition, // Keep previous position
        error: `Position delta too large: ${distance.toFixed(2)} > ${VALIDATION_LIMITS.MAX_POSITION_DELTA}`
      };
    }
  }

  return { valid: true, position, error: null };
}

/**
 * Validate player rotation
 * @param {number} rotation - Rotation value
 * @returns {number} Valid rotation value
 */
export function validateRotation(rotation) {
  const sanitized = sanitizeNumber(rotation, -Math.PI * 2, Math.PI * 2, 0);
  // Normalize to [-PI, PI]
  let normalized = sanitized;
  while (normalized > Math.PI) normalized -= Math.PI * 2;
  while (normalized < -Math.PI) normalized += Math.PI * 2;
  return normalized;
}

/**
 * Validate player state object
 * @param {Object} state - Player state object
 * @param {Object} previousState - Previous state for validation
 * @param {string} arena - Arena name
 * @returns {Object} { valid: boolean, state: Object, error: string }
 */
export function validatePlayerState(state, previousState = null, arena = 'standard') {
  if (!state || typeof state !== 'object') {
    return { valid: false, state: null, error: 'Invalid state object' };
  }

  // Validate position
  const positionValidation = validatePlayerPosition(
    state.x,
    state.y,
    state.z,
    arena,
    previousState ? { x: previousState.x, y: previousState.y, z: previousState.z } : null
  );

  if (!positionValidation.valid) {
    return { valid: false, state: null, error: positionValidation.error };
  }

  // Validate rotation
  const rotation = validateRotation(state.rotation);

  // Validate animation key
  const currentAnimKey = sanitizeString(state.currentAnimKey, 50, 'idle_front');
  const lastFacing = sanitizeString(state.lastFacing, 10, 'front');

  // Validate boolean flags
  const isGrounded = typeof state.isGrounded === 'boolean' ? state.isGrounded : true;
  const isRunning = typeof state.isRunning === 'boolean' ? state.isRunning : false;
  const isRolling = typeof state.isRolling === 'boolean' ? state.isRolling : false;

  return {
    valid: true,
    state: {
      x: positionValidation.position.x,
      y: positionValidation.position.y,
      z: positionValidation.position.z,
      rotation,
      currentAnimKey,
      lastFacing,
      isGrounded,
      isRunning,
      isRolling
    },
    error: null
  };
}

/**
 * Validate projectile data
 * @param {Object} projectileData - Projectile data
 * @param {string} arena - Arena name
 * @returns {Object} { valid: boolean, data: Object, error: string }
 */
export function validateProjectileData(projectileData, arena = 'standard') {
  if (!projectileData || typeof projectileData !== 'object') {
    return { valid: false, data: null, error: 'Invalid projectile data' };
  }

  const arenaConfig = ARENA_CONFIG[arena] || ARENA_CONFIG['standard'];
  const arenaSize = arenaConfig.size;
  const halfSize = arenaSize / 2;
  const bounds = halfSize + 5; // Allow projectiles slightly outside bounds

  // Validate projectile type
  const type = sanitizeString(projectileData.type, 20, 'bolt');
  if (!['bolt', 'mortar'].includes(type)) {
    return { valid: false, data: null, error: 'Invalid projectile type' };
  }

  // Validate positions
  const startX = sanitizeNumber(projectileData.startX, -bounds, bounds, 0);
  const startY = sanitizeNumber(projectileData.startY, VALIDATION_LIMITS.MIN_Y_POSITION, VALIDATION_LIMITS.MAX_Y_POSITION + 10, 0);
  const startZ = sanitizeNumber(projectileData.startZ, -bounds, bounds, 0);

  // Validate direction (should be normalized vector)
  const directionX = sanitizeNumber(projectileData.directionX, -1, 1, 0);
  const directionZ = sanitizeNumber(projectileData.directionZ, -1, 1, 0);
  const directionLength = Math.sqrt(directionX * directionX + directionZ * directionZ);
  if (directionLength > 1.1) { // Allow slight tolerance
    return { valid: false, data: null, error: 'Invalid direction vector' };
  }

  // Validate projectile ID
  const projectileId = sanitizeString(projectileData.projectileId, 100, '');

  // Validate character name (preserve canonical casing)
  const characterName = canonicalizeCharacterName(projectileData.characterName) || 'lucy';

  return {
    valid: true,
    data: {
      type,
      startX,
      startY,
      startZ,
      directionX,
      directionZ,
      projectileId,
      characterName,
      targetX: projectileData.targetX ? sanitizeNumber(projectileData.targetX, -bounds, bounds, startX) : startX,
      targetZ: projectileData.targetZ ? sanitizeNumber(projectileData.targetZ, -bounds, bounds, startZ) : startZ
    },
    error: null
  };
}

/**
 * Validate projectile update data
 * @param {Object} updateData - Projectile update data
 * @param {string} arena - Arena name
 * @returns {Object} { valid: boolean, data: Object, error: string }
 */
export function validateProjectileUpdate(updateData, arena = 'standard') {
  if (!updateData || typeof updateData !== 'object') {
    return { valid: false, data: null, error: 'Invalid update data' };
  }

  const arenaConfig = ARENA_CONFIG[arena] || ARENA_CONFIG['standard'];
  const arenaSize = arenaConfig.size;
  const halfSize = arenaSize / 2;
  const bounds = halfSize + 5;

  const projectileId = sanitizeString(updateData.projectileId, 100, '');
  if (!projectileId) {
    return { valid: false, data: null, error: 'Missing projectile ID' };
  }

  const x = sanitizeNumber(updateData.x, -bounds, bounds, 0);
  const y = sanitizeNumber(updateData.y, VALIDATION_LIMITS.MIN_Y_POSITION, VALIDATION_LIMITS.MAX_Y_POSITION + 10, 0);
  const z = sanitizeNumber(updateData.z, -bounds, bounds, 0);

  // Validate velocity
  const velocityX = sanitizeNumber(updateData.velocityX, -VALIDATION_LIMITS.MAX_PROJECTILE_SPEED, VALIDATION_LIMITS.MAX_PROJECTILE_SPEED, 0);
  const velocityZ = sanitizeNumber(updateData.velocityZ, -VALIDATION_LIMITS.MAX_PROJECTILE_SPEED, VALIDATION_LIMITS.MAX_PROJECTILE_SPEED, 0);

  return {
    valid: true,
    data: {
      projectileId,
      x,
      y,
      z,
      velocityX,
      velocityZ
    },
    error: null
  };
}

/**
 * Validate damage data
 * @param {Object} damageData - Damage data
 * @returns {Object} { valid: boolean, data: Object, error: string }
 */
export function validateDamageData(damageData) {
  if (!damageData || typeof damageData !== 'object') {
    return { valid: false, data: null, error: 'Invalid damage data' };
  }

  const damage = sanitizeNumber(damageData.damage, 0, VALIDATION_LIMITS.MAX_DAMAGE, 0);
  const health = sanitizeNumber(damageData.health, VALIDATION_LIMITS.MIN_HEALTH, VALIDATION_LIMITS.MAX_HEALTH, VALIDATION_LIMITS.MAX_HEALTH);
  const maxHealth = sanitizeNumber(damageData.maxHealth, VALIDATION_LIMITS.MAX_HEALTH, VALIDATION_LIMITS.MAX_HEALTH, VALIDATION_LIMITS.MAX_HEALTH);

  // Validate health doesn't exceed max
  const validHealth = Math.min(health, maxHealth);

  return {
    valid: true,
    data: {
      damage,
      health: validHealth,
      maxHealth
    },
    error: null
  };
}

/**
 * Validate game state object
 * @param {Object} gameState - Game state object
 * @returns {Object} { valid: boolean, state: Object, error: string }
 */
export function validateGameState(gameState) {
  if (!gameState || typeof gameState !== 'object') {
    return { valid: true, state: {}, error: null }; // Allow empty game state
  }

  const characterName = canonicalizeCharacterName(gameState.characterName) || 'lucy';

  const arena = sanitizeString(gameState.arena, 20, 'standard');
  const gameMode = sanitizeString(gameState.gameMode, 20, 'free-play');

  const state = {
    characterName,
    arena,
    gameMode
  };

  // Optional spawn-position hint included in the join/create handshake so the
  // server can tell other players where this socket appeared without waiting
  // for the first player-state tick.
  if (gameState.position && typeof gameState.position === 'object') {
    const positionValidation = validatePlayerPosition(
      gameState.position.x,
      gameState.position.y,
      gameState.position.z,
      arena,
      null
    );
    if (positionValidation.valid) {
      state.position = positionValidation.position;
    }
  }

  return {
    valid: true,
    state,
    error: null
  };
}

/**
 * Rate limiter class
 */
export class RateLimiter {
  constructor() {
    this.requests = new Map(); // socketId -> { eventType -> [{ timestamp }] }
  }

  /**
   * Check if request should be allowed
   * @param {string} socketId - Socket ID
   * @param {string} eventType - Event type
   * @returns {boolean} True if allowed
   */
  isAllowed(socketId, eventType) {
    const limit = RATE_LIMITS[eventType];
    if (!limit) {
      return true; // No limit for this event type
    }

    if (!this.requests.has(socketId)) {
      this.requests.set(socketId, new Map());
    }

    const socketRequests = this.requests.get(socketId);
    if (!socketRequests.has(eventType)) {
      socketRequests.set(eventType, []);
    }

    const timestamps = socketRequests.get(eventType);
    const now = Date.now();

    // Remove old timestamps outside the window
    const windowStart = now - limit.windowMs;
    const validTimestamps = timestamps.filter(ts => ts > windowStart);
    socketRequests.set(eventType, validTimestamps);

    // Check if limit exceeded
    if (validTimestamps.length >= limit.maxPerSecond) {
      return false;
    }

    // Add current timestamp
    validTimestamps.push(now);
    return true;
  }

  /**
   * Clear rate limit data for a socket
   * @param {string} socketId - Socket ID
   */
  clear(socketId) {
    this.requests.delete(socketId);
  }

  /**
   * Clear all rate limit data
   */
  clearAll() {
    this.requests.clear();
  }
}

// Export validation limits for use in other modules
export { VALIDATION_LIMITS, RATE_LIMITS };

