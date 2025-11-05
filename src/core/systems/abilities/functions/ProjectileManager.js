/**
 * ProjectileManager.js
 * 
 * Main manager for all projectile-related functionality.
 * Coordinates projectiles, mortars, splash areas, and collision detection.
 * 
 * This file acts as a facade, delegating to specialized modules:
 * - stats/CharacterStats.js: Character ability stats configuration
 * - bolt/Bolt.js: Regular projectile shots
 * - mortar/Mortar.js: Arc mortar projectiles
 * - mortar/SplashArea.js: Splash areas after mortar impact
 * - collision/CollisionHandler.js: Collision detection logic
 */

import { getBoltStats, getMortarStats, getCharacterColor } from './CharacterAbilityStats.js';
import { createBolt, updateBolt, removeBolt } from './bolt';
import { createMortar, updateMortar, removeMortar as removeMortarMesh } from './mortar';
import { createSplashArea, updateSplashArea, removeSplashArea as removeSplashAreaFromScene } from './mortar/SplashArea.js';
import { checkAllCollisions, checkMortarGroundAndSplashCollision } from './collision/CollisionHandler.js';
import { CooldownManager } from '../../../../utils/CooldownUtils.js';
import { InstancedProjectileRenderer } from './utils/InstancedProjectileRenderer.js';
import { PerformanceOptimizer } from './utils/PerformanceOptimizer.js';

