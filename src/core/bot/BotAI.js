/**
 * BotAI.js
 * 
 * Handles AI logic for bots including movement, direction changes, and shooting.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getBotAIStats, getBotMovementStats } from './BotStats.js';

/**
 * Update bot AI direction change timer
 * @param {Object} userData - Bot userData object
 * @param {number} dt - Delta time in seconds
 */
export function updateDirectionChangeTimer(userData, dt) {
  const aiStats = getBotAIStats();
  userData.changeDirectionTimer += dt;
  
  if (userData.changeDirectionTimer >= userData.changeDirectionInterval) {
    // Change to random direction
    userData.direction = Math.random() * Math.PI * 2;
    userData.changeDirectionTimer = 0;
    
    // Set new random interval
    const interval = aiStats.changeDirectionInterval;
    userData.changeDirectionInterval = interval.min + Math.random() * (interval.max - interval.min);
  }
}

/**
 * Calculate bot movement based on AI behavior
 * @param {Object} bot - Bot mesh
 * @param {Object} userData - Bot userData object
 * @param {THREE.Vector3|null} playerPosition - Player position or null
 * @param {number} dt - Delta time in seconds
 * @param {Object} collisionManager - Collision manager
 * @returns {Object} Movement result with moveX, moveZ, and direction
 */
export function calculateBotMovement(bot, userData, playerPosition, dt, collisionManager) {
  const movementStats = getBotMovementStats();
  const aiStats = getBotAIStats();
  const speed = movementStats.moveSpeed;
  
  let moveX = 0;
  let moveZ = 0;
  
  // If player is visible, move toward or away from player
  if (playerPosition) {
    const dx = playerPosition.x - bot.position.x;
    const dz = playerPosition.z - bot.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    
    if (dist > aiStats.avoidanceDistance && dist < aiStats.followDistance) {
      // Move toward player if not too close
      if (dist > aiStats.avoidanceDistance) {
        moveX = (dx / dist) * speed * dt;
        moveZ = (dz / dist) * speed * dt;
        userData.direction = Math.atan2(dz, dx);
      } else {
        // Too close, move away
        moveX = -(dx / dist) * speed * dt;
        moveZ = -(dz / dist) * speed * dt;
        userData.direction = Math.atan2(-dz, -dx);
      }
    } else if (dist <= aiStats.avoidanceDistance) {
      // Too close, move away
      moveX = -(dx / dist) * speed * dt;
      moveZ = -(dz / dist) * speed * dt;
      userData.direction = Math.atan2(-dz, -dx);
    }
  } else {
    // Random movement when no player position
    moveX = Math.cos(userData.direction) * speed * dt;
    moveZ = Math.sin(userData.direction) * speed * dt;
  }
  
  // Check collision and adjust movement
  const nextPos = new THREE.Vector3(
    bot.position.x + moveX,
    bot.position.y,
    bot.position.z + moveZ
  );
  
  const playerSize = movementStats.playerSize;
  if (!collisionManager || !collisionManager.willCollide(nextPos, playerSize)) {
    return { moveX, moveZ, direction: userData.direction, hitWall: false };
  } else {
    // Bounce off wall
    userData.direction += Math.PI + (Math.random() - 0.5) * 0.5;
    return { moveX: 0, moveZ: 0, direction: userData.direction, hitWall: true };
  }
}

/**
 * Update bot shooting behavior
 * @param {Object} bot - Bot mesh
 * @param {Object} userData - Bot userData object
 * @param {THREE.Vector3|null} playerPosition - Player position or null
 * @param {Object} projectileManager - Projectile manager
 * @param {number} dt - Delta time in seconds
 * @returns {boolean} True if bot shot
 */
export function updateBotShooting(bot, userData, playerPosition, projectileManager, dt) {
  if (!projectileManager || !playerPosition) {
    return false;
  }
  
  const aiStats = getBotAIStats();
  const characterName = userData.characterName || 'herald';
  
  // Update shoot cooldown
  userData.shootCooldown -= dt;
  
  if (userData.shootCooldown <= 0) {
    // Calculate distance to player
    const dx = playerPosition.x - bot.position.x;
    const dz = playerPosition.z - bot.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    
    // Shoot if player is in range and projectile manager allows it
    if (dist < aiStats.shootRange && projectileManager.canShoot(userData.id)) {
      // Create projectile
      projectileManager.createProjectile(
        bot.position.x,
        bot.position.y,
        bot.position.z,
        dx,
        dz,
        userData.id,
        characterName
      );
      
      // Set cooldown based on character stats
      const characterStats = projectileManager.getCharacterStats(characterName);
      const baseCooldown = characterStats.bolt.cooldown;
      userData.shootCooldown = baseCooldown + Math.random() * aiStats.shootCooldownVariance;
      
      return true;
    }
  }
  
  return false;
}

/**
 * Initialize bot AI state
 * @param {Object} userData - Bot userData object
 * @param {number} startX - Starting X position
 * @param {number} startZ - Starting Z position
 */
export function initializeBotAI(userData, startX, startZ) {
  const aiStats = getBotAIStats();
  
  // Initialize AI state
  userData.targetX = startX;
  userData.targetZ = startZ;
  userData.direction = Math.random() * Math.PI * 2;
  userData.changeDirectionTimer = 0;
  
  // Set random direction change interval
  const interval = aiStats.changeDirectionInterval;
  userData.changeDirectionInterval = interval.min + Math.random() * (interval.max - interval.min);
  
  // Initialize shooting state
  userData.shootCooldown = 0;
  const shootInterval = aiStats.shootInterval;
  userData.shootInterval = shootInterval.min + Math.random() * (shootInterval.max - shootInterval.min);
  
  // Initialize avoidance state
  userData.avoidanceTimer = 0;
  userData.avoidanceDirection = null;
}

