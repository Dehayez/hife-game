/**
 * BotPhysics.js
 * 
 * Handles bot physics including gravity, ground collision, and vertical movement.
 */

import { getBotPhysicsStats, getBotMovementStats } from '../config/BotStats.js';

/**
 * Update bot jump physics and ground collision
 * @param {THREE.Mesh} bot - Bot mesh
 * @param {Object} userData - Bot userData object
 * @param {number} dt - Delta time in seconds
 * @param {Object} collisionManager - Collision manager for ground height checks
 */
export function updateBotPhysics(bot, userData, dt, collisionManager) {
  const physicsStats = getBotPhysicsStats();
  const movementStats = getBotMovementStats();
  
  // Update jump physics
  userData.velocityY += physicsStats.gravity * dt;
  bot.position.y += userData.velocityY * dt;

  // Ground collision
  const groundHeight = collisionManager 
    ? collisionManager.getGroundHeight(bot.position.x, bot.position.z, movementStats.playerSize)
    : physicsStats.groundY;
  
  const botBottom = bot.position.y - movementStats.playerHeight * 0.5;
  if (botBottom <= groundHeight) {
    bot.position.y = groundHeight + movementStats.playerHeight * 0.5;
    userData.velocityY = 0;
    userData.isGrounded = true;
  } else {
    userData.isGrounded = false;
  }
  
  // Update jump cooldown
  userData.jumpCooldown = Math.max(0, userData.jumpCooldown - dt);
}

/**
 * Initialize bot physics state
 * @param {Object} userData - Bot userData object
 */
export function initializeBotPhysics(userData) {
  userData.velocityY = 0;
  userData.isGrounded = true;
  userData.jumpCooldown = 0;
}

