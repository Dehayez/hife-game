/**
 * ProjectileManager.js
 * 
 * Main manager for all projectile-related functionality.
 * Coordinates projectiles, mortars, splash areas, and collision detection.
 * 
 * This file acts as a facade, delegating to specialized modules:
 * - stats/CharacterStats.js: Character ability stats configuration
 * - projectile/Bolt.js: Regular projectile shots
 * - mortar/Mortar.js: Arc mortar projectiles
 * - mortar/SplashArea.js: Splash areas after mortar impact
 * - collision/CollisionHandler.js: Collision detection logic
 */

import { getBoltStats, getMortarStats } from './stats/CharacterStats.js';
import { createBolt, updateBolt, removeBolt } from './projectile/Bolt.js';
import { createMortar, updateMortar, removeMortar as removeMortarMesh } from './mortar/Mortar.js';
import { createSplashArea, updateSplashArea, removeSplashArea as removeSplashAreaFromScene } from './mortar/SplashArea.js';
import { checkAllCollisions, checkMortarGroundAndSplashCollision } from './collision/CollisionHandler.js';

export class ProjectileManager {
  /**
   * Create a new ProjectileManager
   * @param {Object} scene - THREE.js scene
   * @param {Object} collisionManager - Collision manager for wall/ground checks
   * @param {Object} particleManager - Optional particle manager for impact effects
   */
  constructor(scene, collisionManager = null, particleManager = null) {
    this.scene = scene;
    this.collisionManager = collisionManager;
    this.particleManager = particleManager;
    
    // Active projectile arrays
    this.projectiles = [];
    this.mortars = [];
    this.splashAreas = [];
    
    // Cooldown tracking per player/character
    this.characterCooldowns = new Map(); // Bolt cooldowns
    this.mortarCharacterCooldowns = new Map(); // Mortar cooldowns
    this.meleeCharacterCooldowns = new Map(); // Melee cooldowns
  }

  /**
   * Set the collision manager (can be set after construction)
   * @param {Object} collisionManager - Collision manager instance
   */
  setCollisionManager(collisionManager) {
    this.collisionManager = collisionManager;
  }

  /**
   * Set the particle manager (can be set after construction)
   * @param {Object} particleManager - Particle manager instance
   */
  setParticleManager(particleManager) {
    this.particleManager = particleManager;
  }

  /**
   * Set the bot manager (for tracking bot projectile heights)
   * @param {Object} botManager - Bot manager instance
   */
  setBotManager(botManager) {
    this.botManager = botManager;
  }

  /**
   * Create a bolt projectile
   * @param {number} startX - Starting X position
   * @param {number} startY - Starting Y position (character height)
   * @param {number} startZ - Starting Z position
   * @param {number} directionX - Direction X component
   * @param {number} directionZ - Direction Z component
   * @param {string} playerId - Player ID ('local' or player identifier)
   * @param {string} characterName - Character name ('lucy' or 'herald')
   * @param {number} targetX - Optional target X position for cursor following
   * @param {number} targetZ - Optional target Z position for cursor following
   * @returns {THREE.Mesh|null} Created projectile mesh or null if on cooldown
   */
  createProjectile(startX, startY, startZ, directionX, directionZ, playerId = 'local', characterName = 'lucy', targetX = null, targetZ = null) {
    // Get character-specific bolt stats
    const stats = getBoltStats(characterName);
    
    // Check cooldown for this specific character
    const currentCooldown = this.characterCooldowns.get(playerId) || 0;
    if (currentCooldown > 0) return null;
    
    // Create projectile using Bolt module
    const projectile = createBolt(
      this.scene,
      startX,
      startY,
      startZ,
      directionX,
      directionZ,
      playerId,
      characterName,
      targetX,
      targetZ
    );
    
    if (!projectile) return null;
    
    // Add to projectiles array
    this.projectiles.push(projectile);
    
    // Set cooldown for this specific character/player
    this.characterCooldowns.set(playerId, stats.cooldown);
    
    return projectile;
  }