export class ProjectileManager {
  /**
   * Create a new ProjectileManager
   * @param {Object} scene - THREE.js scene
   * @param {Object} collisionManager - Collision manager for wall/ground checks
   * @param {Object} particleManager - Optional particle manager for impact effects
   */
  constructor(scene, collisionManager = null, particleManager = null, soundManager = null, useInstancedRendering = false) {
    this.scene = scene;
    this.collisionManager = collisionManager;
    this.particleManager = particleManager;
    this.soundManager = soundManager;
    this.useInstancedRendering = useInstancedRendering;
    
    // Active projectile arrays
    this.projectiles = [];
    this.mortars = [];
    this.splashAreas = [];
    
    // Track projectiles by ID for multiplayer synchronization
    this.projectilesById = new Map(); // Map<projectileId, projectile>
    
    // Instanced rendering system for performance optimization
    if (this.useInstancedRendering) {
      this.instancedRenderer = new InstancedProjectileRenderer(scene, 1000);
    }
    
    // Advanced performance optimizer
    this.performanceOptimizer = new PerformanceOptimizer();
    
    // Track update frame counter for adaptive update frequency
    this.updateFrameCounter = 0;
    
    // Cooldown tracking per player/character using shared CooldownManager
    this.characterCooldowns = new CooldownManager(); // Bolt cooldowns
    this.mortarCharacterCooldowns = new CooldownManager(); // Mortar cooldowns
    this.meleeCharacterCooldowns = new CooldownManager(); // Melee cooldowns
    
    // Bullet tracking per player
    this.playerBullets = new Map(); // Map<playerId, currentBullets>
    this.playerRechargeCooldowns = new CooldownManager(); // Recharge cooldowns per player
    this.playerCharacterNames = new Map(); // Map<playerId, characterName> - track character for each player
    this.playerReloadInfo = new Map(); // Map<playerId, {startBullets, targetBullets, proportionalRechargeTime}> - track manual reload state
    
    // Speed boost tracking per player (Lucy only)
    this.playerSpeedBoostActive = new Map(); // Map<playerId, {active: boolean, endTime: number}>
    this.playerSpeedBoostCooldowns = new CooldownManager(); // Speed boost cooldowns per player
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
   * Set the sound manager (for playing mortar explosion sounds)
   * @param {Object} soundManager - Sound manager instance
   */
  setSoundManager(soundManager) {
    this.soundManager = soundManager;
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
   * @returns {THREE.Mesh|null} Created projectile mesh or null if on cooldown or out of bullets
   */
  createProjectile(startX, startY, startZ, directionX, directionZ, playerId = 'local', characterName = 'lucy', targetX = null, targetZ = null) {
    // Get character-specific bolt stats
    const stats = getBoltStats(characterName);
    
    // Track character name for this player
    this.playerCharacterNames.set(playerId, characterName);
    
    // Initialize bullets if not set
    if (!this.playerBullets.has(playerId)) {
      this.playerBullets.set(playerId, Math.floor(stats.maxBullets));
    }
    
    // Check if reloading is in progress - cannot shoot while reloading
    if (!this.playerRechargeCooldowns.canAct(playerId)) {
      // Still recharging - cannot shoot
      return null;
    }
    
    // Check if player has bullets available
    let currentBullets = this.playerBullets.get(playerId) || 0;
    if (currentBullets <= 0) {
      // Recharge should be complete at this point (checked above), refill bullets
      currentBullets = Math.floor(stats.maxBullets);
      this.playerBullets.set(playerId, currentBullets);
    }
    
    // Check cooldown for this specific character
    if (!this.characterCooldowns.canAct(playerId)) return null;
    
    // Check performance optimization level for trail lights
    const optLevel = this.performanceOptimizer.updateLevel(this.projectiles.length);
    const enableTrailLights = this.performanceOptimizer.shouldEnableTrailLights();
    
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
      targetZ,
      this.particleManager,
      enableTrailLights // Pass trail light enable flag
    );
    
    if (!projectile) return null;
    
    // Disable or reduce trail light intensity if performance optimization requires it
    if (projectile.userData.trailLight && !enableTrailLights) {
      // Disable trail light completely
      projectile.userData.trailLight.visible = false;
      projectile.userData.trailLight.intensity = 0;
    } else if (projectile.userData.trailLight) {
      // Reduce intensity if needed
      const intensityMultiplier = this.performanceOptimizer.getTrailLightIntensity();
      projectile.userData.trailLight.intensity *= intensityMultiplier;
    }
    
    // Register with instanced renderer if enabled
    if (this.useInstancedRendering && this.instancedRenderer) {
      const projectileId = `projectile_${Date.now()}_${Math.random()}`;
      projectile.userData.instanceId = projectileId;
      
      // Get character color from projectile userData (stored by createBolt)
      const characterColor = projectile.userData.characterColor || getCharacterColor(characterName);
      
      const instanceData = this.instancedRenderer.addProjectile(
        projectileId,
        { x: startX, y: startY, z: startZ },
        characterColor,
        characterName
      );
      
      if (instanceData) {
        projectile.userData.instanceData = instanceData;
        // Hide the individual mesh since it's rendered via InstancedMesh
        // Keep mesh in scene for collision detection, but make it invisible
        projectile.visible = false;
      }
    }
    
    // Play bolt shot sound with position-based volume
    if (this.soundManager) {
      const soundPosition = { x: startX, y: startY, z: startZ };
      this.soundManager.playBoltShot(soundPosition);
    }
    
    // Add to projectiles array
    this.projectiles.push(projectile);
    
    // Track projectile by ID for multiplayer synchronization
    if (projectile.userData.projectileId) {
      this.projectilesById.set(projectile.userData.projectileId, projectile);
    }
    
    // Consume a bullet
    const newBulletCount = currentBullets - 1;
    this.playerBullets.set(playerId, newBulletCount);
    
    // If bullets depleted, start recharge cooldown
    // (reload check already passed above, so this is safe)
    if (newBulletCount <= 0) {
      this.playerRechargeCooldowns.setCooldown(playerId, stats.rechargeCooldown);
      // Clear manual reload info if it exists (automatic reload takes over)
      this.playerReloadInfo.delete(playerId);
    }
    
    // Apply speed boost multiplier if active (Lucy only)
    let cooldown = stats.cooldown;
    const speedBoostInfo = this.playerSpeedBoostActive.get(playerId);
    if (speedBoostInfo && stats.speedBoost) {
      // Check if speed boost is still active (verify with current time)
      const currentTime = Date.now() / 1000;
      const isStillActive = speedBoostInfo.active && currentTime < speedBoostInfo.endTime;
      
      if (isStillActive) {
        // Apply speed boost multiplier (reduces cooldown = faster shooting)
        const originalCooldown = cooldown;
        cooldown *= stats.speedBoost.cooldownMultiplier;
        // Removed console.log for performance - too many logs when shooting rapidly
      } else if (speedBoostInfo.active && currentTime >= speedBoostInfo.endTime) {
        // Speed boost just expired - update state
        speedBoostInfo.active = false;
        console.log('[SpeedBoost] Expired');
      }
    }
    
    // Set cooldown for this specific character/player
    this.characterCooldowns.setCooldown(playerId, cooldown);
    
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
    
    // Validate stats
    if (!stats || typeof stats.cooldown !== 'number' || stats.cooldown <= 0) {
      console.error('Invalid mortar stats or cooldown:', stats);
      return null;
    }
    
    // Check mortar cooldown for this specific character
    if (!this.mortarCharacterCooldowns.canAct(playerId)) {
      return null;
    }
    
    // Create mortar using Mortar module
    const mortar = createMortar(
      this.scene,
      startX,
      startY,
      startZ,
      targetX,
      targetZ,
      playerId,
      characterName,
      this.particleManager
    );
    
    if (!mortar) return null;
    
    // Add to mortars array
    this.mortars.push(mortar);
    
    // Set mortar cooldown for this specific character/player
    // Note: cooldown is in seconds (e.g., 2.5 for Lucy, 3.5 for Herald)
    const cooldownValue = stats.cooldown;
    if (typeof cooldownValue === 'number' && cooldownValue > 0 && isFinite(cooldownValue)) {
      this.mortarCharacterCooldowns.setCooldown(playerId, cooldownValue);
    }
    
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
   * Set multiplayer manager for sending position updates
   * @param {Object} multiplayerManager - Multiplayer manager instance
   */
  setMultiplayerManager(multiplayerManager) {
    this.multiplayerManager = multiplayerManager;
  }

  /**
   * Update all projectiles, mortars, and fire areas
   * Called each frame from the game loop
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    // Validate dt before updating cooldowns
    if (typeof dt !== 'number' || isNaN(dt) || dt <= 0 || !isFinite(dt)) {
      // Invalid dt - use safe default and continue with other updates
      // This prevents cooldowns from getting stuck if dt is invalid
      dt = 0.016; // Default to ~60fps frame time
    }
    
    // Update bolt cooldowns
    this.characterCooldowns.update(dt);
    
    // Update mortar cooldowns
    this.mortarCharacterCooldowns.update(dt);
    
    // Update melee cooldowns
    this.meleeCharacterCooldowns.update(dt);
    
    // Update recharge cooldowns
    this.playerRechargeCooldowns.update(dt);
    
    // Update speed boost cooldowns
    this.playerSpeedBoostCooldowns.update(dt);
    
    // Update speed boost active states (check if duration expired)
    const currentTime = Date.now() / 1000; // Convert to seconds
    for (const [playerId, speedBoostInfo] of this.playerSpeedBoostActive.entries()) {
      if (speedBoostInfo && speedBoostInfo.active) {
        if (currentTime >= speedBoostInfo.endTime) {
          // Speed boost expired - start cooldown now
          speedBoostInfo.active = false;
          
          // Get character name from playerCharacterNames map to get cooldown value
          const characterName = this.playerCharacterNames.get(playerId);
          if (characterName) {
            try {
              const stats = getBoltStats(characterName);
              if (stats.speedBoost) {
                this.playerSpeedBoostCooldowns.setCooldown(playerId, stats.speedBoost.cooldown);
                console.log('[SpeedBoost] Expired, starting cooldown:', stats.speedBoost.cooldown);
              }
            } catch (error) {
              console.warn('[SpeedBoost] Could not set cooldown on expiry:', error);
            }
          }
        }
      }
    }
    
    // Handle bullet recharge when cooldown completes
    for (const [playerId, characterName] of this.playerCharacterNames.entries()) {
      const currentBullets = this.playerBullets.get(playerId) || 0;
      if (this.playerRechargeCooldowns.canAct(playerId)) {
        // Recharge complete - check if this was a manual reload or automatic
        if (this.playerReloadInfo.has(playerId)) {
          // Manual reload - refill to target bullets
          const reloadInfo = this.playerReloadInfo.get(playerId);
          this.playerBullets.set(playerId, reloadInfo.targetBullets);
          this.playerReloadInfo.delete(playerId);
        } else if (currentBullets <= 0) {
          // Automatic reload (at 0 bullets) - refill to max
          const stats = getBoltStats(characterName);
          this.playerBullets.set(playerId, Math.floor(stats.maxBullets));
        }
      }
    }
    
    // Update mortars and check for ground impact
    this.updateMortars(dt);
    
    // Update splash areas
    this.updateSplashAreas(dt);
    
    // Update regular projectiles
    this.updateProjectiles(dt);
  }

  /**
   * Update cooldown timers
   * @deprecated Use CooldownManager.update() instead
   * @param {number} dt - Delta time in seconds
   * @param {Map} cooldownMap - Map of player IDs to cooldown values
   */
  updateCooldowns(dt, cooldownMap) {
    // Legacy method kept for compatibility, but should use CooldownManager
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
    
    // Update performance optimization level
    const optLevel = this.performanceOptimizer.updateLevel(this.projectiles.length);
    const updateFrequency = this.performanceOptimizer.getUpdateFrequency();
    this.updateFrameCounter++;
    
    // Early culling - remove out-of-bounds projectiles immediately
    const arenaSize = this.collisionManager?.arenaSize || 40;
    for (const projectile of this.projectiles) {
      if (this.performanceOptimizer.shouldEarlyCull(projectile, arenaSize)) {
        projectilesToRemove.push(projectile);
      }
    }
    
    // Adaptive update frequency - skip some projectiles when many are active
    const shouldUpdateAll = updateFrequency >= 1.0 || 
                           (this.updateFrameCounter % Math.ceil(1 / updateFrequency) === 0);
    
    for (const projectile of this.projectiles) {
      // Skip if already marked for removal
      if (projectilesToRemove.includes(projectile)) {
        continue;
      }
      // Remove projectiles that have hit something
      if (projectile.userData.hasHit) {
        // Play bolt hit sound with position-based volume
        if (this.soundManager && !projectile.userData.hitSoundPlayed) {
          const hitPosition = {
            x: projectile.position.x,
            y: projectile.position.y,
            z: projectile.position.z
          };
          this.soundManager.playBoltHit(hitPosition);
          projectile.userData.hitSoundPlayed = true; // Prevent multiple sounds
        }
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
      
      // Adaptive update frequency - skip updating some projectiles when many are active
      if (!shouldUpdateAll && Math.random() > updateFrequency) {
        // Skip this projectile's update this frame (only update position for instanced rendering)
        if (this.useInstancedRendering && this.instancedRenderer && projectile.userData.instanceId) {
          // Still update instanced renderer position even if we skip full update
          this.instancedRenderer.updateProjectile(
            projectile.userData.instanceId,
            {
              x: projectile.position.x,
              y: projectile.position.y,
              z: projectile.position.z
            }
          );
        }
        continue; // Skip rest of update for this projectile
      }
      
      // Update projectile using Bolt module
      const shouldRemove = updateBolt(
        projectile,
        dt,
        this.collisionManager,
        this.camera,
        this.inputManager,
        this.playerPosition
      );
      
      // Apply drift correction for remote projectiles
      // This ensures they stay in sync while using synced velocity
      if (projectile.userData.playerId !== 'local' && projectile.userData.lastSyncTime) {
        const timeSinceSync = (Date.now() - projectile.userData.lastSyncTime) / 1000; // Convert to seconds
        const maxDrift = 0.2; // Maximum allowed drift (in units)
        const correctionRate = 0.1; // How fast to correct drift (10% per frame)
        
        // Only correct if we have a recent sync (within last 0.2 seconds)
        if (timeSinceSync < 0.2) {
          const lastPos = projectile.userData.lastSyncedPosition;
          const dx = lastPos.x - projectile.position.x;
          const dy = lastPos.y - projectile.position.y;
          const dz = lastPos.z - projectile.position.z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          // Gradually correct drift if it's getting significant
          if (distance > maxDrift) {
            // Apply gradual correction (maintains smooth movement while fixing drift)
            projectile.position.x += dx * correctionRate;
            projectile.position.y += dy * correctionRate;
            projectile.position.z += dz * correctionRate;
          }
        }
      }
      
      // Update instanced renderer if enabled (batched at end of loop)
      if (this.useInstancedRendering && this.instancedRenderer && projectile.userData.instanceId) {
        this.instancedRenderer.updateProjectile(
          projectile.userData.instanceId,
          {
            x: projectile.position.x,
            y: projectile.position.y,
            z: projectile.position.z
          }
        );
      }
      
      // Send periodic position updates for owner projectiles (every 0.03 seconds)
      // Increased frequency to capture cursor following velocity changes better
      if (projectile.userData.playerId === 'local' && this.multiplayerManager && this.multiplayerManager.isInRoom()) {
        projectile.userData.syncTime = (projectile.userData.syncTime || 0) + dt;
        const syncInterval = 0.03; // Send updates every 30ms (faster sync for cursor following)
        
        if (projectile.userData.syncTime >= syncInterval) {
          projectile.userData.syncTime = 0;
          
          // Calculate distance moved since last sync
          const lastPos = projectile.userData.lastSyncedPosition;
          const dx = projectile.position.x - lastPos.x;
          const dy = projectile.position.y - lastPos.y;
          const dz = projectile.position.z - lastPos.z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          // Only send update if position changed significantly (more than 0.01 units)
          if (distance > 0.01) {
            this.multiplayerManager.sendProjectileUpdate({
              projectileId: projectile.userData.projectileId,
              x: projectile.position.x,
              y: projectile.position.y,
              z: projectile.position.z,
              velocityX: projectile.userData.velocityX,
              velocityZ: projectile.userData.velocityZ
            });
            
            // Update last synced position
            lastPos.x = projectile.position.x;
            lastPos.y = projectile.position.y;
            lastPos.z = projectile.position.z;
          }
        }
      }
      
      if (shouldRemove) {
        projectilesToRemove.push(projectile);
      }
    }
    
    // Batch upload all instanced matrix updates at once (much more efficient)
    if (this.useInstancedRendering && this.instancedRenderer) {
      this.instancedRenderer.markMatricesForUpdate();
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
    
    // Play mortar explosion sound with position-based volume
    if (this.soundManager) {
      const explosionPosition = { x: x, y: y, z: z };
      this.soundManager.playMortarExplosion(explosionPosition);
    }
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
    // Remove from ID tracking
    if (projectile.userData.projectileId) {
      this.projectilesById.delete(projectile.userData.projectileId);
    }
    
    // Remove from instanced renderer if enabled
    if (this.useInstancedRendering && this.instancedRenderer && projectile.userData.instanceId) {
      this.instancedRenderer.removeProjectile(projectile.userData.instanceId);
    }
    
    // Hide the mesh but keep it for collision detection compatibility
    // The instanced renderer handles the visual removal
    if (this.useInstancedRendering) {
      // Still need to clean up trail light and particles
      if (projectile.userData.trailLight) {
        this.scene.remove(projectile.userData.trailLight);
      }
      if (this.particleManager && projectile.userData.ambientParticles) {
        this.particleManager.removeProjectileParticles(projectile.userData.ambientParticles);
      }
    } else {
      // Use traditional removal method
      removeBolt(projectile, this.scene, this.particleManager);
    }
    
    // Remove from array
    const index = this.projectiles.indexOf(projectile);
    if (index > -1) {
      this.projectiles.splice(index, 1);
    }
  }
  
  /**
   * Update remote projectile position (called when receiving position updates from owner)
   * @param {string} projectileId - Projectile ID
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} z - Z position
   * @param {number} velocityX - Velocity X component
   * @param {number} velocityZ - Velocity Z component
   */
  updateRemoteProjectilePosition(projectileId, x, y, z, velocityX, velocityZ) {
    const projectile = this.projectilesById.get(projectileId);
    if (!projectile) {
      return;
    }
    
    // ALWAYS update velocity - this is critical for cursor following
    // The owner's velocity reflects their cursor following behavior (curved path)
    // By syncing velocity, the remote projectile will follow the same curved path
    projectile.userData.velocityX = velocityX;
    projectile.userData.velocityZ = velocityZ;
    
    // Store synced position and time for drift correction
    projectile.userData.lastSyncedPosition.x = x;
    projectile.userData.lastSyncedPosition.y = y;
    projectile.userData.lastSyncedPosition.z = z;
    projectile.userData.lastSyncTime = Date.now();
    
    // Calculate position difference to check if we need to correct drift
    const dx = x - projectile.position.x;
    const dy = y - projectile.position.y;
    const dz = z - projectile.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Only correct position if drift is significant (more than 0.3 units)
    // This allows the projectile to move smoothly using the synced velocity
    // while preventing major desync
    if (distance > 0.3) {
      // Snap to synced position if too far off (prevents major desync)
      projectile.position.x = x;
      projectile.position.y = y;
      projectile.position.z = z;
      
      // Update trail light position if it exists
      if (projectile.userData.trailLight) {
        projectile.userData.trailLight.position.set(x, y, z);
      }
      
      // Update instanced renderer if enabled
      if (this.useInstancedRendering && this.instancedRenderer && projectile.userData.instanceId) {
        this.instancedRenderer.updateProjectile(
          projectile.userData.instanceId,
          { x, y, z }
        );
      }
    }
    // Otherwise, let the projectile continue moving with the synced velocity
    // The normal update loop will handle the movement, and the synced velocity
    // will make it follow the same curved path as the owner's projectile
  }

  /**
   * Remove a mortar from the scene
   * @param {THREE.Mesh} mortar - Mortar mesh
   */
  removeMortar(mortar) {
    // Stop arc sound if playing
    if (mortar.userData && mortar.userData.arcSound) {
      mortar.userData.arcSound.stop();
      mortar.userData.arcSound = null;
    }
    
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
    
    // Clear instanced renderer if enabled
    if (this.useInstancedRendering && this.instancedRenderer) {
      this.instancedRenderer.clear();
    }
    
    // Clear arrays and ID tracking
    this.projectiles = [];
    this.mortars = [];
    this.splashAreas = [];
    this.projectilesById.clear();
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
   * @param {string} characterName - Character name (optional, used if playerId not tracked)
   * @returns {boolean} True if player can shoot
   */
  canShoot(playerId = null, characterName = null) {
    // If player ID provided, check both cooldown and bullets
    if (playerId) {
      // Check cooldown first
      if (!this.characterCooldowns.canAct(playerId)) {
        return false;
      }
      
      // Check if reloading is in progress - cannot shoot while reloading
      if (!this.playerRechargeCooldowns.canAct(playerId)) {
        return false;
      }
      
      // Check if player has bullets or can recharge
      const currentBullets = this.playerBullets.get(playerId);
      if (currentBullets === undefined) {
        // Player not initialized yet - allow shooting (will initialize on first shot)
        return true;
      }
      
      // If has bullets, can shoot (reload check already passed above)
      if (currentBullets > 0) {
        return true;
      }
      
      // Out of bullets - recharge should be complete at this point (checked above)
      return true;
    }
    
    // Otherwise, check if any character can shoot
    // Note: CooldownManager doesn't expose size, so we check differently
    return true; // Simplified - always allow if no specific player check
  }

  /**
   * Check if player can shoot mortar
   * @param {string} playerId - Player ID to check
   * @returns {boolean} True if player can shoot mortar
   */
  canShootMortar(playerId = null) {
    // If player ID provided, check mortar cooldown for that specific player/character
    if (playerId) {
      return this.mortarCharacterCooldowns.canAct(playerId);
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
    const stats = getMortarStats(characterName);
    return this.mortarCharacterCooldowns.getCooldownInfo(playerId, stats.cooldown);
  }

  /**
   * Reset all cooldowns when character changes
   * @param {string} characterName - Character name
   * @param {string} playerId - Player ID (defaults to 'local')
   */
  setCharacter(characterName, playerId = 'local') {
    // Reset all cooldowns when character changes
    this.characterCooldowns.clear();
    this.mortarCharacterCooldowns.clear();
    this.meleeCharacterCooldowns.clear();
    this.playerRechargeCooldowns.clear();
    
    // Clear reload info
    this.playerReloadInfo.delete(playerId);
    
    // Reset bullets for new character
    const stats = getBoltStats(characterName);
    this.playerBullets.set(playerId, Math.floor(stats.maxBullets));
    this.playerCharacterNames.set(playerId, characterName);
  }
  
  /**
   * Reset all cooldowns for all abilities (shot, mortar, melee)
   * Called on death/respawn to ensure all abilities are ready
   * @param {string} playerId - Player ID (defaults to 'local')
   * @param {string} characterName - Character name (optional, used to refill bullets)
   */
  resetAllCooldowns(playerId = 'local', characterName = null) {
    this.characterCooldowns.clear();
    this.mortarCharacterCooldowns.clear();
    this.meleeCharacterCooldowns.clear();
    this.playerRechargeCooldowns.clear();
    
    // Clear reload info
    this.playerReloadInfo.delete(playerId);
    
    // Refill bullets if character name provided
    if (characterName) {
      const stats = getBoltStats(characterName);
      this.playerBullets.set(playerId, Math.floor(stats.maxBullets));
      this.playerCharacterNames.set(playerId, characterName);
    }
  }
  
  /**
   * Set melee cooldown for a player
   * Called from GameLoop to sync melee cooldown timer
   * @param {string} playerId - Player ID ('local' or player identifier)
   * @param {number} cooldown - Cooldown value in seconds
   */
  setMeleeCooldown(playerId, cooldown) {
    this.meleeCharacterCooldowns.setCooldown(playerId, cooldown);
  }

  /**
   * Set special ability cooldown for a player
   * Called from GameLoop to sync special ability cooldown timer (Herald blast, Lucy multi-projectile)
   * @param {string} playerId - Player ID ('local' or player identifier)
   * @param {number} cooldown - Cooldown value in seconds
   */
  setSpecialAbilityCooldown(playerId, cooldown) {
    // Store special ability cooldown per player
    if (!this.specialAbilityCooldowns) {
      this.specialAbilityCooldowns = new Map();
    }
    this.specialAbilityCooldowns.set(playerId, cooldown);
  }

  /**
   * Get special ability cooldown for a player
   * @param {string} playerId - Player ID ('local' or player identifier)
   * @returns {number} Cooldown value in seconds
   */
  getSpecialAbilityCooldown(playerId) {
    if (!this.specialAbilityCooldowns) {
      return 0;
    }
    return this.specialAbilityCooldowns.get(playerId) || 0;
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

  /**
   * Manually reload bullets for a player (triggered by X button)
   * @param {string} playerId - Player ID
   * @param {string} characterName - Character name
   * @returns {boolean} True if reload was started, false if already recharging
   */
  manualReload(playerId, characterName) {
    const stats = getBoltStats(characterName);
    const maxBullets = Math.floor(stats.maxBullets);
    const currentBullets = this.playerBullets.get(playerId) || maxBullets;
    
    // If already full, don't reload
    if (currentBullets >= maxBullets) {
      return false; // Already full
    }
    
    // If already recharging, don't start another reload
    if (!this.playerRechargeCooldowns.canAct(playerId)) {
      return false; // Already recharging
    }
    
    // Calculate how many bullets are missing
    const missingBullets = maxBullets - currentBullets;
    const missingBulletPercent = missingBullets / maxBullets;
    
    // Calculate proportional recharge time based on missing bullets
    const proportionalRechargeTime = stats.rechargeCooldown * missingBulletPercent;
    
    // Store reload info for progress tracking
    this.playerReloadInfo.set(playerId, {
      startBullets: currentBullets,
      targetBullets: maxBullets,
      proportionalRechargeTime: proportionalRechargeTime
    });
    
    // Start reload with proportional time
    this.playerRechargeCooldowns.setCooldown(playerId, proportionalRechargeTime);
    this.playerCharacterNames.set(playerId, characterName);
    
    return true; // Reload started
  }

  /**
   * Activate speed boost for a player
   * @param {string} playerId - Player ID
   * @param {string} characterName - Character name
   * @returns {boolean} True if speed boost was activated, false if on cooldown or not available
   */
  activateSpeedBoost(playerId, characterName) {
    const stats = getBoltStats(characterName);
    
    // Check if speed boost config exists
    if (!stats.speedBoost) {
      console.log('[SpeedBoost] No speedBoost config in stats:', stats);
      return false;
    }
    
    // Check if already on cooldown
    if (!this.playerSpeedBoostCooldowns.canAct(playerId)) {
      const cooldown = this.playerSpeedBoostCooldowns.getCooldown(playerId);
      console.log('[SpeedBoost] On cooldown:', cooldown);
      return false; // On cooldown
    }
    
    // Check if already active
    const speedBoostInfo = this.playerSpeedBoostActive.get(playerId);
    if (speedBoostInfo && speedBoostInfo.active) {
      console.log('[SpeedBoost] Already active');
      return false; // Already active
    }
    
    // Activate speed boost
    const currentTime = Date.now() / 1000; // Convert to seconds
    const endTime = currentTime + stats.speedBoost.duration;
    
    this.playerSpeedBoostActive.set(playerId, {
      active: true,
      endTime: endTime
    });
    
    // Ensure characterName is stored for cooldown calculation when speedboost expires
    this.playerCharacterNames.set(playerId, characterName);
    
    // Don't set cooldown here - it will be set when speedboost expires
    
    console.log('[SpeedBoost] Activated! Duration:', stats.speedBoost.duration, 'Cooldown:', stats.speedBoost.cooldown);
    return true; // Speed boost activated
  }

  /**
   * Get speed boost info for a player (for UI display)
   * @param {string} playerId - Player ID
   * @param {string} characterName - Character name
   * @returns {Object} Speed boost info with active state, cooldown, and percentage
   */
  getSpeedBoostInfo(playerId, characterName) {
    const stats = getBoltStats(characterName);
    
    // Check if speed boost config exists - works for any character with speed boost config
    if (!stats.speedBoost) {
      return {
        active: false,
        cooldown: 0,
        percentage: 0,
        canActivate: false
      };
    }
    
    const speedBoostInfo = this.playerSpeedBoostActive.get(playerId);
    const currentTime = Date.now() / 1000;
    
    // Check if still active (also check expiration)
    let isActive = false;
    if (speedBoostInfo && speedBoostInfo.active) {
      if (currentTime < speedBoostInfo.endTime) {
        isActive = true;
      } else {
        // Expired - update state
        speedBoostInfo.active = false;
        isActive = false;
      }
    }
    
    const cooldown = this.playerSpeedBoostCooldowns.getCooldown(playerId);
    const canActivate = this.playerSpeedBoostCooldowns.canAct(playerId) && !isActive;
    
    let percentage = 0;
    
    if (isActive && speedBoostInfo) {
      // Show duration progress (how much time is left)
      const elapsed = currentTime - (speedBoostInfo.endTime - stats.speedBoost.duration);
      const durationProgress = stats.speedBoost.duration > 0 
        ? Math.min(Math.max(elapsed / stats.speedBoost.duration, 0), 1.0)
        : 0;
      percentage = durationProgress; // 0 = just started, 1 = about to expire
    } else {
      // Show cooldown progress (how much cooldown is left)
      const cooldownPercent = stats.speedBoost.cooldown > 0 
        ? Math.min(cooldown / stats.speedBoost.cooldown, 1.0) 
        : 0;
      percentage = cooldownPercent; // 1 = full cooldown, 0 = ready
    }
    
    return {
      active: isActive,
      cooldown: cooldown,
      percentage: percentage,
      canActivate: canActivate
    };
  }

  /**
   * Get bullet info for a player (for UI display)
   * @param {string} playerId - Player ID
   * @param {string} characterName - Character name
   * @returns {Object} Bullet info with current, max, percentage, and recharge info
   */
  getBoltBulletInfo(playerId, characterName) {
    const stats = getBoltStats(characterName);
    const maxBullets = Math.floor(stats.maxBullets);
    
    // Track character name for this player
    this.playerCharacterNames.set(playerId, characterName);
    
    // Initialize bullets if not set yet
    if (!this.playerBullets.has(playerId)) {
      this.playerBullets.set(playerId, maxBullets);
    }
    
    const currentBullets = this.playerBullets.get(playerId) || 0;
    const rechargeCooldown = this.playerRechargeCooldowns.getCooldown(playerId);
    const isRecharging = rechargeCooldown > 0;
    
    // If recharging (manual reload or automatic at 0), show recharge progress
    if (isRecharging) {
      // Check if this is a manual reload with reload info
      let actualMaxRechargeTime = stats.rechargeCooldown;
      let startBullets = 0;
      let targetBullets = maxBullets;
      
      if (this.playerReloadInfo.has(playerId)) {
        // Manual reload - use proportional recharge time
        const reloadInfo = this.playerReloadInfo.get(playerId);
        actualMaxRechargeTime = reloadInfo.proportionalRechargeTime;
        startBullets = reloadInfo.startBullets;
        targetBullets = reloadInfo.targetBullets;
      }
      
      const rechargePercent = actualMaxRechargeTime > 0 ? Math.min(rechargeCooldown / actualMaxRechargeTime, 1.0) : 0;
      
      // Calculate current bullet count during reload (interpolate from start to target)
      const bulletRange = targetBullets - startBullets;
      const filledBullets = startBullets + (bulletRange * (1 - rechargePercent));
      const bulletPercent = maxBullets > 0 ? filledBullets / maxBullets : 0;
      
      return {
        current: Math.floor(filledBullets),
        max: maxBullets,
        percentage: bulletPercent,
        isRecharging: true,
        rechargeRemaining: rechargeCooldown,
        rechargeMax: actualMaxRechargeTime
      };
    }
    
    // Otherwise, show bullet count
    const bulletPercent = maxBullets > 0 ? currentBullets / maxBullets : 0;
    return {
      current: currentBullets,
      max: maxBullets,
      percentage: bulletPercent,
      isRecharging: false,
      rechargeRemaining: 0,
      rechargeMax: stats.rechargeCooldown
    };
  }
}

