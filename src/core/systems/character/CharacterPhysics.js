/**
 * CharacterPhysics.js
 * 
 * Handles character physics including gravity, jump, and ground collision.
 */

import { getCharacterPhysicsStats } from '../../../config/character/PhysicsConfig.js';
import { getCharacterMovementStats, getCharacterHealthStats } from '../../../config/character/CharacterStats.js';

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

  // Apply gravity (gravity is always applied; levitation counteracts it)
  characterData.velocityY += physicsStats.gravity * dt;
  
  // Determine if player is actively trying to levitate this frame
  const wantsLevitation = Boolean(isLevitating);
  
  // Handle levitation activation and duration tracking
  const canStartLevitation = wantsLevitation && characterData.levitationCooldown <= 0 && !characterData.isLevitationActive;
  if (canStartLevitation) {
    characterData.isLevitationActive = true;
    characterData.levitationTimeRemaining = physicsStats.levitationMaxDuration;
    // Track initial duration to calculate cooldown based on usage
    characterData.levitationInitialDuration = physicsStats.levitationMaxDuration;
    // Reset ramp-up timer when starting levitation
    characterData.levitationRampUpTime = 0;
  }
  
  const isCurrentlyLevitating = characterData.isLevitationActive && wantsLevitation && characterData.levitationTimeRemaining > 0;
  
  if (isCurrentlyLevitating) {
    // Update ramp-up timer
    characterData.levitationRampUpTime += dt;
    
    // Calculate ramp-up multiplier (0 to 1 over ramp-up duration)
    const rampUpDuration = physicsStats.levitationRampUpDuration || 0.25;
    const rampUpProgress = Math.min(1, characterData.levitationRampUpTime / rampUpDuration);
    
    // Apply levitation force with gradual ramp-up
    const currentLevitationForce = physicsStats.levitationForce * rampUpProgress;
    characterData.velocityY += currentLevitationForce * dt;
    characterData.levitationTimeRemaining = Math.max(0, characterData.levitationTimeRemaining - dt);
  } else if (characterData.isLevitationActive) {
    // Levitation ended - calculate cooldown based on how much time was used
    const initialDuration = characterData.levitationInitialDuration || physicsStats.levitationMaxDuration;
    const usedTime = initialDuration - characterData.levitationTimeRemaining;
    const usageRatio = initialDuration > 0 ? usedTime / initialDuration : 1;
    
    // Set cooldown proportional to usage (more usage = longer cooldown)
    characterData.levitationCooldown = usageRatio * physicsStats.levitationCooldownTime;
    
    characterData.isLevitationActive = false;
    characterData.levitationTimeRemaining = 0;
    characterData.levitationInitialDuration = 0;
    characterData.levitationRampUpTime = 0;
  }
  
  if (characterData.levitationCooldown > 0) {
    characterData.levitationCooldown = Math.max(0, characterData.levitationCooldown - dt);
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
  
  // Check if player is outside arena bounds (allows falling when outside)
  // For LargeArenaCollisionManager, groundHeight is -Infinity when outside
  // For standard CollisionManager, check arena bounds explicitly
  let isOutsideArena = groundHeight === -Infinity;
  if (!isOutsideArena && collisionManager.arenaSize) {
    const halfArena = collisionManager.arenaSize / 2;
    isOutsideArena = Math.abs(player.position.x) >= halfArena || Math.abs(player.position.z) >= halfArena;
  }
  
  // Only enforce ground height if we're inside the arena
  // This allows falling when outside the arena bounds
  if (!isOutsideArena && characterBottom <= groundHeight) {
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
  characterData.levitationCooldown = 0;
  characterData.isLevitationActive = false;
  characterData.levitationTimeRemaining = 0;
  characterData.levitationInitialDuration = 0;
  characterData.levitationRampUpTime = 0;
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
  characterData.levitationCooldown = 0;
  characterData.isLevitationActive = false;
  characterData.levitationTimeRemaining = 0;
  characterData.levitationInitialDuration = 0;
  characterData.levitationRampUpTime = 0;
  characterData.hasDoubleJumped = false;
  
  // Reset health
  characterData.health = healthStats.maxHealth;
}

