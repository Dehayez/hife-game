/**
 * MultiplayerValidation.js
 * 
 * Client-side validation helpers for multiplayer data.
 * Provides early validation before sending data to server.
 */

import { ARENA_CONFIG } from '../config/arena/ArenaConfig.js';
import { BASE_ENTITY_STATS } from '../config/global/BaseEntityStats.js';

// Validation constants (should match server-side limits)
const CLIENT_VALIDATION_LIMITS = {
  MAX_POSITION_DELTA: 10,
  MAX_SPEED: 15,
  MAX_Y_POSITION: 20,
  MIN_Y_POSITION: -5,
  MAX_HEALTH: BASE_ENTITY_STATS.health.maxHealth,
  MIN_HEALTH: 0
};

const VALID_CHARACTERS = ['lucy', 'herald', 'draco'];

function canonicalizeCharacterName(name) {
  if (typeof name !== 'string') return null;
  const lower = name.toLowerCase();
  return VALID_CHARACTERS.find(c => c.toLowerCase() === lower) || null;
}

/**
 * Validate and sanitize player position
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} z - Z position
 * @param {string} arena - Arena name
 * @returns {Object|null} Validated position or null if invalid
 */
export function validateClientPosition(x, y, z, arena = 'standard') {
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
    return null;
  }

  if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
    return null;
  }

  const arenaConfig = ARENA_CONFIG[arena] || ARENA_CONFIG['standard'];
  const arenaSize = arenaConfig.size;
  const halfSize = arenaSize / 2;
  const bounds = halfSize + 2;

  // Check bounds
  if (x < -bounds || x > bounds || z < -bounds || z > bounds) {
    return null;
  }

  if (y < CLIENT_VALIDATION_LIMITS.MIN_Y_POSITION || y > CLIENT_VALIDATION_LIMITS.MAX_Y_POSITION) {
    return null;
  }

  return { x, y, z };
}

/**
 * Validate player state before sending
 * @param {Object} state - Player state object
 * @param {string} arena - Arena name
 * @returns {Object|null} Validated state or null if invalid
 */
export function validateClientPlayerState(state, arena = 'standard') {
  if (!state || typeof state !== 'object') {
    return null;
  }

  const position = validateClientPosition(state.x, state.y, state.z, arena);
  if (!position) {
    return null;
  }

  // Validate rotation
  if (typeof state.rotation !== 'number' || !isFinite(state.rotation)) {
    return null;
  }

  // Validate animation key
  if (typeof state.currentAnimKey !== 'string') {
    return null;
  }

  // Validate facing
  if (typeof state.lastFacing !== 'string') {
    return null;
  }

  // Validate boolean flags
  if (typeof state.isGrounded !== 'boolean' || 
      typeof state.isRunning !== 'boolean' || 
      typeof state.isRolling !== 'boolean') {
    return null;
  }

  return {
    x: position.x,
    y: position.y,
    z: position.z,
    rotation: state.rotation,
    currentAnimKey: state.currentAnimKey,
    lastFacing: state.lastFacing,
    isGrounded: state.isGrounded,
    isRunning: state.isRunning,
    isRolling: state.isRolling
  };
}

/**
 * Validate projectile data before sending
 * @param {Object} projectileData - Projectile data
 * @param {string} arena - Arena name
 * @returns {Object|null} Validated data or null if invalid
 */
export function validateClientProjectileData(projectileData, arena = 'standard') {
  if (!projectileData || typeof projectileData !== 'object') {
    return null;
  }

  // Validate type
  if (!['bolt', 'mortar'].includes(projectileData.type)) {
    return null;
  }

  // Validate position
  const position = validateClientPosition(
    projectileData.startX, 
    projectileData.startY, 
    projectileData.startZ, 
    arena
  );
  if (!position) {
    return null;
  }

  // Validate direction
  if (typeof projectileData.directionX !== 'number' || 
      typeof projectileData.directionZ !== 'number' ||
      !isFinite(projectileData.directionX) ||
      !isFinite(projectileData.directionZ)) {
    return null;
  }

  const dirLength = Math.sqrt(
    projectileData.directionX * projectileData.directionX + 
    projectileData.directionZ * projectileData.directionZ
  );
  if (dirLength > 1.1) {
    return null; // Direction vector should be normalized
  }

  // Validate projectile ID
  if (typeof projectileData.projectileId !== 'string' || !projectileData.projectileId) {
    return null;
  }

  // Validate character name (preserve canonical casing)
  const canonicalCharacter = canonicalizeCharacterName(projectileData.characterName);
  if (!canonicalCharacter) {
    return null;
  }

  return {
    type: projectileData.type,
    startX: position.x,
    startY: position.y,
    startZ: position.z,
    directionX: projectileData.directionX,
    directionZ: projectileData.directionZ,
    projectileId: projectileData.projectileId,
    characterName: canonicalCharacter,
    targetX: projectileData.targetX || position.x,
    targetZ: projectileData.targetZ || position.z
  };
}

/**
 * Validate damage data before sending
 * @param {Object} damageData - Damage data
 * @returns {Object|null} Validated data or null if invalid
 */
export function validateClientDamageData(damageData) {
  if (!damageData || typeof damageData !== 'object') {
    return null;
  }

  const damage = typeof damageData.damage === 'number' ? damageData.damage : 0;
  const health = typeof damageData.health === 'number' ? damageData.health : CLIENT_VALIDATION_LIMITS.MAX_HEALTH;
  const maxHealth = typeof damageData.maxHealth === 'number' ? damageData.maxHealth : CLIENT_VALIDATION_LIMITS.MAX_HEALTH;

  // Validate ranges
  if (damage < 0 || damage > CLIENT_VALIDATION_LIMITS.MAX_HEALTH) {
    return null;
  }

  if (health < CLIENT_VALIDATION_LIMITS.MIN_HEALTH || health > maxHealth) {
    return null;
  }

  if (maxHealth !== CLIENT_VALIDATION_LIMITS.MAX_HEALTH) {
    return null; // Max health should always match server constant
  }

  return {
    damage: Math.max(0, Math.min(damage, CLIENT_VALIDATION_LIMITS.MAX_HEALTH)),
    health: Math.max(CLIENT_VALIDATION_LIMITS.MIN_HEALTH, Math.min(health, maxHealth)),
    maxHealth
  };
}

/**
 * Validate character name
 * @param {string} characterName - Character name
 * @returns {boolean} True if valid
 */
export function validateClientCharacterName(characterName) {
  return canonicalizeCharacterName(characterName) !== null;
}

/**
 * Validate room code format
 * @param {string} roomCode - Room code
 * @returns {boolean} True if valid format
 */
export function validateClientRoomCode(roomCode) {
  return typeof roomCode === 'string' && /^[A-Z0-9]{6}$/.test(roomCode);
}


