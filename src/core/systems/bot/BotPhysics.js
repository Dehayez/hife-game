/**
 * BotPhysics.js
 * 
 * Handles bot physics including gravity, ground collision, and vertical movement.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getBotPhysicsStats, getBotMovementStats } from '../../../config/bot/BotStats.js';
import { HERALD_BLAST_ATTACK_CONFIG } from '../../../config/abilities/characters/herald/blast/AttackConfig.js';

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

  // Apply horizontal velocity (for knockback effects like blast)
  if (userData.velocityX !== undefined && userData.velocityZ !== undefined) {
    const newX = bot.position.x + userData.velocityX * dt;
    const newZ = bot.position.z + userData.velocityZ * dt;
    
    // Check collision before applying horizontal velocity
    if (collisionManager) {
      const checkPos = new THREE.Vector3(newX, bot.position.y, newZ);
      if (!collisionManager.willCollide(checkPos, movementStats.playerSize * 0.5)) {
        bot.position.x = newX;
        bot.position.z = newZ;
      } else {
        // Collision detected - stop horizontal velocity
        userData.velocityX = 0;
        userData.velocityZ = 0;
      }
    } else {
      bot.position.x = newX;
      bot.position.z = newZ;
    }
  }

  // Ground collision
  const groundHeight = collisionManager 
    ? collisionManager.getGroundHeight(bot.position.x, bot.position.z, movementStats.playerSize)
    : physicsStats.groundY;
  
  const botBottom = bot.position.y - movementStats.playerHeight * 0.5;
  if (botBottom <= groundHeight) {
    bot.position.y = groundHeight + movementStats.playerHeight * 0.5;
    
    // Check if this is a bounce (from blast knockback) or normal landing
    const isKnockedBack = userData.isKnockedBack || false;
    // Get bounce config from blast config
    const minBounceVelocity = HERALD_BLAST_ATTACK_CONFIG.minBounceVelocity;
    const bounceRestitution = HERALD_BLAST_ATTACK_CONFIG.bounceRestitution;
    
    if (isKnockedBack && userData.velocityY < -minBounceVelocity) {
      // Bounce! Apply restitution (invert and reduce velocity)
      userData.velocityY = -userData.velocityY * bounceRestitution;
      userData.isGrounded = false;
      
      // Horizontal velocity continues during bounce (reduced friction)
      if (userData.velocityX !== undefined && userData.velocityZ !== undefined) {
        // Apply slight friction on bounce (95% retained)
        userData.velocityX *= 0.95;
        userData.velocityZ *= 0.95;
      }
    } else {
      // Normal landing - stop all velocity
      userData.velocityY = 0;
      userData.isGrounded = true;
      
      // Stop horizontal velocity when landing normally (only if not knocked back)
      if (!isKnockedBack && userData.velocityX !== undefined) {
        userData.velocityX = 0;
        userData.velocityZ = 0;
        userData.isKnockedBack = false; // Clear knockback state
      }
      
      // If knocked back but velocity too low, stop bouncing
      if (isKnockedBack && Math.abs(userData.velocityY) < minBounceVelocity) {
        userData.velocityY = 0;
        userData.isGrounded = true;
        // Keep horizontal velocity but let it decay naturally
        // Clear knockback flag if horizontal velocity is also low
        if (userData.velocityX !== undefined && userData.velocityZ !== undefined) {
          if (Math.abs(userData.velocityX) < 0.1 && Math.abs(userData.velocityZ) < 0.1) {
            userData.isKnockedBack = false;
          }
        }
      }
    }
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
  userData.velocityX = 0;
  userData.velocityZ = 0;
  userData.isGrounded = true;
  userData.jumpCooldown = 0;
}

