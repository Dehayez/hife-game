/**
 * BotManager.js
 * 
 * Main manager for all bot-related functionality.
 * Coordinates bot creation, updates, AI, animation, and physics.
 * 
 * This file acts as a facade, delegating to specialized modules:
 * - BotStats.js: Bot stats configuration
 * - BotAI.js: AI behavior logic
 * - BotAnimation.js: Animation handling
 * - BotPhysics.js: Physics and movement
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getBotHealthStats, getBotMovementStats, BOT_STATS } from '../config/BotStats.js';
import { initializeBotAI, updateDirectionChangeTimer, calculateBotMovement, updateBotShooting } from './BotAI.js';
import { loadBotAnimations, setBotAnimation, updateBotAnimation, updateBotAnimationFromMovement, billboardBotToCamera } from './BotAnimation.js';
import { initializeBotPhysics, updateBotPhysics } from './BotPhysics.js';
import { getCharacterColorHex } from '../../abilities/config/CharacterColors.js';
import { startDeathFade, updateDeathFade, DEATH_FADE_CONFIG } from '../../utils/DeathFadeUtils.js';
import { createSpriteAtPosition } from '../../utils/SpriteUtils.js';

export class BotManager {
  /**
   * Create a new BotManager
   * @param {Object} scene - THREE.js scene
   * @param {Object} collisionManager - Collision manager for wall/ground checks
   * @param {Object} projectileManager - Projectile manager for shooting
   * @param {Object} particleManager - Optional particle manager for death effects
   */
  constructor(scene, collisionManager = null, projectileManager = null, particleManager = null) {
    this.scene = scene;
    this.collisionManager = collisionManager;
    this.projectileManager = projectileManager;
    this.particleManager = particleManager;
    this.bots = [];
    
    // Get stats from config
    const movementStats = getBotMovementStats();
    this.playerHeight = movementStats.playerHeight;
    this.playerSize = movementStats.playerSize;
    this.moveSpeed = movementStats.moveSpeed;
    this.runSpeedMultiplier = 1.7; // Not currently used for bots
  }

  /**
   * Set the collision manager (can be set after construction)
   * @param {Object} collisionManager - Collision manager instance
   */
  setCollisionManager(collisionManager) {
    this.collisionManager = collisionManager;
  }

  /**
   * Set callback for bot deaths
   * @param {Function} callback - Callback function called with killerId when bot dies
   */
  setOnBotDeathCallback(callback) {
    this.onBotDeathCallback = callback;
  }

  /**
   * Set the projectile manager (can be set after construction)
   * @param {Object} projectileManager - Projectile manager instance
   */
  setProjectileManager(projectileManager) {
    this.projectileManager = projectileManager;
  }

  /**
   * Set the particle manager (can be set after construction)
   * @param {Object} particleManager - Particle manager instance
   */
  setParticleManager(particleManager) {
    this.particleManager = particleManager;
  }

  /**
   * Create a new bot
   * @param {string} botId - Unique bot identifier
   * @param {string} characterName - Character name ('lucy' or 'herald')
   * @param {number} startX - Starting X position
   * @param {number} startZ - Starting Z position
   * @returns {Promise<THREE.Mesh>} Created bot mesh
   */
  async createBot(botId, characterName = 'herald', startX = 0, startZ = 0) {
    // Create bot sprite
    const bot = createSpriteAtPosition(this.playerHeight, startX, startZ);
    this.scene.add(bot);

    // Load character animations
    const loaded = await loadBotAnimations(characterName);

    // Get health stats
    const healthStats = getBotHealthStats();

    // Bot state
    bot.userData = {
      id: botId,
      type: 'bot',
      characterName: characterName,
      animations: loaded,
      currentAnimKey: 'idle_front',
      lastFacing: 'front',

      // Health
      health: healthStats.defaultHealth,
      maxHealth: healthStats.maxHealth,

      // Health bar (will be created separately)
      healthBar: null,

      // Death fade tracking
      isDying: false,
      deathFadeTimer: 0,
      deathFadeDuration: DEATH_FADE_CONFIG.duration,

      // Stats for scoreboard
      kills: 0,
      deaths: 0
    };

    // Initialize physics
    initializeBotPhysics(bot.userData);

    // Initialize AI
    initializeBotAI(bot.userData, startX, startZ);

    // Set initial animation
    setBotAnimation(bot, 'idle_front', true);

    this.bots.push(bot);
    return bot;
  }

  /**
   * Update all bots
   * @param {number} dt - Delta time in seconds
   * @param {THREE.Vector3|null} playerPosition - Player position or null
   * @param {THREE.Camera} camera - Camera reference for billboarding
   */
  update(dt, playerPosition = null, camera = null) {
    for (const bot of this.bots) {
      const userData = bot.userData;
      
      // Handle death fade
      if (userData.isDying) {
        const fadeComplete = this._updateBotDeathFade(bot, dt);
        if (fadeComplete) {
          // Store killer ID before respawning (will be cleared in respawnBot)
          const killerId = userData.killerId;
          
          // Fade complete - respawn bot
          this.respawnBot(bot);
          
          // Return killer ID so caller can track kills
          if (killerId && this.onBotDeathCallback) {
            this.onBotDeathCallback(killerId);
          }
          
          continue;
        }
        // Skip other updates during death fade
        continue;
      }
      
      if (userData.health <= 0) {
        // Bot just died - start death fade
        userData.deaths = (userData.deaths || 0) + 1;
        this._startBotDeathFade(bot);
        continue;
      }

      // Update physics
      updateBotPhysics(bot, userData, dt, this.collisionManager);

      // Update AI direction change
      updateDirectionChangeTimer(userData, dt);

      // Calculate movement
      const movementResult = calculateBotMovement(bot, userData, playerPosition, dt, this.collisionManager);
      
      // Apply movement
      bot.position.x += movementResult.moveX;
      bot.position.z += movementResult.moveZ;
      userData.direction = movementResult.direction;

      // Update animation based on movement
      updateBotAnimationFromMovement(bot, movementResult.moveX, movementResult.moveZ);
      
      // Update animation frame
      updateBotAnimation(bot, dt);

      // Billboard to camera
      billboardBotToCamera(bot, camera);

      // Update shooting
      updateBotShooting(bot, userData, playerPosition, this.projectileManager, dt);
    }
  }

  /**
   * Start death fade effect for a bot
   * @param {THREE.Mesh} bot - Bot mesh
   * @private
   */
  _startBotDeathFade(bot) {
    startDeathFade(bot, bot.userData, bot.userData.characterName, this.particleManager);
  }

  /**
   * Update death fade effect for a bot
   * @param {THREE.Mesh} bot - Bot mesh
   * @param {number} dt - Delta time in seconds
   * @returns {boolean} True if fade is complete
   * @private
   */
  _updateBotDeathFade(bot, dt) {
    return updateDeathFade(bot, bot.userData, dt, bot.userData.deathFadeDuration);
  }

  /**
   * Get all alive bots
   * @returns {Array<THREE.Mesh>} Array of alive bot meshes
   */
  getBots() {
    return this.bots.filter(bot => bot.userData.health > 0);
  }

  /**
   * Get all bots including dead ones
   * @returns {Array<THREE.Mesh>} Array of all bot meshes
   */
  getAllBots() {
    return this.bots;
  }

  /**
   * Remove a bot from the scene
   * @param {THREE.Mesh} bot - Bot mesh to remove
   */
  removeBot(bot) {
    // Remove health bar
    if (bot.userData.healthBar) {
      this.scene.remove(bot.userData.healthBar);
    }
    
    // Remove from scene
    this.scene.remove(bot);
    
    // Clean up
    if (bot.material) bot.material.dispose();
    if (bot.geometry) bot.geometry.dispose();
    
    // Remove from array
    const index = this.bots.indexOf(bot);
    if (index > -1) {
      this.bots.splice(index, 1);
    }
  }

  /**
   * Clear all bots
   */
  clearAll() {
    for (const bot of [...this.bots]) {
      this.removeBot(bot);
    }
    this.bots = [];
  }

  /**
   * Damage a bot
   * @param {THREE.Mesh} bot - Bot mesh
   * @param {number} damage - Damage amount
   * @param {string} killerId - Optional player ID who caused the damage
   * @returns {boolean} True if bot is dead
   */
  damageBot(bot, damage, killerId = null) {
    if (!bot || !bot.userData) return false;
    const wasAlive = bot.userData.health > 0;
    bot.userData.health = Math.max(0, bot.userData.health - damage);
    const isDead = bot.userData.health <= 0;
    
    // Store killer ID when bot dies
    if (isDead && wasAlive && killerId) {
      bot.userData.killerId = killerId;
    }
    
    return isDead;
  }

  /**
   * Respawn a bot
   * @param {THREE.Mesh} bot - Bot mesh
   */
  respawnBot(bot) {
    if (!bot || !bot.userData) return;
    
    const healthStats = getBotHealthStats();
    
    // Reset death state
    bot.userData.isDying = false;
    bot.userData.deathFadeTimer = 0;
    bot.userData.killerId = null; // Clear killer ID
    
    // Reset health
    bot.userData.health = healthStats.maxHealth;
    
    // Reset opacity and scale
    if (bot.material) {
      bot.material.opacity = 1.0;
    }
    bot.scale.set(1, 1, 1);
    
    // Reset position to random spawn
    const halfArena = BOT_STATS.respawn.arenaHalfSize;
    bot.position.set(
      (Math.random() - 0.5) * halfArena * 2,
      this.playerHeight * 0.5,
      (Math.random() - 0.5) * halfArena * 2
    );
    
    // Reset physics
    initializeBotPhysics(bot.userData);
    
    // Reinitialize AI
    initializeBotAI(bot.userData, bot.position.x, bot.position.z);
    
    // Reset animation to idle
    setBotAnimation(bot, 'idle_front', true);
  }
}