  /**
   * Create a mortar projectile
   * @param {number} startX - Starting X position
   * @param {number} startY - Starting Y position (character height)
   * @param {number} startZ - Starting Z position
   * @param {number} targetX - Target X position
   * @param {number} targetZ - Target Z position
   * @param {string} playerId - Player ID ('local' or player identifier)
   * @param {string} characterName - Character name ('lucy' or 'herald')
   * @returns {THREE.Mesh|null} Created mortar mesh or null if on cooldown
   */
  createMortar(startX, startY, startZ, targetX, targetZ, playerId = 'local', characterName = 'lucy') {
    // Get character-specific mortar stats
    const stats = getMortarStats(characterName);
    
    // Check mortar cooldown for this specific character
    const currentCooldown = this.mortarCharacterCooldowns.get(playerId) || 0;
    if (currentCooldown > 0) return null;
    
    // Create mortar using Mortar module
    const mortar = createMortar(
      this.scene,
      startX,
      startY,
      startZ,
      targetX,
      targetZ,
      playerId,
      characterName
    );
    
    if (!mortar) return null;
    
    // Add to mortars array
    this.mortars.push(mortar);
    
    // Set mortar cooldown for this specific character/player
    this.mortarCharacterCooldowns.set(playerId, stats.cooldown);
    
    return mortar;
  }

  /**
   * Set references for cursor tracking (camera and input manager)
   * @param {Object} camera - THREE.js camera
   * @param {Object} inputManager - Input manager instance
   * @param {Object} playerPosition - Player position vector
   */
  setCursorTracking(camera, inputManager, playerPosition) {
    this.camera = camera;
    this.inputManager = inputManager;
    this.playerPosition = playerPosition;
  }

  /**
   * Update all projectiles, mortars, and fire areas
   * Called each frame from the game loop
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    // Update bolt cooldowns
    this.updateCooldowns(dt, this.characterCooldowns);
    
    // Update mortar cooldowns
    this.updateCooldowns(dt, this.mortarCharacterCooldowns);
    
    // Update melee cooldowns
    this.updateCooldowns(dt, this.meleeCharacterCooldowns);
    
    // Update mortars and check for ground impact
    this.updateMortars(dt);
    
    // Update splash areas
    this.updateSplashAreas(dt);
    
    // Update regular projectiles
    this.updateProjectiles(dt);
  }

  /**
   * Update cooldown timers
   * @param {number} dt - Delta time in seconds
   * @param {Map} cooldownMap - Map of player IDs to cooldown values
   */
  updateCooldowns(dt, cooldownMap) {
    for (const [playerId, cooldown] of cooldownMap.entries()) {
      const newCooldown = Math.max(0, cooldown - dt);
      if (newCooldown > 0) {
        cooldownMap.set(playerId, newCooldown);
      } else {
        cooldownMap.delete(playerId);
      }
    }
  }

  /**
   * Update all mortars and handle ground impact
   * @param {number} dt - Delta time in seconds
   */
  updateMortars(dt) {
    const mortarsToRemove = [];
    
    for (const mortar of this.mortars) {
      // Check if mortar needs splash creation from direct hit at ground level
      if (mortar.userData.needsSplash) {
        // Create splash immediately when direct hit was detected at ground level
        this.createSplash(
          mortar.userData.splashX,
          mortar.userData.splashY,
          mortar.userData.splashZ,
          mortar.userData
        );
        mortar.userData.needsSplash = false; // Clear flag
        mortarsToRemove.push(mortar);
        continue;
      }
      
      // Update mortar using Mortar module
      const result = updateMortar(mortar, dt, this.collisionManager);
      
      // Check if mortar hit ground and should create splash
      // This check comes first to ensure splash is created even if hasExploded is true
      // A mortar can hit a player directly but still needs to create splash when hitting ground
      if (result && result.impact) {
        // Always create splash when mortar hits ground, regardless of whether it hit a player
        this.createSplash(
          result.impact.x,
          result.impact.y,
          result.impact.z,
          result.impact.mortarData
        );
        mortarsToRemove.push(mortar);
      }
      // Check if mortar should be removed (expired lifetime)
      else if (result && result.shouldRemove) {
        mortarsToRemove.push(mortar);
      }
      // Remove mortars that exploded mid-air (checkMortarCollision marked them)
      // Only remove mid-air explosions, not direct player hits (those need to hit ground first)
      else if (mortar.userData.hasExploded && !mortar.userData.hitPlayer) {
        // This mortar exploded mid-air (not a direct hit or ground impact), remove it without splash
        mortarsToRemove.push(mortar);
      }
      // If mortar hit a player directly but hasn't hit ground yet, let it continue until ground impact at target
      // (hasExploded = true and hitPlayer = true, but no result.impact yet)
      // The mortar will continue to target position and create splash there
    }
    
    // Remove expired or exploded mortars
    for (const mortar of mortarsToRemove) {
      this.removeMortar(mortar);
    }
  }

