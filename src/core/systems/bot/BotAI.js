/**
 * BotAI.js
 * 
 * Handles AI logic for bots including movement, direction changes, and shooting.
 * Uses learning system to adapt to player behavior.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getBotAIStats, getBotMovementStats } from '../../../config/bot/BotStats.js';
import { getDifficultyConfig } from '../../../config/bot/BotDifficultyConfig.js';
import { getMeleeStats, getBlastStats, getMultiProjectileStats } from '../abilities/functions/CharacterAbilityStats.js';
import { getCharacterColorHex } from '../../../config/abilities/CharacterColors.js';

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
    userData.movementPaused = false;
    userData.movementPauseTimer = 0;
    userData.movementPauseDuration = 0;
  }
  
  // Handle idle state (bot stops moving completely)
  if (userData.isIdle) {
    return { moveX: 0, moveZ: 0, direction: userData.direction, hitWall: false };
  }
  
  // Handle movement pause (bot stops moving but can still shoot)
  if (userData.movementPaused) {
    userData.movementPauseTimer += dt;
    if (userData.movementPauseTimer >= userData.movementPauseDuration) {
      // Exit movement pause
      userData.movementPaused = false;
      userData.movementPauseTimer = 0;
      userData.movementPauseDuration = 0;
    } else {
      // Bot is paused - return zero movement
      return { moveX: 0, moveZ: 0, direction: userData.direction, hitWall: false };
    }
  }
  
  // Check if bot should pause movement (random chance when player is visible)
  if (playerPosition && !userData.movementPaused && !userData.isIdle) {
    if (Math.random() < difficultyConfig.movementPauseChance * dt * 0.5) {
      // Enter movement pause
      userData.movementPaused = true;
      userData.movementPauseTimer = 0;
      userData.movementPauseDuration = difficultyConfig.movementPauseMin + 
                                       Math.random() * (difficultyConfig.movementPauseMax - difficultyConfig.movementPauseMin);
      return { moveX: 0, moveZ: 0, direction: userData.direction, hitWall: false };
    }
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
 * Update bot abilities (shooting, mortar, melee, blast, multiProjectile)
 * @param {Object} bot - Bot mesh
 * @param {Object} userData - Bot userData object
 * @param {THREE.Vector3|null} playerPosition - Player position or null
 * @param {Object} projectileManager - Projectile manager
 * @param {number} dt - Delta time in seconds
 * @param {Object} learningManager - Optional learning manager for adaptive AI
 * @param {Object} context - Optional context object with {botManager, scene, player, characterManager, particleManager}
 * @returns {Object} Result with ability used: {shot: boolean, usedMortar: boolean, usedMelee: boolean, usedBlast: boolean, usedMultiProjectile: boolean}
 */
