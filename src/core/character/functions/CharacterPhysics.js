/**
 * CharacterPhysics.js
 * 
 * Handles character physics including gravity, jump, and ground collision.
 */

import { getCharacterPhysicsStats, getCharacterMovementStats, getCharacterHealthStats } from '../config/CharacterStats.js';

/**
 * Update character jump physics and ground collision
 * @param {THREE.Mesh} player - Player mesh
 * @param {Object} userData - Player userData object
 * @param {Object} characterData - Character data object
 * @param {Object} collisionManager - Collision manager for ground height checks
 * @param {Object} soundManager - Sound manager for landing sounds
 * @param {Function} isOnBaseGround - Function to check if on base ground
 * @param {number} dt - Delta time in seconds
 * @param {boolean} isLevitating - Whether character is levitating
 */
export function updateCharacterPhysics(
  player,
  userData,
  characterData,
  collisionManager,
  soundManager,
  isOnBaseGround,
  dt,
  isLevitating = false
) {
  const physicsStats = getCharacterPhysicsStats();
  const movementStats = getCharacterMovementStats();
  const healthStats = getCharacterHealthStats();
  
  // Update jump cooldown
  if (characterData.jumpCooldown > 0) {
    characterData.jumpCooldown -= dt;
  }

  // Apply gravity
  characterData.velocityY += physicsStats.gravity * dt;
  
  // Apply levitation force if levitating and going down (not jumping up)
  if (isLevitating && characterData.velocityY < 0) {
    characterData.velocityY += physicsStats.levitationForce * dt;
  }

  // Update vertical position
  player.position.y += characterData.velocityY * dt;

  // Update player userData health
  if (player && userData) {
    userData.health = characterData.health;
    userData.maxHealth = healthStats.maxHealth;
  }

  // Check for ground collision using dynamic ground height
  const groundHeight = collisionManager.getGroundHeight(
    player.position.x, 
    player.position.z, 
    movementStats.playerSize
  );
  
  // Character's bottom should be at ground level
  const characterBottom = player.position.y - movementStats.playerHeight * 0.5;
  
  // Track previous grounded state before updating
  const wasGrounded = characterData.isGrounded;
  
  if (characterBottom <= groundHeight) {
    player.position.y = groundHeight + movementStats.playerHeight * 0.5;
    characterData.velocityY = 0;
    characterData.isGrounded = true;
    // Reset double jump flag when landing
    characterData.hasDoubleJumped = false;
    
    // Play landing sound if we just landed (transitioned from not grounded to grounded)
    if (!wasGrounded && soundManager) {
      const isObstacle = !isOnBaseGround();
      soundManager.playLanding(isObstacle);
    }
  } else {
    characterData.isGrounded = false;
  }
}

/**
 * Make character jump
 * @param {Object} characterData - Character data object
 * @param {Object} soundManager - Sound manager for jump sounds
 * @param {Function} isOnBaseGround - Function to check if on base ground
 * @returns {boolean} True if jump was successful
 */
export function characterJump(characterData, soundManager, isOnBaseGround) {
  const physicsStats = getCharacterPhysicsStats();
  
  if (characterData.isGrounded && characterData.jumpCooldown <= 0) {
    characterData.velocityY = physicsStats.jumpForce;
    characterData.isGrounded = false;
    characterData.wasGrounded = false;
    characterData.jumpCooldown = physicsStats.jumpCooldownTime;
    
    // Play jump sound
    if (soundManager) {
      const isObstacle = !isOnBaseGround();
      soundManager.playJump(isObstacle);
    }
    
    return true;
  }
  
  return false;
}

/**
 * Check if character is jumping
 * @param {Object} characterData - Character data object
 * @returns {boolean} True if character is jumping
 */
export function isCharacterJumping(characterData) {
  return !characterData.isGrounded;
}

/**
 * Initialize character physics state
 * @param {Object} characterData - Character data object
 */
export function initializeCharacterPhysics(characterData) {
  const physicsStats = getCharacterPhysicsStats();
  const healthStats = getCharacterHealthStats();
  
  characterData.velocityY = 0;
  characterData.isGrounded = true;
  characterData.wasGrounded = true;
  characterData.jumpCooldown = 0;
  characterData.health = healthStats.defaultHealth;
  characterData.hasDoubleJumped = false;
}

/**
 * Respawn character physics
 * @param {THREE.Mesh} player - Player mesh
 * @param {Object} characterData - Character data object
 * @param {string} gameMode - Optional game mode ('shooting' for random spawn)
 * @param {Object} collisionManager - Optional collision manager for ground height checks
 */
export function respawnCharacterPhysics(player, characterData, gameMode = null, collisionManager = null) {
  const movementStats = getCharacterMovementStats();
  const healthStats = getCharacterHealthStats();
  
  let spawnX = 0;
  let spawnZ = 0;
  
  // For shooting mode (Mystic Battle), spawn at random position
  if (gameMode === 'shooting' && collisionManager) {
    // Get arena size (try to get from collision manager or use default)
    const arenaSize = collisionManager.arenaSize || 20;
    const halfArena = arenaSize / 2 - 2; // Leave margin from edges
    
    // Generate random position within arena bounds
    spawnX = (Math.random() - 0.5) * arenaSize * 0.8; // Use 80% of arena size for safety
    spawnZ = (Math.random() - 0.5) * arenaSize * 0.8;
    
    // Clamp to arena bounds
    spawnX = Math.max(-halfArena, Math.min(halfArena, spawnX));
    spawnZ = Math.max(-halfArena, Math.min(halfArena, spawnZ));
  }
  
  // Get ground height at spawn position
  const groundHeight = collisionManager 
    ? collisionManager.getGroundHeight(spawnX, spawnZ, movementStats.playerSize)
    : 0;
  
  // Reset position (center for non-shooting modes, random for shooting mode)
  player.position.set(
    spawnX,
    groundHeight + movementStats.playerHeight * 0.5,
    spawnZ
  );
  
  // Reset physics
  characterData.velocityY = 0;
  characterData.isGrounded = true;
  characterData.wasGrounded = true; // Prevent landing sound on respawn
  characterData.jumpCooldown = 0;
  characterData.hasDoubleJumped = false;
  
  // Reset health
  characterData.health = healthStats.maxHealth;
}