  /**
   * Update all splash areas
   * @param {number} dt - Delta time in seconds
   */
  updateSplashAreas(dt) {
    const splashAreasToRemove = [];
    
    for (const splashArea of this.splashAreas) {
      // Update splash area using SplashArea module
      const result = updateSplashArea(splashArea, dt);
      
      if (result.shouldRemove) {
        splashAreasToRemove.push(splashArea);
      }
    }
    
    // Remove expired splash areas
    for (const splashArea of splashAreasToRemove) {
      this.removeSplashArea(splashArea);
    }
  }

  /**
   * Update all regular projectiles
   * @param {number} dt - Delta time in seconds
   */
  updateProjectiles(dt) {
    const projectilesToRemove = [];
    
    for (const projectile of this.projectiles) {
      // Remove projectiles that have hit something
      if (projectile.userData.hasHit) {
        projectilesToRemove.push(projectile);
        continue;
      }
      
      // Update shooter Y position dynamically
      // For bot projectiles, get current bot Y position
      // For player projectiles, shooterY is set once at creation time and never updated
      // This prevents existing projectiles from changing height when player jumps
      if (projectile.userData.playerId !== 'local' && this.botManager) {
        // This is a bot projectile - find the bot and get its current Y position
        const bots = this.botManager.getBots();
        const bot = bots.find(b => b.userData.id === projectile.userData.playerId);
        if (bot) {
          // Update shooterY to bot's current Y position (bots can move continuously)
          projectile.userData.shooterY = bot.position.y;
        }
      }
      // Note: For local player projectiles, shooterY is set once at creation time (in Bolt.js)
      // and is never updated here. This ensures projectiles fire from jump height but
      // don't change trajectory when player continues jumping.
      
      // Update projectile using Bolt module
      const shouldRemove = updateBolt(
        projectile,
        dt,
        this.collisionManager,
        this.camera,
        this.inputManager,
        this.playerPosition
      );
      
      if (shouldRemove) {
        projectilesToRemove.push(projectile);
      }
    }
    
    // Remove expired or collided projectiles
    for (const projectile of projectilesToRemove) {
      this.removeProjectile(projectile);
    }
  }

  /**
   * Create a splash area at impact point
   * @param {number} x - Impact X position
   * @param {number} y - Impact Y position (ground height)
   * @param {number} z - Impact Z position
   * @param {Object} mortarData - Mortar userData containing stats
   */
  createSplash(x, y, z, mortarData) {
    const splashArea = createSplashArea(this.scene, x, y, z, mortarData);
    this.splashAreas.push(splashArea);
  }

  /**
   * Check all projectiles, mortars, and splash areas for collision with player
   * @param {THREE.Vector3} playerPos - Player position
   * @param {number} playerSize - Player size
   * @param {string} playerId - Player ID
   * @returns {Object} Collision result with hit, damage, and source info
   */
  checkPlayerCollision(playerPos, playerSize, playerId = 'local') {
    return checkAllCollisions(
      this.projectiles,
      this.mortars,
      this.splashAreas,
      playerPos,
      playerSize,
      playerId,
      this.collisionManager
    );
  }

  /**
   * Check mortar ground impact and splash areas for collision with player
   * Used separately for ground collision checks
   * @param {THREE.Vector3} playerPos - Player position
   * @param {number} playerSize - Player size
   * @param {string} playerId - Player ID
   * @returns {Object} Collision result with hit, damage, and source info
   */
  checkMortarGroundCollision(playerPos, playerSize, playerId = 'local') {
    const result = checkMortarGroundAndSplashCollision(
      this.mortars,
      this.splashAreas,
      playerPos,
      playerSize,
      playerId,
      this.collisionManager
    );
    
    return result;
  }

  /**
   * Remove a projectile from the scene
   * @param {THREE.Mesh} projectile - Projectile mesh
   */
  removeProjectile(projectile) {
    removeBolt(projectile, this.scene, this.particleManager);
    
    // Remove from array
    const index = this.projectiles.indexOf(projectile);
    if (index > -1) {
      this.projectiles.splice(index, 1);
    }
  }

