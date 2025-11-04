/**
 * BotAI.js
 * 
 * Handles AI logic for bots including movement, direction changes, and shooting.
 * Uses learning system to adapt to player behavior.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getBotAIStats, getBotMovementStats } from '../../../config/bot/BotStats.js';
import { getDifficultyConfig } from '../../../config/bot/BotDifficultyConfig.js';

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
 * @param {Object} learningManager - Optional learning manager for adaptive AI
 * @returns {Object} Movement result with moveX, moveZ, and direction
 */
export function calculateBotMovement(bot, userData, playerPosition, dt, collisionManager, learningManager = null) {
  const movementStats = getBotMovementStats();
  const aiStats = getBotAIStats();
  const difficulty = userData.difficulty || 'beginner';
  const difficultyConfig = getDifficultyConfig(difficulty);
  
  // Apply poison slow effect if bot is poisoned
  const poisonSpeedMultiplier = userData.poisonSpeedMultiplier !== undefined ? userData.poisonSpeedMultiplier : 1.0;
  const speed = movementStats.moveSpeed * poisonSpeedMultiplier * difficultyConfig.movementIntelligence;
  
  let moveX = 0;
  let moveZ = 0;
  
  // Initialize movement behavior state
  if (!userData.movementBehavior) {
    userData.movementBehavior = 'approach'; // approach, strafe, circle, retreat
    userData.movementBehaviorTimer = 0;
    userData.strafeDirection = Math.random() > 0.5 ? 1 : -1; // Left or right
    userData.circleDirection = Math.random() > 0.5 ? 1 : -1; // Clockwise or counter-clockwise
  }
  
  // Update movement behavior timer
  userData.movementBehaviorTimer += dt;
  
  // If player is visible, use tactical movement
  if (playerPosition) {
    const dx = playerPosition.x - bot.position.x;
    const dz = playerPosition.z - bot.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const healthPercent = userData.health / userData.maxHealth;
    
    // Calculate preferred follow distance based on difficulty
    const followDistance = aiStats.followDistance * difficultyConfig.followDistanceMultiplier;
    const optimalDistance = followDistance * 0.7; // Preferred engagement distance
    
    // Health-based behavior changes
    if (healthPercent < 0.3 && userData.movementBehavior !== 'retreat') {
      // Low health - retreat
      userData.movementBehavior = 'retreat';
      userData.movementBehaviorTimer = 0;
    } else if (healthPercent > 0.7 && dist > optimalDistance * 1.5 && userData.movementBehavior === 'retreat') {
      // Health recovered - resume normal behavior
      userData.movementBehavior = 'approach';
      userData.movementBehaviorTimer = 0;
    }
    
    // Change behavior periodically (every 2-4 seconds)
    if (userData.movementBehaviorTimer > (2 + Math.random() * 2)) {
      const behaviors = ['approach', 'strafe', 'circle'];
      // Prefer strafing and circling when at optimal distance
      if (dist > optimalDistance * 0.8 && dist < optimalDistance * 1.2) {
        userData.movementBehavior = Math.random() > 0.5 ? 'strafe' : 'circle';
      } else if (dist < optimalDistance * 0.8) {
        // Too close - strafe or retreat
        userData.movementBehavior = Math.random() > 0.3 ? 'strafe' : 'retreat';
      } else {
        // Too far - approach
        userData.movementBehavior = 'approach';
      }
      
      // Randomize strafe/circle direction
      userData.strafeDirection = Math.random() > 0.5 ? 1 : -1;
      userData.circleDirection = Math.random() > 0.5 ? 1 : -1;
      userData.movementBehaviorTimer = 0;
    }
    
    // Calculate movement based on behavior
    const toPlayerAngle = Math.atan2(dz, dx);
    const perpendicularAngle = toPlayerAngle + Math.PI / 2; // Perpendicular to player direction
    
    switch (userData.movementBehavior) {
      case 'strafe':
        // Strafe left/right relative to player
        moveX = Math.cos(perpendicularAngle) * speed * dt * userData.strafeDirection;
        moveZ = Math.sin(perpendicularAngle) * speed * dt * userData.strafeDirection;
        // Also move slightly toward/away from player to maintain distance
        const strafeToward = dist > optimalDistance ? 1 : -1;
        moveX += (dx / dist) * speed * dt * 0.3 * strafeToward;
        moveZ += (dz / dist) * speed * dt * 0.3 * strafeToward;
        userData.direction = Math.atan2(moveZ, moveX);
        break;
        
      case 'circle':
        // Circle around player
        const circleRadius = optimalDistance;
        const angleToPlayer = Math.atan2(dz, dx);
        // Move perpendicular to player (circling)
        moveX = Math.cos(perpendicularAngle) * speed * dt * userData.circleDirection;
        moveZ = Math.sin(perpendicularAngle) * speed * dt * userData.circleDirection;
        // Adjust distance to maintain circle radius
        const currentRadius = dist;
        const radiusAdjust = (currentRadius - circleRadius) * 0.5;
        moveX += (dx / dist) * speed * dt * radiusAdjust;
        moveZ += (dz / dist) * speed * dt * radiusAdjust;
        userData.direction = Math.atan2(moveZ, moveX);
        break;
        
      case 'retreat':
        // Move away from player
        moveX = -(dx / dist) * speed * dt * 1.2; // Faster retreat
        moveZ = -(dz / dist) * speed * dt * 1.2;
        // Add some strafing while retreating
        moveX += Math.cos(perpendicularAngle) * speed * dt * 0.5 * userData.strafeDirection;
        moveZ += Math.sin(perpendicularAngle) * speed * dt * 0.5 * userData.strafeDirection;
        userData.direction = Math.atan2(moveZ, moveX);
        break;
        
      case 'approach':
      default:
        // Approach player with some variation
        const approachBase = (dx / dist) * speed * dt;
        const approachZ = (dz / dist) * speed * dt;
        // Add slight perpendicular movement for more natural approach
        const approachVariation = 0.2;
        moveX = approachBase + Math.cos(perpendicularAngle) * speed * dt * approachVariation * (Math.sin(userData.movementBehaviorTimer * 2) * userData.strafeDirection);
        moveZ = approachZ + Math.sin(perpendicularAngle) * speed * dt * approachVariation * (Math.sin(userData.movementBehaviorTimer * 2) * userData.strafeDirection);
        userData.direction = Math.atan2(moveZ, moveX);
        break;
    }
    
    // Use learned movement patterns if available (blend with tactical movement)
    if (learningManager) {
      const learnedMovement = learningManager.getLearnedMovement(
        bot.position,
        playerPosition
      );
      
      if (learnedMovement && learnedMovement.direction.length() > 0) {
        const learnedDir = learnedMovement.direction;
        const learnedSpeed = learnedMovement.speed * difficultyConfig.learningRate;
        
        // Blend learned movement with tactical movement
        moveX = moveX * (1 - difficultyConfig.learningRate * 0.5) + learnedDir.x * learnedSpeed * dt * difficultyConfig.learningRate * 0.5;
        moveZ = moveZ * (1 - difficultyConfig.learningRate * 0.5) + learnedDir.z * learnedSpeed * dt * difficultyConfig.learningRate * 0.5;
        
        userData.direction = Math.atan2(moveZ, moveX);
      }
    }
    
    // Prevent getting too close
    if (dist < aiStats.avoidanceDistance) {
      // Too close, force retreat
      moveX = -(dx / dist) * speed * dt * 1.5;
      moveZ = -(dz / dist) * speed * dt * 1.5;
      userData.direction = Math.atan2(moveZ, moveX);
      userData.movementBehavior = 'retreat';
      userData.movementBehaviorTimer = 0;
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
    // Bounce off wall and change behavior
    userData.direction += Math.PI + (Math.random() - 0.5) * 0.5;
    userData.movementBehavior = 'strafe'; // Change to strafe when hitting wall
    userData.movementBehaviorTimer = 0;
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
 * @param {Object} learningManager - Optional learning manager for adaptive AI
 * @returns {boolean} True if bot shot
 */
export function updateBotShooting(bot, userData, playerPosition, projectileManager, dt, learningManager = null) {
  if (!projectileManager || !playerPosition) {
    return false;
  }
  
  const aiStats = getBotAIStats();
  const characterName = userData.characterName || 'herald';
  const difficulty = userData.difficulty || 'beginner';
  const difficultyConfig = getDifficultyConfig(difficulty);
  
  // Initialize burst shooting state
  if (userData.burstShotsRemaining === undefined) {
    userData.burstShotsRemaining = 0;
    userData.burstPauseTimer = 0;
    userData.isInBurst = false;
  }
  
  // Update burst pause timer
  if (userData.isInBurst && userData.burstShotsRemaining === 0) {
    userData.burstPauseTimer += dt;
    const pauseDuration = 0.8 + Math.random() * 1.2; // Pause 0.8-2 seconds between bursts
    
    if (userData.burstPauseTimer >= pauseDuration) {
      // Start new burst
      userData.burstShotsRemaining = 2 + Math.floor(Math.random() * 2); // 2-3 shots per burst
      userData.burstPauseTimer = 0;
      userData.isInBurst = true;
    }
  }
  
  // Update shoot cooldown (faster reaction time for higher difficulties)
  userData.shootCooldown -= dt * (1.0 / difficultyConfig.aiReactionTime);
  
  // Calculate distance to player
  const dx = playerPosition.x - bot.position.x;
  const dz = playerPosition.z - bot.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  
  // Get learned preferred range if available
  let shootRange = aiStats.shootRange;
  if (learningManager) {
    const learnedRange = learningManager.getLearnedPreferredRange();
    shootRange = shootRange * 0.7 + learnedRange * 0.3; // Blend learned with base
  }
  
  // Only consider shooting if in range
  if (dist >= shootRange) {
    return false;
  }
  
  // Health-based shooting behavior (less aggressive when low health)
  const healthPercent = userData.health / userData.maxHealth;
  const healthShootModifier = Math.max(0.5, healthPercent); // Reduce shooting when low health
  
  // Start burst if not in one and cooldown is ready
  if (!userData.isInBurst && userData.shootCooldown <= 0 && userData.burstShotsRemaining === 0) {
    userData.burstShotsRemaining = 2 + Math.floor(Math.random() * 2); // 2-3 shots per burst
    userData.isInBurst = true;
    userData.burstPauseTimer = 0;
  }
  
  // Shoot during burst
  if (userData.isInBurst && userData.burstShotsRemaining > 0 && userData.shootCooldown <= 0) {
    // For easier difficulties, allow more shots but with spread
    // For harder difficulties, fewer shots but more accurate
    const shootChance = Math.min(0.95, 0.5 + difficultyConfig.aiAccuracy * 0.5); // 50-95% chance to shoot
    const distanceAccuracy = Math.max(0.3, 1.0 - (dist / shootRange) * 0.5);
    const finalShootChance = shootChance * distanceAccuracy * healthShootModifier;
    
    // Shoot if projectile manager allows it
    const shouldShoot = projectileManager.canShoot(userData.id) &&
                        Math.random() < finalShootChance;
    
    if (shouldShoot) {
      // Calculate aim spread based on difficulty (inverse of accuracy)
      // Easy (0.3 accuracy) = high spread, Veteran (0.85 accuracy) = low spread
      const inaccuracy = 1.0 - difficultyConfig.aiAccuracy;
      const maxSpreadRadians = inaccuracy * Math.PI * 0.4; // Max spread up to ~72 degrees for Easy
      
      // Calculate base angle to player
      const baseAngle = Math.atan2(dz, dx);
      
      // Add random spread (both angular and perpendicular)
      const angularSpread = (Math.random() - 0.5) * maxSpreadRadians;
      const perpendicularSpread = (Math.random() - 0.5) * maxSpreadRadians * 0.6;
      
      // Calculate final aim angle with spread
      const finalAngle = baseAngle + angularSpread;
      
      // Calculate perpendicular offset for more realistic misses
      const perpAngle = baseAngle + Math.PI / 2;
      const perpOffset = Math.sin(perpendicularSpread) * 0.3;
      
      // Calculate final aim direction
      let aimX = Math.cos(finalAngle) + Math.cos(perpAngle) * perpOffset;
      let aimZ = Math.sin(finalAngle) + Math.sin(perpAngle) * perpOffset;
      
      // Add slight leading for moving targets (higher difficulty = better leading)
      if (difficultyConfig.movementIntelligence > 0.5) {
        const predictionFactor = difficultyConfig.movementIntelligence * 0.15;
        const predictionAccuracy = 1.0 - inaccuracy; // More accurate prediction for higher difficulties
        aimX += (Math.random() * predictionFactor - predictionFactor * 0.5) * predictionAccuracy;
        aimZ += (Math.random() * predictionFactor - predictionFactor * 0.5) * predictionAccuracy;
      }
      
      // Normalize direction
      const aimDist = Math.sqrt(aimX * aimX + aimZ * aimZ);
      if (aimDist > 0.001) {
        aimX /= aimDist;
        aimZ /= aimDist;
      } else {
        // Fallback to base direction if spread is too small
        aimX = Math.cos(baseAngle);
        aimZ = Math.sin(baseAngle);
      }
      
      projectileManager.createProjectile(
        bot.position.x,
        bot.position.y,
        bot.position.z,
        aimX,
        aimZ,
        userData.id,
        characterName
      );
      
      // Decrement burst shots
      userData.burstShotsRemaining--;
      
      // Set cooldown between shots in burst (faster than normal)
      const characterStats = projectileManager.getCharacterStats(characterName);
      let baseCooldown = characterStats.bolt.cooldown;
      
      // Apply learned interval if available
      if (learningManager) {
        const learnedInterval = learningManager.getLearnedShootInterval();
        baseCooldown = baseCooldown * 0.7 + learnedInterval * 0.3;
      }
      
      // Apply difficulty multiplier
      baseCooldown *= difficultyConfig.shootIntervalMultiplier;
      
      // Faster cooldown during burst (rapid fire)
      const burstCooldown = baseCooldown * 0.6;
      userData.shootCooldown = burstCooldown + Math.random() * aiStats.shootCooldownVariance * 0.3;
      
      // End burst if all shots fired
      if (userData.burstShotsRemaining === 0) {
        userData.isInBurst = false;
        userData.burstPauseTimer = 0;
      }
      
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
 * @param {string} difficulty - Difficulty level (optional)
 */
export function initializeBotAI(userData, startX, startZ, difficulty = 'beginner') {
  const aiStats = getBotAIStats();
  const difficultyConfig = getDifficultyConfig(difficulty);
  
  // Store difficulty
  userData.difficulty = difficulty;
  
  // Initialize AI state
  userData.targetX = startX;
  userData.targetZ = startZ;
  userData.direction = Math.random() * Math.PI * 2;
  userData.changeDirectionTimer = 0;
  
  // Set random direction change interval (adjusted by difficulty)
  const interval = aiStats.changeDirectionInterval;
  const baseInterval = interval.min + Math.random() * (interval.max - interval.min);
  userData.changeDirectionInterval = baseInterval * (2.0 - difficultyConfig.movementIntelligence);
  
  // Initialize shooting state
  userData.shootCooldown = 0;
  const shootInterval = aiStats.shootInterval;
  const baseShootInterval = shootInterval.min + Math.random() * (shootInterval.max - shootInterval.min);
  userData.shootInterval = baseShootInterval * difficultyConfig.shootIntervalMultiplier;
  
  // Initialize avoidance state
  userData.avoidanceTimer = 0;
  userData.avoidanceDirection = null;
  
  // Initialize movement behavior state
  userData.movementBehavior = 'approach';
  userData.movementBehaviorTimer = 0;
  userData.strafeDirection = Math.random() > 0.5 ? 1 : -1;
  userData.circleDirection = Math.random() > 0.5 ? 1 : -1;
  
  // Initialize burst shooting state
  userData.burstShotsRemaining = 0;
  userData.burstPauseTimer = 0;
  userData.isInBurst = false;
}