export function updateBotAbilities(bot, userData, playerPosition, projectileManager, dt, learningManager = null, context = null) {
  const result = { shot: false, usedMortar: false, usedMelee: false, usedBlast: false, usedMultiProjectile: false };
  
  if (!projectileManager || !playerPosition) {
    return result;
  }
  
  const aiStats = getBotAIStats();
  const characterName = userData.characterName || 'herald';
  const difficulty = userData.difficulty || 'beginner';
  const difficultyConfig = getDifficultyConfig(difficulty);
  
  // Initialize ability state
  if (userData.burstShotsRemaining === undefined) {
    userData.burstShotsRemaining = 0;
    userData.burstPauseTimer = 0;
    userData.isInBurst = false;
    userData.isIdle = false;
    userData.idleTimer = 0;
    userData.idleDuration = 0;
    userData.lastAbilityTime = 0;
    userData.mortarCooldown = 0;
    userData.meleeCooldown = 0;
    userData.specialAbilityCooldown = 0; // For blast/multiProjectile
    userData.abilitySelectionTimer = 0;
  }
  
  // Update cooldowns
  userData.mortarCooldown = Math.max(0, userData.mortarCooldown - dt);
  userData.meleeCooldown = Math.max(0, userData.meleeCooldown - dt);
  userData.specialAbilityCooldown = Math.max(0, userData.specialAbilityCooldown - dt);
  userData.abilitySelectionTimer += dt;
  
  // Handle idle state (bot stops all abilities)
  if (userData.isIdle) {
    userData.idleTimer += dt;
    if (userData.idleTimer >= userData.idleDuration) {
      userData.isIdle = false;
      userData.idleTimer = 0;
      userData.idleDuration = 0;
    } else {
      return result; // Bot is idle - don't use abilities
    }
  }
  
  // Calculate distance to player
  const dx = playerPosition.x - bot.position.x;
  const dz = playerPosition.z - bot.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  
  // Get ability ranges
  const characterStats = projectileManager.getCharacterStats(characterName);
  const meleeStats = characterStats?.melee || {};
  const meleeRange = meleeStats.range || 2.5;
  const mortarRange = aiStats.shootRange * 1.5; // Mortar has longer range
  const boltRange = aiStats.shootRange;
  
  // Check for special abilities (blast for Herald, multiProjectile for Lucy)
  if (userData.specialAbilityCooldown <= 0) {
    if (characterName === 'herald') {
      const blastStats = getBlastStats(characterName);
      if (blastStats && dist <= blastStats.radius * 1.2) {
        // Use blast when player is within range (20% chance per check)
        if (Math.random() < 0.2) {
          const blastResult = _useBlastAbility(bot, userData, playerPosition, blastStats, context);
          if (blastResult) {
            userData.specialAbilityCooldown = blastStats.cooldown;
            userData.lastAbilityTime = Date.now() / 1000;
            result.usedBlast = true;
            return result;
          }
        }
      }
    } else if (characterName === 'lucy') {
      const multiProjectileStats = getMultiProjectileStats(characterName);
      if (multiProjectileStats && dist <= boltRange * 1.5) {
        // Use multiProjectile when player is within range (15% chance per check)
        if (Math.random() < 0.15) {
          const multiResult = _useMultiProjectileAbility(bot, userData, playerPosition, multiProjectileStats, projectileManager, characterName);
          if (multiResult) {
            userData.specialAbilityCooldown = multiProjectileStats.cooldown;
            userData.lastAbilityTime = Date.now() / 1000;
            result.usedMultiProjectile = true;
            return result;
          }
        }
      }
    }
  }
  
  // Check melee range (close combat)
  if (dist <= meleeRange && userData.meleeCooldown <= 0) {
    const meleeResult = _useMeleeAbility(bot, userData, playerPosition, meleeStats, context);
    if (meleeResult) {
      userData.meleeCooldown = meleeStats.cooldown || 1.5;
      userData.lastAbilityTime = Date.now() / 1000;
      result.usedMelee = true;
      return result;
    }
  }
  
  // Select ability based on distance and cooldowns (every 1-2 seconds)
  if (userData.abilitySelectionTimer > (1.0 + Math.random())) {
    userData.abilitySelectionTimer = 0;
    
    // Check mortar range (medium-long range)
    if (dist > meleeRange && dist <= mortarRange && userData.mortarCooldown <= 0 && projectileManager.canShootMortar(userData.id)) {
      // Use mortar (30% chance at medium range, 60% at long range)
      const mortarChance = dist > boltRange ? 0.6 : 0.3;
      if (Math.random() < mortarChance) {
        const targetX = playerPosition.x + (Math.random() - 0.5) * 2; // Add some spread
        const targetZ = playerPosition.z + (Math.random() - 0.5) * 2;
        const mortar = projectileManager.createMortar(
          bot.position.x,
          bot.position.y,
          bot.position.z,
          targetX,
          targetZ,
          userData.id,
          characterName
        );
        if (mortar) {
          userData.mortarCooldown = characterStats?.mortar?.cooldown || 5.0;
          userData.lastAbilityTime = Date.now() / 1000;
          result.usedMortar = true;
          // Enter brief pause after mortar
          userData.burstPauseTimer = 1.0 + Math.random() * 1.0;
          return result;
        }
      }
    }
  }
  
  // Update burst pause timer
  if (userData.isInBurst && userData.burstShotsRemaining === 0) {
    userData.burstPauseTimer += dt;
    const pauseDuration = difficultyConfig.burstPauseMin + 
                         Math.random() * (difficultyConfig.burstPauseMax - difficultyConfig.burstPauseMin);
    
    if (userData.burstPauseTimer >= pauseDuration) {
      // After burst pause completes, check if bot should enter idle state
      if (!userData.isIdle && Math.random() < difficultyConfig.idleChance) {
        userData.isIdle = true;
        userData.idleTimer = 0;
        userData.idleDuration = difficultyConfig.idleDurationMin + 
                                Math.random() * (difficultyConfig.idleDurationMax - difficultyConfig.idleDurationMin);
        userData.burstPauseTimer = 0;
        return result;
      }
      
      // Start new burst only if in bolt range
      if (dist <= boltRange) {
        userData.burstShotsRemaining = 1 + Math.floor(Math.random() * 2); // 1-2 shots per burst (reduced)
        userData.burstPauseTimer = 0;
        userData.isInBurst = true;
      }
    }
  }
  
  // Only use bolt if in range and not using other abilities
  if (dist > boltRange || dist <= meleeRange) {
    return result;
  }
  
  // Update shoot cooldown
  if (userData.shootCooldown === undefined) {
    userData.shootCooldown = 0;
  }
  userData.shootCooldown -= dt * (1.0 / difficultyConfig.aiReactionTime);
  
  // Start burst if not in one, cooldown is ready, and pause timer allows it
  if (!userData.isInBurst && userData.shootCooldown <= 0 && userData.burstShotsRemaining === 0 && userData.burstPauseTimer <= 0) {
    // Don't start burst immediately - wait a bit
    if (userData.lastAbilityTime === 0 || (Date.now() / 1000 - userData.lastAbilityTime) > 0.5) {
      userData.burstShotsRemaining = 1 + Math.floor(Math.random() * 2); // 1-2 shots per burst
      userData.isInBurst = true;
      userData.burstPauseTimer = 0;
    }
  }
  
  // Shoot during burst
  if (userData.isInBurst && userData.burstShotsRemaining > 0 && userData.shootCooldown <= 0) {
    const healthPercent = userData.health / userData.maxHealth;
    const healthShootModifier = Math.max(0.5, healthPercent);
    const shootChance = Math.min(0.95, 0.5 + difficultyConfig.aiAccuracy * 0.5);
    const distanceAccuracy = Math.max(0.3, 1.0 - (dist / boltRange) * 0.5);
    const finalShootChance = shootChance * distanceAccuracy * healthShootModifier;
    
    if (projectileManager.canShoot(userData.id) && Math.random() < finalShootChance) {
      const inaccuracy = 1.0 - difficultyConfig.aiAccuracy;
      const maxSpreadRadians = inaccuracy * Math.PI * 0.4;
      const baseAngle = Math.atan2(dz, dx);
      const angularSpread = (Math.random() - 0.5) * maxSpreadRadians;
      const perpendicularSpread = (Math.random() - 0.5) * maxSpreadRadians * 0.6;
      const finalAngle = baseAngle + angularSpread;
      const perpAngle = baseAngle + Math.PI / 2;
      const perpOffset = Math.sin(perpendicularSpread) * 0.3;
      
      let aimX = Math.cos(finalAngle) + Math.cos(perpAngle) * perpOffset;
      let aimZ = Math.sin(finalAngle) + Math.sin(perpAngle) * perpOffset;
      
      if (difficultyConfig.movementIntelligence > 0.5) {
        const predictionFactor = difficultyConfig.movementIntelligence * 0.15;
        const predictionAccuracy = 1.0 - inaccuracy;
        aimX += (Math.random() * predictionFactor - predictionFactor * 0.5) * predictionAccuracy;
        aimZ += (Math.random() * predictionFactor - predictionFactor * 0.5) * predictionAccuracy;
      }
      
      const aimDist = Math.sqrt(aimX * aimX + aimZ * aimZ);
      if (aimDist > 0.001) {
        aimX /= aimDist;
        aimZ /= aimDist;
      } else {
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
      
      userData.burstShotsRemaining--;
      let baseCooldown = characterStats.bolt.cooldown;
      if (learningManager) {
        const learnedInterval = learningManager.getLearnedShootInterval();
        baseCooldown = baseCooldown * 0.7 + learnedInterval * 0.3;
      }
      baseCooldown *= difficultyConfig.shootIntervalMultiplier;
      const burstCooldown = baseCooldown * 0.8; // Slower burst cooldown
      userData.shootCooldown = burstCooldown + Math.random() * aiStats.shootCooldownVariance * 0.5;
      
      if (userData.burstShotsRemaining === 0) {
        userData.isInBurst = false;
        userData.burstPauseTimer = 0;
        userData.lastAbilityTime = Date.now() / 1000;
      }
      
      result.shot = true;
      return result;
    }
  }
  
  return result;
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
  userData.isIdle = false;
  userData.idleTimer = 0;
  userData.idleDuration = 0;
  userData.movementPaused = false;
  userData.movementPauseTimer = 0;
  userData.movementPauseDuration = 0;
  userData.lastAbilityTime = 0;
  userData.mortarCooldown = 0;
  userData.meleeCooldown = 0;
  userData.specialAbilityCooldown = 0;
  userData.abilitySelectionTimer = 0;
}

/**
 * Use melee ability (damage nearby entities)
 * @param {Object} bot - Bot mesh
 * @param {Object} userData - Bot userData object
 * @param {THREE.Vector3} playerPosition - Player position
 * @param {Object} meleeStats - Melee stats
 * @param {Object} context - Context with {botManager, scene, player, characterManager}
 * @returns {boolean} True if melee was used
 * @private
 */
function _useMeleeAbility(bot, userData, playerPosition, meleeStats, context) {
  if (!context || !meleeStats) return false;
  
  const radius = meleeStats.range || 2.5;
  const initialDamage = meleeStats.initialDamage || meleeStats.damage || 5;
  const botPos = bot.position;
  const radiusSq = radius * radius;
  
  // Check if player is in range
  const dx = playerPosition.x - botPos.x;
  const dz = playerPosition.z - botPos.z;
  const distSq = dx * dx + dz * dz;
  
  if (distSq <= radiusSq) {
    // Damage player if available
    if (context.characterManager && context.player) {
      context.characterManager.takeDamage(initialDamage);
    }
    
    // Damage other bots in range
    if (context.botManager) {
      const bots = context.botManager.getAllBots();
      for (let i = 0; i < bots.length; i++) {
        const otherBot = bots[i];
        if (otherBot === bot || !otherBot.userData) continue;
        
        const botDx = otherBot.position.x - botPos.x;
        const botDz = otherBot.position.z - botPos.z;
        const botDistSq = botDx * botDx + botDz * botDz;
        
        if (botDistSq <= radiusSq) {
          context.botManager.damageBot(otherBot, initialDamage, userData.id);
        }
      }
    }
    
    return true;
  }
  
  return false;
}

/**
 * Use blast ability (Herald only - knockback nearby entities)
 * @param {Object} bot - Bot mesh
 * @param {Object} userData - Bot userData object
 * @param {THREE.Vector3} playerPosition - Player position
 * @param {Object} blastStats - Blast stats
 * @param {Object} context - Context with {botManager, scene, player}
 * @returns {boolean} True if blast was used
 * @private
 */
function _useBlastAbility(bot, userData, playerPosition, blastStats, context) {
  if (!context || !blastStats) return false;
  
  const radius = blastStats.radius;
  const horizontalVelocity = blastStats.horizontalVelocity;
  const verticalVelocity = blastStats.verticalVelocity;
  const botPos = bot.position;
  const radiusSq = radius * radius;
  const minDistanceSq = 0.01;
  
  // Apply knockback to player
  if (context.player && context.player.userData) {
    const dx = playerPosition.x - botPos.x;
    const dz = playerPosition.z - botPos.z;
    const distSq = dx * dx + dz * dz;
    
    if (distSq <= radiusSq && distSq > minDistanceSq) {
      const distance = Math.sqrt(distSq);
      const dirX = dx / distance;
      const dirZ = dz / distance;
      const distanceMultiplier = 1 - distance / radius;
      
      // Apply velocity to player (if player has velocity properties)
      if (context.player.userData.velocityX !== undefined) {
        context.player.userData.velocityX = dirX * horizontalVelocity * distanceMultiplier;
        context.player.userData.velocityZ = dirZ * horizontalVelocity * distanceMultiplier;
        context.player.userData.velocityY = verticalVelocity;
        context.player.userData.isKnockedBack = true;
      }
    }
  }
  
  // Apply knockback to other bots
  if (context.botManager) {
    const bots = context.botManager.getAllBots();
    for (let i = 0; i < bots.length; i++) {
      const otherBot = bots[i];
      if (otherBot === bot || !otherBot.userData) continue;
      
      const botDx = otherBot.position.x - botPos.x;
      const botDz = otherBot.position.z - botPos.z;
      const botDistSq = botDx * botDx + botDz * botDz;
      
      if (botDistSq <= radiusSq && botDistSq > minDistanceSq) {
        const distance = Math.sqrt(botDistSq);
        const dirX = botDx / distance;
        const dirZ = botDz / distance;
        const distanceMultiplier = 1 - distance / radius;
        
        otherBot.userData.velocityX = dirX * horizontalVelocity * distanceMultiplier;
        otherBot.userData.velocityZ = dirZ * horizontalVelocity * distanceMultiplier;
        otherBot.userData.velocityY = verticalVelocity;
        otherBot.userData.isKnockedBack = true;
      }
    }
  }
  
  // Create visual effect if scene is available
  if (context.scene) {
    const segments = 32;
    const geometry = new THREE.RingGeometry(0, radius, segments);
    const characterColor = getCharacterColorHex('herald');
    const material = new THREE.MeshBasicMaterial({
      color: characterColor,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    
    const circle = new THREE.Mesh(geometry, material);
    circle.rotation.x = -Math.PI / 2;
    circle.position.set(botPos.x, botPos.y + 0.2, botPos.z);
    context.scene.add(circle);
    
    // Remove circle after animation
    setTimeout(() => {
      if (circle.parent) {
        context.scene.remove(circle);
        circle.geometry.dispose();
        circle.material.dispose();
      }
    }, blastStats.animationDuration * 1000);
  }
  
  return true;
}

/**
 * Use multiProjectile ability (Lucy only - shoot projectiles in all directions)
 * @param {Object} bot - Bot mesh
 * @param {Object} userData - Bot userData object
 * @param {THREE.Vector3} playerPosition - Player position
 * @param {Object} multiProjectileStats - MultiProjectile stats
 * @param {Object} projectileManager - Projectile manager
 * @param {string} characterName - Character name
 * @returns {boolean} True if multiProjectile was used
 * @private
 */
function _useMultiProjectileAbility(bot, userData, playerPosition, multiProjectileStats, projectileManager, characterName) {
  if (!multiProjectileStats || !projectileManager) return false;
  
  const projectileCount = multiProjectileStats.projectileCount || 8;
  const projectileSpeed = multiProjectileStats.projectileSpeed;
  const damage = multiProjectileStats.damage;
  const botPos = bot.position;
  
  // Shoot projectiles in all directions
  for (let i = 0; i < projectileCount; i++) {
    const angle = (i / projectileCount) * Math.PI * 2;
    const directionX = Math.cos(angle);
    const directionZ = Math.sin(angle);
    
    const offsetX = directionX * 0.5;
    const offsetZ = directionZ * 0.5;
    
    const projectile = projectileManager.createProjectile(
      botPos.x + offsetX,
      botPos.y,
      botPos.z + offsetZ,
      directionX,
      directionZ,
      userData.id,
      characterName
    );
    
    // Override projectile speed and damage if needed
    if (projectile && projectile.userData) {
      if (projectileSpeed) {
        projectile.userData.customSpeed = projectileSpeed;
      }
      if (damage) {
        projectile.userData.damage = damage;
      }
    }
  }
  
  return true;
}