  /**
   * Remove a mortar from the scene
   * @param {THREE.Mesh} mortar - Mortar mesh
   */
  removeMortar(mortar) {
    removeMortarMesh(mortar, this.scene, this.particleManager);
    
    // Remove from array
    const index = this.mortars.indexOf(mortar);
    if (index > -1) {
      this.mortars.splice(index, 1);
    }
  }

  /**
   * Remove a splash area from the scene
   * @param {THREE.Object3D} splashArea - Splash area container
   */
  removeSplashArea(splashArea) {
    removeSplashAreaFromScene(splashArea, this.scene);
    
    // Remove from array
    const index = this.splashAreas.indexOf(splashArea);
    if (index > -1) {
      this.splashAreas.splice(index, 1);
    }
  }

  /**
   * Clear all projectiles, mortars, and splash areas
   * Used when mode changes or game resets
   */
  clearAll() {
    // Remove all projectiles
    for (const projectile of [...this.projectiles]) {
      this.removeProjectile(projectile);
    }
    
    // Remove all mortars
    for (const mortar of [...this.mortars]) {
      this.removeMortar(mortar);
    }
    
    // Remove all splash areas
    for (const splashArea of [...this.splashAreas]) {
      this.removeSplashArea(splashArea);
    }
    
    // Clear arrays
    this.projectiles = [];
    this.mortars = [];
    this.splashAreas = [];
  }

  /**
   * Get all active projectiles
   * @returns {Array<THREE.Mesh>} Array of projectile meshes
   */
  getProjectiles() {
    return this.projectiles;
  }

  /**
   * Check if player can shoot bolt
   * @param {string} playerId - Player ID to check
   * @returns {boolean} True if player can shoot
   */
  canShoot(playerId = null) {
    // If player ID provided, check cooldown for that specific player/character
    if (playerId) {
      const cooldown = this.characterCooldowns.get(playerId) || 0;
      return cooldown <= 0;
    }
    
    // Otherwise, check if any character can shoot
    return this.characterCooldowns.size === 0 || 
           Array.from(this.characterCooldowns.values()).some(cd => cd <= 0);
  }

  /**
   * Check if player can shoot mortar
   * @param {string} playerId - Player ID to check
   * @returns {boolean} True if player can shoot mortar
   */
  canShootMortar(playerId = null) {
    // If player ID provided, check mortar cooldown for that specific player/character
    if (playerId) {
      const cooldown = this.mortarCharacterCooldowns.get(playerId) || 0;
      return cooldown <= 0;
    }
    
    return true;
  }

  /**
   * Get mortar cooldown information for a player
   * @param {string} playerId - Player ID to check
   * @param {string} characterName - Character name to get max cooldown time
   * @returns {Object} Cooldown info with remaining time, percentage, and canShoot flag
   */
  getMortarCooldownInfo(playerId, characterName) {
    const currentCooldown = this.mortarCharacterCooldowns.get(playerId) || 0;
    const stats = getMortarStats(characterName);
    const maxCooldown = stats.cooldown;
    const percentage = maxCooldown > 0 ? (currentCooldown / maxCooldown) : 0;
    
    return {
      remaining: currentCooldown,
      percentage: Math.max(0, Math.min(1, percentage)),
      canShoot: currentCooldown <= 0
    };
  }

  /**
   * Reset all cooldowns when character changes
   * @param {string} characterName - Character name (not currently used but kept for API consistency)
   */
  setCharacter(characterName) {
    // Reset all cooldowns when character changes
    this.characterCooldowns.clear();
    this.mortarCharacterCooldowns.clear();
    this.meleeCharacterCooldowns.clear();
  }
  
  /**
   * Set melee cooldown for a player
   * Called from GameLoop to sync melee cooldown timer
   * @param {string} playerId - Player ID ('local' or player identifier)
   * @param {number} cooldown - Cooldown value in seconds
   */
  setMeleeCooldown(playerId, cooldown) {
    if (cooldown > 0) {
      this.meleeCharacterCooldowns.set(playerId, cooldown);
    } else {
      this.meleeCharacterCooldowns.delete(playerId);
    }
  }

  /**
   * Get character stats (for external access if needed)
   * @param {string} characterName - Character name
   * @returns {Object} Character stats object
   */
  getCharacterStats(characterName) {
    return {
      bolt: getBoltStats(characterName),
      mortar: getMortarStats(characterName)
    };
  }
}

