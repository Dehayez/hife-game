/**
 * ProjectileManager.js
 * 
 * Main manager for all projectile-related functionality.
 * Coordinates projectiles, mortars, fire areas, and collision detection.
 * 
 * This file acts as a facade, delegating to specialized modules:
 * - CharacterStats.js: Character ability stats configuration
 * - Projectile.js: Regular firebolt projectiles
 * - Mortar.js: Arc mortar projectiles
 * - FireArea.js: Fire splash areas after mortar impact
 * - CollisionHandler.js: Collision detection logic
 */

import { getFireboltStats, getMortarStats } from './CharacterStats.js';
import { createProjectile, updateProjectile, removeProjectile } from './Projectile.js';
import { createMortar, updateMortar, removeMortar as removeMortarMesh } from './Mortar.js';
import { createFireSplash as createFireSplashArea, updateFireArea, removeFireArea as removeFireAreaFromScene } from './FireArea.js';
import { checkAllCollisions, checkMortarGroundAndFireCollision } from './CollisionHandler.js';

export class ProjectileManager {
  /**
   * Create a new ProjectileManager
   * @param {Object} scene - THREE.js scene
   * @param {Object} collisionManager - Collision manager for wall/ground checks
   */
  constructor(scene, collisionManager = null) {
    this.scene = scene;
    this.collisionManager = collisionManager;
    
    // Active projectile arrays
    this.projectiles = [];
    this.mortars = [];
    this.fireAreas = [];
    
    // Cooldown tracking per player/character
    this.characterCooldowns = new Map(); // Firebolt cooldowns
    this.mortarCharacterCooldowns = new Map(); // Mortar cooldowns
  }

  /**
   * Set the collision manager (can be set after construction)
   * @param {Object} collisionManager - Collision manager instance
   */
  setCollisionManager(collisionManager) {
    this.collisionManager = collisionManager;
  }

  /**
   * Create a firebolt projectile
   * @param {number} startX - Starting X position
   * @param {number} startY - Starting Y position (character height)
   * @param {number} startZ - Starting Z position
   * @param {number} directionX - Direction X component
   * @param {number} directionZ - Direction Z component
   * @param {string} playerId - Player ID ('local' or player identifier)
   * @param {string} characterName - Character name ('lucy' or 'herald')
   * @returns {THREE.Mesh|null} Created projectile mesh or null if on cooldown
   */
  createProjectile(startX, startY, startZ, directionX, directionZ, playerId = 'local', characterName = 'lucy') {
    // Get character-specific firebolt stats
    const stats = getFireboltStats(characterName);
    
    // Check cooldown for this specific character
    const currentCooldown = this.characterCooldowns.get(playerId) || 0;
    if (currentCooldown > 0) return null;
    
    // Create projectile using Projectile module
    const projectile = createProjectile(
      this.scene,
      startX,
      startY,
      startZ,
      directionX,
      directionZ,
      playerId,
      characterName
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
   * Update all projectiles, mortars, and fire areas
   * Called each frame from the game loop
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    // Update firebolt cooldowns
    this.updateCooldowns(dt, this.characterCooldowns);
    
    // Update mortar cooldowns
    this.updateCooldowns(dt, this.mortarCharacterCooldowns);
    
    // Update mortars and check for ground impact
    this.updateMortars(dt);
    
    // Update fire splash areas
    this.updateFireAreas(dt);
    
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
        this.createFireSplash(
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
      
      // Check if mortar hit ground and should create fire splash
      // This check comes first to ensure splash is created even if hasExploded is true
      // A mortar can hit a player directly but still needs to create splash when hitting ground
      if (result && result.impact) {
        // Always create splash when mortar hits ground, regardless of whether it hit a player
        this.createFireSplash(
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
   * Update all fire splash areas
   * @param {number} dt - Delta time in seconds
   */
  updateFireAreas(dt) {
    const fireAreasToRemove = [];
    
    for (const fireArea of this.fireAreas) {
      // Update fire area using FireArea module
      const result = updateFireArea(fireArea, dt);
      
      if (result.shouldRemove) {
        fireAreasToRemove.push(fireArea);
      }
    }
    
    // Remove expired fire areas
    for (const fireArea of fireAreasToRemove) {
      this.removeFireArea(fireArea);
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
      
      // Update projectile using Projectile module
      const shouldRemove = updateProjectile(projectile, dt, this.collisionManager);
      
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
   * Create a fire splash area at impact point
   * @param {number} x - Impact X position
   * @param {number} y - Impact Y position (ground height)
   * @param {number} z - Impact Z position
   * @param {Object} mortarData - Mortar userData containing stats
   */
  createFireSplash(x, y, z, mortarData) {
    const fireArea = createFireSplashArea(this.scene, x, y, z, mortarData);
    this.fireAreas.push(fireArea);
  }

  /**
   * Check all projectiles, mortars, and fire areas for collision with player
   * @param {THREE.Vector3} playerPos - Player position
   * @param {number} playerSize - Player size
   * @param {string} playerId - Player ID
   * @returns {Object} Collision result with hit, damage, and source info
   */
  checkPlayerCollision(playerPos, playerSize, playerId = 'local') {
    return checkAllCollisions(
      this.projectiles,
      this.mortars,
      this.fireAreas,
      playerPos,
      playerSize,
      playerId,
      this.collisionManager
    );
  }

  /**
   * Check mortar ground impact and fire areas for collision with player
   * Used separately for ground collision checks
   * @param {THREE.Vector3} playerPos - Player position
   * @param {number} playerSize - Player size
   * @param {string} playerId - Player ID
   * @returns {Object} Collision result with hit, damage, and source info
   */
  checkMortarGroundCollision(playerPos, playerSize, playerId = 'local') {
    const result = checkMortarGroundAndFireCollision(
      this.mortars,
      this.fireAreas,
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
    removeProjectile(projectile, this.scene);
    
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
    removeMortarMesh(mortar, this.scene);
    
    // Remove from array
    const index = this.mortars.indexOf(mortar);
    if (index > -1) {
      this.mortars.splice(index, 1);
    }
  }

  /**
   * Remove a fire area from the scene
   * @param {THREE.Object3D} fireArea - Fire area container
   */
  removeFireArea(fireArea) {
    removeFireAreaFromScene(fireArea, this.scene);
    
    // Remove from array
    const index = this.fireAreas.indexOf(fireArea);
    if (index > -1) {
      this.fireAreas.splice(index, 1);
    }
  }

  /**
   * Clear all projectiles, mortars, and fire areas
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
    
    // Remove all fire areas
    for (const fireArea of [...this.fireAreas]) {
      this.removeFireArea(fireArea);
    }
    
    // Clear arrays
    this.projectiles = [];
    this.mortars = [];
    this.fireAreas = [];
  }

  /**
   * Get all active projectiles
   * @returns {Array<THREE.Mesh>} Array of projectile meshes
   */
  getProjectiles() {
    return this.projectiles;
  }

  /**
   * Check if player can shoot firebolt
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
   * Reset all cooldowns when character changes
   * @param {string} characterName - Character name (not currently used but kept for API consistency)
   */
  setCharacter(characterName) {
    // Reset all cooldowns when character changes
    this.characterCooldowns.clear();
    this.mortarCharacterCooldowns.clear();
  }

  /**
   * Get character stats (for external access if needed)
   * @param {string} characterName - Character name
   * @returns {Object} Character stats object
   */
  getCharacterStats(characterName) {
    return {
      firebolt: getFireboltStats(characterName),
      mortar: getMortarStats(characterName)
    };
  }
}

