/**
 * GameLoop.js
 * 
 * Main game loop coordinator.
 * Handles game updates, rendering, and system coordination.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getCharacterColor, getMeleeStats, getMortarStats, getBlastStats, getMultiProjectileStats, getHeraldRollStats } from '../abilities/functions/CharacterAbilityStats.js';
import { LUCY_MELEE_ATTACK_CONFIG } from '../../../config/abilities/characters/lucy/melee/AttackConfig.js';
import { setLastCharacter } from '../../../utils/StorageUtils.js';
import { createMortarArcPreview, updateMortarArcPreview, removeMortarArcPreview } from '../abilities/functions/mortar/MortarArcPreview.js';
import { checkSplashAreaCollision } from '../abilities/functions/mortar/SplashArea.js';
import { VibrationManager } from '../../../utils/VibrationManager.js';
import { getHealingVibrationInterval } from '../../../config/global/VibrationConfig.js';
import { getVibrationIntensity } from '../../../utils/StorageUtils.js';
import { getRespawnStats } from '../../../config/collision/CollisionStats.js';

export class GameLoop {
  /**
   * Create a new GameLoop
   * @param {Object} sceneManager - Scene manager instance
   * @param {Object} characterManager - Character manager instance
   * @param {Object} inputManager - Input manager instance
   * @param {Object} collisionManager - Collision manager instance
   * @param {Object} gameModeManager - Game mode manager instance
   * @param {Object} entityManager - Entity manager instance
   * @param {Object} projectileManager - Projectile manager instance (optional)
   * @param {Object} botManager - Bot manager instance (optional)
   * @param {Object} healthBarManager - Health bar manager instance (optional)
   * @param {Object} multiplayerManager - Multiplayer manager instance (optional)
   * @param {Object} remotePlayerManager - Remote player manager instance (optional)
   * @param {Object} learningManager - Bot learning manager instance (optional)
   */
  constructor(sceneManager, characterManager, inputManager, collisionManager, gameModeManager, entityManager, projectileManager = null, botManager = null, healthBarManager = null, multiplayerManager = null, remotePlayerManager = null, learningManager = null) {
    this.sceneManager = sceneManager;
    this.characterManager = characterManager;
    this.inputManager = inputManager;
    this.collisionManager = collisionManager;
    this.gameModeManager = gameModeManager;
    this.entityManager = entityManager;
    this.projectileManager = projectileManager;
    this.botManager = botManager;
    this.healthBarManager = healthBarManager;
    this.multiplayerManager = multiplayerManager;
    this.remotePlayerManager = remotePlayerManager;
    this.learningManager = learningManager;
    
    // Set up bot death callback to track kills
    if (this.botManager) {
      this.botManager.setOnBotDeathCallback((killerId) => {
        // Increment kills for local player
        if (killerId === 'local' && this.gameModeManager && this.gameModeManager.modeState) {
          this.gameModeManager.modeState.kills++;
        }
        // Increment kills for bots
        else if (killerId !== 'local') {
          const bots = this.botManager.getAllBots();
          const killerBot = bots.find(bot => bot.userData.id === killerId);
          if (killerBot) {
            killerBot.userData.kills = (killerBot.userData.kills || 0) + 1;
          }
        }
      });
    }
    
    this.lastTime = performance.now();
    this.isRunning = false;
    this.lastShootInput = false;
    this.lastMortarInput = false;
    this.lastCharacterSwapInput = false;
    this.lastSwordSwingInput = false;
    this.lastSpeedBoostInput = false;
    this.lastHealInput = false;
    
    // Healing hold duration tracking
    this.healHoldDuration = 0; // Time in seconds that heal button has been held
    
    // Sword swing animation tracking
    this.swordSwingAnimationTime = 0;
    this.swordSwingAnimationDuration = 0.5; // Default duration (will be updated per character)
    this.lastCharacterPositionForParticles = null; // Track character position for particles that follow
    this.swordSwingCircle = null; // Reference to the sword swing circle visual effect
    
    // Blast animation tracking (Herald)
    this.blastAnimationTime = 0;
    this.blastAnimationDuration = 0.8; // Default duration
    this.blastCircle = null; // Reference to the blast circle visual effect
    
    // Multi-projectile animation tracking (Lucy)
    this.multiProjectileAnimationTime = 0;
    this.multiProjectileAnimationDuration = 0.6; // Default duration
    this.multiProjectileCircle = null; // Reference to the multi-projectile circle visual effect
    this.meleeDamageTickTimer = 0; // Timer for damage over time ticks
    this.meleeAffectedEntities = new Set(); // Track entities in range for damage over time
    this.meleeDamagePerTick = null; // Damage per tick (set during attack)
    this.meleeTickInterval = null; // Tick interval (set during attack)
    this.meleeRange = null; // Attack range (set during attack)
    this.meleeCooldownTimer = 0; // Cooldown timer for melee attacks
    this.specialAbilityCooldownTimer = 0; // Cooldown timer for special abilities (Herald blast, Lucy multi-projectile)
    this.meleePoisonDamage = null; // Poison damage per tick (set during attack)
    this.meleePoisonTickInterval = null; // Poison tick interval (set during attack)
    this.meleePoisonDuration = null; // Poison duration (set during attack)
    this.meleeInitialDamage = null; // Initial damage on first hit (set during attack)
    this.meleeSlowSpeedMultiplier = null; // Speed multiplier when poisoned (set during attack)
    this.poisonedEntities = new Map(); // Track poisoned entities: Map<entity, {timeLeft, tickTimer, damage, tickInterval, speedMultiplier}>
    this.heraldRollKnockCooldowns = new Map(); // Track last knockback time per entity during Herald roll
    this.pushedByTracker = new Map(); // Track who pushed each entity: Map<entityId, {pusherId, timestamp}>
    
    // Callback to update character UI when character changes via controller
    this.characterUIUpdateCallback = null;
    
    // Mortar arc preview visualization
    this.mortarArcPreview = null; // Reference to arc preview line
    this._lastArcPreviewUpdate = 0; // Timestamp of last arc preview update
    this._arcPreviewUpdateInterval = 16; // Update every ~16ms (60fps max)
    
    // Mortar hold state tracking
    this.mortarHoldActive = false; // True when in mortar hold mode (toggled with RB)
    this.mortarHoldVisual = null; // Visual effect for holding mortar spell
    this.lastMortarHoldInput = false; // Track RB press for toggle detection
    this.lastLeftTriggerInput = false; // Track LT press/release
    this.lastRightTriggerInput = false; // Track RT press/release
    this.mortarReleaseCooldown = 0; // Cooldown timer after releasing mortar (prevents immediate bolt)
    this.healingActive = false; // Track if healing is currently active
    
    // Visual effects managers
    this.screenShakeManager = null;
    this.damageNumberManager = null;
    this.screenFlashManager = null;
    this.sceneManagerForShake = null;
    
    // Vibration manager for gamepad haptic feedback
    this.vibrationManager = new VibrationManager(inputManager);
    
    // Initialize vibration intensity from storage
    try {
      const vibrationIntensity = getVibrationIntensity();
      this.vibrationManager.setIntensity(vibrationIntensity);
    } catch (error) {
      // Use default intensity if storage read fails
      this.vibrationManager.setIntensity(1.0);
    }
    
    // Track previous grounded state for landing detection
    this._wasGrounded = true;
    
    // Healing vibration throttle (to prevent too much vibration during continuous healing)
    this._lastHealVibrationTime = 0;
    this._healVibrationInterval = getHealingVibrationInterval(); // Vibrate interval from config
    this._lastHealNumberTime = 0; // Throttle healing number display
    this._accumulatedHealAmount = 0; // Accumulate heal amount for display
    
    // Track previous splash area count for distance-based mortar explosion vibration
    this._previousSplashAreaCount = 0;
    
    // Cached objects for performance optimization (reuse instead of creating new ones)
    this._cachedRaycaster = new THREE.Raycaster();
    this._cachedMouse = new THREE.Vector2();
    this._cachedPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._cachedIntersect = new THREE.Vector3();
    this._cachedCameraDir = new THREE.Vector3();
    this._cachedCameraForward = new THREE.Vector3();
    this._cachedCameraRight = new THREE.Vector3();
    this._cachedUpVector = new THREE.Vector3(0, 1, 0);
  }
  
  /**
   * Set screen shake manager
   * @param {Object} screenShakeManager - Screen shake manager instance
   */
  setScreenShakeManager(screenShakeManager) {
    this.screenShakeManager = screenShakeManager;
  }
  
  /**
   * Set damage number manager
   * @param {Object} damageNumberManager - Damage number manager instance
   */
  setDamageNumberManager(damageNumberManager) {
    this.damageNumberManager = damageNumberManager;
  }
  
  /**
   * Set screen flash manager
   * @param {Object} screenFlashManager - Screen flash manager instance
   */
  setScreenFlashManager(screenFlashManager) {
    this.screenFlashManager = screenFlashManager;
  }

  /**
   * Set kill streak manager
   * @param {Object} killStreakManager - Kill streak manager instance
   */
  setKillStreakManager(killStreakManager) {
    this.killStreakManager = killStreakManager;
  }
  
  /**
   * Set scene manager for shake effects
   * @param {Object} sceneManager - Scene manager instance
   */
  setSceneManagerForShake(sceneManager) {
    this.sceneManagerForShake = sceneManager;
  }

  /**
   * Start the game loop
   */
  start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.tick();
  }

  /**
   * Stop the game loop
   */
  stop() {
    this.isRunning = false;
    
    // Clean up arc preview when stopping
    if (this.mortarArcPreview) {
      removeMortarArcPreview(this.mortarArcPreview, this.sceneManager.getScene());
      this.mortarArcPreview = null;
    }
    
    // Clean up mortar hold visual when stopping
      if (this.mortarHoldVisual) {
        this._removeMortarHoldVisual();
      }
  }

  /**
   * Reset all cooldowns (melee and mortar release cooldown)
   * Called on death/respawn to ensure all abilities are ready
   */
  resetCooldowns() {
    this.meleeCooldownTimer = 0;
    this.mortarReleaseCooldown = 0;
    
    // Sync melee cooldown reset to ProjectileManager
    if (this.projectileManager) {
      const playerId = 'local';
      this.projectileManager.setMeleeCooldown(playerId, 0);
    }
  }

  /**
   * Main game loop tick
   */
  tick() {
    if (!this.isRunning) return;
    
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Clamp dt to prevent invalid values and large spikes
    // Clamp between 0.0001 and 0.033 (1/30 second max)
    if (typeof dt !== 'number' || isNaN(dt) || !isFinite(dt) || dt <= 0) {
      dt = 0.016; // Default to ~60fps
    } else {
      dt = Math.min(Math.max(dt, 0.0001), 0.033);
    }

    this.update(dt);
    this.sceneManager.render();
    
    requestAnimationFrame(() => this.tick());
  }

  /**
   * Update game state
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    // Check if game mode is paused
    const isPaused = this.gameModeManager && this.gameModeManager.modeState && this.gameModeManager.modeState.isPaused;
    
    if (isPaused) {
      // Still render but don't update game logic
      this.sceneManager.render();
      return;
    }
    
    const player = this.characterManager.getPlayer();
    
    // Update sound manager listener position for distance-based volume
    if (player && this.characterManager.getSoundManager()) {
      const listenerPosition = {
        x: player.position.x,
        y: player.position.y,
        z: player.position.z
      };
      this.characterManager.getSoundManager().setListenerPosition(listenerPosition);
    }
    
    // Update gamepad input state (polling each frame)
    this.inputManager.updateGamepad(dt);
    
    const input = this.inputManager.getInputVector();
    const mode = this.gameModeManager ? this.gameModeManager.getMode() : 'free-play';
    const requiresStart = mode === 'time-trial' || mode === 'survival';
    const isModeStarted = !requiresStart || !this.gameModeManager || !this.gameModeManager.modeState || this.gameModeManager.modeState.isStarted;
    
    // Auto-start game mode when movement is detected (for time-trial and survival modes)
    if (requiresStart && !isModeStarted && this.inputManager.hasMovement()) {
      if (this.gameModeManager) {
        this.gameModeManager.startMode();
      }
    }
    
    const canMove = !requiresStart || isModeStarted;
    
    // Check entity collisions
    if (this.entityManager) {
      const collision = this.entityManager.checkPlayerCollision(
        player.position,
        this.characterManager.getPlayerSize()
      );
      
      if (this.gameModeManager) {
        this.gameModeManager.handleEntityCollision(collision);
      }
      
      // Update entity animations
      this.entityManager.updateAnims(dt, canMove);
    }
    
    // Update game mode
    if (this.gameModeManager) {
      this.gameModeManager.update(dt, this.entityManager);
    }
    
    // Update learning system periodically
    if (this.learningManager && mode === 'shooting') {
      this.learningManager.updateLearning();
    }
    
    const heraldAbilitiesBlocked = this._isHeraldSprinting();
    this.inputManager.setAbilityInputsBlocked(heraldAbilitiesBlocked);
    if (heraldAbilitiesBlocked) {
      if (this.mortarHoldActive) {
        this._cancelMortarHold();
      }
      if (this.healingActive) {
        this.healingActive = false;
        this.inputManager.setHealingActive(false);
      }
      this.healHoldDuration = 0;
      this.lastShootInput = false;
      this.lastSpeedBoostInput = false;
      this.lastMortarInput = false;
    }
    
    // Handle abilities (bolt, mortar, speed boost) in all game modes
    if (this.projectileManager) {
      // Set up cursor tracking for projectiles (update player position each frame)
      if (player) {
        const playerPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
        this.projectileManager.setCursorTracking(
          this.sceneManager.getCamera(),
          this.inputManager,
          playerPos
        );
      }
      this._handleShootingMode(dt, player, mode);
    } else {
      // Clean up arc preview when projectile manager is not available
      if (this.mortarArcPreview) {
        removeMortarArcPreview(this.mortarArcPreview, this.sceneManager.getScene());
        this.mortarArcPreview = null;
      }
      // Clean up mortar hold visual when projectile manager is not available
      if (this.mortarHoldVisual) {
        this._removeMortarHoldVisual();
      }
      // Reset mortar hold state
      if (this.mortarHoldActive) {
        this.mortarHoldActive = false;
        this.inputManager.setMortarHoldActive(false);
      }
    }
    
    // Handle jump input - check double jump first, then regular jump
    if (canMove && this.inputManager.isJumpPressed()) {
      // If double jump is detected, try double jump first
      if (this.inputManager.isDoubleJumpDetected()) {
        this.characterManager.doubleJump();
        // Vibration for double jump
        if (this.vibrationManager) {
          this.vibrationManager.doubleJump();
        }
      } else {
        // Otherwise do regular jump
        this.characterManager.jump();
        // Vibration for jump
        if (this.vibrationManager) {
          this.vibrationManager.jump();
        }
      }
    }
    
    // Update jump physics
    const isFlying = this.inputManager.isFlyPressed();
    this.characterManager.updateJumpPhysics(dt, this.collisionManager, isFlying);
    
    // Detect landing and add vibration
    const isGrounded = this.characterManager.characterData && this.characterManager.characterData.isGrounded;
    if (isGrounded && !this._wasGrounded && this.vibrationManager) {
      // Just landed - add vibration
      this.vibrationManager.land();
    }
    this._wasGrounded = isGrounded || false;
    
    // Handle character swap (Y button)
    const characterSwapInput = this.inputManager.isCharacterSwapPressed();
    if (characterSwapInput && !this.lastCharacterSwapInput) {
      this._handleCharacterSwap();
    }
    this.lastCharacterSwapInput = characterSwapInput;
    // Handle sword swing (B button) - now used for special abilities
    const swordSwingInput = this.inputManager.isSwordSwingPressed();
    if (!heraldAbilitiesBlocked && swordSwingInput && !this.lastSwordSwingInput) {
      const characterName = this.characterManager.getCharacterName();
      if (characterName === 'herald') {
        // Check special ability cooldown for Herald's blast
        if (this.specialAbilityCooldownTimer <= 0) {
          this._handleHeraldBlast(player);
        }
      } else if (characterName === 'lucy') {
        // Lucy's melee attack fires projectiles in 360-degree pattern
        // Use melee cooldown instead of special ability cooldown
        if (this.meleeCooldownTimer <= 0) {
          this._handleSwordSwing(player);
        }
      } else {
        // Fallback to melee for other characters
        if (this.meleeCooldownTimer <= 0) {
          this._handleSwordSwing(player);
        }
      }
    }
    this.lastSwordSwingInput = swordSwingInput;
    
    // Update special ability cooldown timer
    if (this.specialAbilityCooldownTimer > 0) {
      this.specialAbilityCooldownTimer -= dt;
      if (this.specialAbilityCooldownTimer < 0) {
        this.specialAbilityCooldownTimer = 0;
      }
    }
    
    // Update melee cooldown timer
    if (this.meleeCooldownTimer > 0) {
      this.meleeCooldownTimer -= dt;
      if (this.meleeCooldownTimer < 0) {
        this.meleeCooldownTimer = 0;
      }
    }
    
    // Sync melee cooldown to ProjectileManager for UI display
    if (this.projectileManager) {
      const playerId = 'local';
      this.projectileManager.setMeleeCooldown(playerId, this.meleeCooldownTimer);
      // Sync special ability cooldown for UI display
      this.projectileManager.setSpecialAbilityCooldown(playerId, this.specialAbilityCooldownTimer);
    }
    
    // Handle heal/reload (X button)
    const healInput = heraldAbilitiesBlocked ? false : this.inputManager.isHealPressed();

    // Track heal button press/release to reset hold duration
    if (healInput && !this.lastHealInput) {
      // Just pressed - reset hold duration
      this.healHoldDuration = 0;
    } else if (!healInput && this.lastHealInput) {
      // Just released - reset hold duration
      this.healHoldDuration = 0;
    }

    // Track if healing is actually active (not just button pressed)
    let isHealingActive = false;
    

    // In shooting mode, X button is for reload (tap) or heal (hold)
    if (mode === 'shooting' && this.projectileManager) {
      // Define threshold for tap vs hold (in seconds)
      const tapThreshold = 0.3; // 300ms

      if (healInput) {
        // Increase hold duration while held
        this.healHoldDuration += dt;

        // If held longer than threshold, start healing
        if (this.healHoldDuration >= tapThreshold) {
          isHealingActive = true;
          this._handleHeal(player, dt);
        }
      } else if (this.lastHealInput) {
        // Button just released
        // If it was held for less than threshold, trigger reload
        if (this.healHoldDuration < tapThreshold) {
          const characterName = this.characterManager.getCharacterName();
          const playerId = 'local';
          this.projectileManager.manualReload(playerId, characterName);
        }
      }
    } else {
      // In other modes, X button is for heal (hold to heal)
      if (healInput) {
        // Increase hold duration while held
        this.healHoldDuration += dt;
        isHealingActive = true;
        this._handleHeal(player, dt);
      }
    }

    // Update healing active state
    this.healingActive = isHealingActive;
    
    // Update healing active state in InputManager to prevent sprinting while healing
    this.inputManager.setHealingActive(isHealingActive);

    this.lastHealInput = healInput;
    
    // Check for respawn system
    const shouldRespawn = this.collisionManager.updateRespawnSystem(
      player.position.x, 
      player.position.z, 
      player.position.y, 
      this.characterManager.getPlayerSize(), 
      dt
    );
    
    if (shouldRespawn) {
      // Check if player was pushed out by someone (blast or roll ability)
      this._handleArenaFalloutKill('local');
      
      // Reset overlay immediately before respawning
      this.collisionManager.resetRespawn();
      const currentMode = this.gameModeManager ? this.gameModeManager.getMode() : null;
      
      // Reset all cooldowns on respawn
      this.resetCooldowns();
      if (this.projectileManager) {
        const characterName = this.characterManager.getCharacterName();
        this.projectileManager.resetAllCooldowns('local', characterName);
      }
      
      this.characterManager.respawn(currentMode, this.collisionManager);
      
      // Clear push tracking for local player
      this.pushedByTracker.delete('local');
      
      // Vibration for respawn
      if (this.vibrationManager) {
        this.vibrationManager.respawn();
      }
    }
    
    // Handle movement
    this._handleMovement(dt, player, input, canMove);
    
    // Update character animation
    // isRunning() already checks mortarHoldActive internally
    const isRunningForAnimation = this.inputManager.isRunning();
    this.characterManager.updateAnimation(dt, isRunningForAnimation);
    
    // Update death fade effect
    const fadeComplete = this.characterManager.updateDeathFade(dt);
    
    // Handle respawn if death fade is complete
    if (fadeComplete) {
      // Death fade complete - respawn
      if (this.gameModeManager && this.gameModeManager.modeState) {
        this.gameModeManager.modeState.deaths++;
      }
      const currentMode = this.gameModeManager ? this.gameModeManager.getMode() : null;
      
      // Play respawn sound
      const soundManager = this.characterManager.getSoundManager();
      if (soundManager) {
        soundManager.playRespawn();
      }
      
      // Reset all cooldowns on respawn
      this.resetCooldowns();
      if (this.projectileManager) {
        const characterName = this.characterManager.getCharacterName();
        this.projectileManager.resetAllCooldowns('local', characterName);
      }
      
      this.characterManager.respawn(currentMode, this.collisionManager);
      
      // Clear push tracking for local player
      this.pushedByTracker.delete('local');
      
      // Update userData after respawn
      const player = this.characterManager.getPlayer();
      if (player && player.userData) {
        const currentHealth = this.characterManager.getHealth();
        const maxHealth = this.characterManager.getMaxHealth();
        player.userData.health = currentHealth;
        player.userData.maxHealth = maxHealth;
        
        // Immediately send damage event with full health to sync respawn
        if (this.multiplayerManager && this.multiplayerManager.isInRoom()) {
          this.multiplayerManager.sendPlayerDamage({
            damage: 0, // No damage, just health update
            health: currentHealth,
            maxHealth: maxHealth
          });
        }
      }
    }
    
    // Update smoke particles
    if (this.characterManager.particleManager) {
      this.characterManager.particleManager.update(dt);
      // Billboard smoke particles to camera
      this.characterManager.particleManager.billboardToCamera(
        this.sceneManager.getCamera()
      );
      
      // Update particles that follow character (sword swing and smoke particles)
      if (player) {
        const currentPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
        if (this.lastCharacterPositionForParticles) {
          this.characterManager.particleManager.updateFollowingParticles(
            currentPos,
            this.lastCharacterPositionForParticles
          );
        }
        this.lastCharacterPositionForParticles = currentPos.clone();
      } else {
        this.lastCharacterPositionForParticles = null;
      }
    }

    // Update sword swing animation timer and circle position
    if (this.swordSwingAnimationTime > 0 && player) {
      this.swordSwingAnimationTime -= dt;
      
      // Update circle position to follow character
      if (this.swordSwingCircle) {
        this.swordSwingCircle.position.set(
          player.position.x,
          player.position.y + 0.2,
          player.position.z
        );
      }
      
      // Apply damage over time during animation
      if (this.meleeDamagePerTick && this.meleeTickInterval && this.meleeRange) {
        this.meleeDamageTickTimer += dt;
        
        // Check if it's time for a damage tick
        if (this.meleeDamageTickTimer >= this.meleeTickInterval) {
          this.meleeDamageTickTimer = 0; // Reset timer
          
          const playerPos = player.position;
          const radius = this.meleeRange;
          const radiusSq = radius * radius; // Pre-calculate squared radius for distance comparison
          const damagePerTick = this.meleeDamagePerTick;
          
          // Damage bots in range - optimized with distance squared comparison
          if (this.botManager) {
            const bots = this.botManager.getAllBots();
            for (let i = 0; i < bots.length; i++) {
              const bot = bots[i];
              const dx = bot.position.x - playerPos.x;
              const dz = bot.position.z - playerPos.z;
              const distanceSq = dx * dx + dz * dz; // Use squared distance to avoid sqrt
              
              if (distanceSq <= radiusSq) {
                // Only check line of sight if not already tracked (optimization)
                // If already in affected entities, skip expensive line of sight check
                if (!this.meleeAffectedEntities.has(bot)) {
                  const sightCheck = this._hasLineOfSight(
                    playerPos, 
                    bot.position, 
                    radius, 
                    0.3
                  );
                  
                  if (!sightCheck.clear) {
                    continue; // Skip this bot - wall is blocking
                  }
                  
                  // Track this bot as affected
                  this.meleeAffectedEntities.add(bot);
                }
                
                // Apply damage per tick
                const wasAlive = bot.userData.health > 0;
                const botDied = this.botManager.damageBot(bot, damagePerTick, 'local');
                
                // Trigger kill feedback immediately when bot dies (local player kill)
                if (botDied && wasAlive && this.killStreakManager) {
                  const currentTime = performance.now() / 1000; // Convert to seconds
                  this.killStreakManager.registerKill(currentTime);
                }
                
                // Show damage number for melee damage over time
                if (this.damageNumberManager) {
                  this.damageNumberManager.showDamage(damagePerTick, bot.position, 0xff8800);
                }
                
                if (botDied) {
                  this.meleeAffectedEntities.delete(bot);
                  // Don't respawn immediately - death fade will handle it
                }
              } else {
                // Remove from tracking if out of range
                this.meleeAffectedEntities.delete(bot);
              }
            }
          }
          
          // Damage remote players in multiplayer mode - optimized
          if (this.remotePlayerManager && this.multiplayerManager && this.multiplayerManager.isInRoom()) {
            const remotePlayers = this.remotePlayerManager.getRemotePlayers();
            for (const [playerId, remotePlayer] of remotePlayers) {
              const mesh = remotePlayer.mesh;
              if (!mesh) continue;
              
              const dx = mesh.position.x - playerPos.x;
              const dz = mesh.position.z - playerPos.z;
              const distanceSq = dx * dx + dz * dz; // Use squared distance to avoid sqrt
              const entityKey = `remote_${playerId}`;
              
              if (distanceSq <= radiusSq) {
                // Only check line of sight if not already tracked (optimization)
                if (!this.meleeAffectedEntities.has(entityKey)) {
                  const sightCheck = this._hasLineOfSight(
                    playerPos,
                    mesh.position,
                    radius,
                    0.3
                  );
                  
                  if (!sightCheck.clear) {
                    continue; // Skip this remote player - wall is blocking
                  }
                  
                  // Track this remote player as affected
                  this.meleeAffectedEntities.add(entityKey);
                }
                
                // Apply damage per tick to remote player (server will sync)
                // Initialize health if not set (fallback to default values)
                if (!mesh.userData) {
                  mesh.userData = {};
                }
                if (mesh.userData.health === undefined) {
                  mesh.userData.health = 100; // Default health
                }
                if (mesh.userData.maxHealth === undefined) {
                  mesh.userData.maxHealth = 100; // Default max health
                }
                
                // Apply damage
                mesh.userData.health = Math.max(0, mesh.userData.health - damagePerTick);
                
                // Show damage number for melee damage over time on remote player
                if (this.damageNumberManager) {
                  this.damageNumberManager.showDamage(damagePerTick, mesh.position, 0xff8800);
                }
                
                // Send updated health to server for sync
                this.multiplayerManager.sendPlayerDamage({
                  damage: damagePerTick,
                  health: mesh.userData.health,
                  maxHealth: mesh.userData.maxHealth
                });
              } else {
                // Remove from tracking if out of range
                this.meleeAffectedEntities.delete(entityKey);
              }
            }
          }
        }
      }
      
      // Clean up when animation ends
      if (this.swordSwingAnimationTime <= 0) {
        this.swordSwingAnimationTime = 0;
        this.meleeDamageTickTimer = 0;
        
        // Apply poison to all entities that were affected during the attack
        if (this.meleePoisonDamage !== null && this.meleePoisonDamage > 0 && 
            this.meleePoisonDuration !== null && this.meleePoisonDuration > 0 && 
            this.meleePoisonTickInterval !== null && this.meleePoisonTickInterval > 0) {
          const poisonDamage = this.meleePoisonDamage;
          const poisonDuration = this.meleePoisonDuration;
          const poisonTickInterval = this.meleePoisonTickInterval;
          const slowSpeedMultiplier = this.meleeSlowSpeedMultiplier !== null ? this.meleeSlowSpeedMultiplier : 0.6;
          
          // Apply poison to bots that were affected
          if (this.botManager) {
            this.meleeAffectedEntities.forEach(entity => {
              if (entity && typeof entity === 'object' && entity.position) {
                // It's a bot entity
                this.poisonedEntities.set(entity, {
                  timeLeft: poisonDuration,
                  tickTimer: 0,
                  damage: poisonDamage,
                  tickInterval: poisonTickInterval,
                  speedMultiplier: slowSpeedMultiplier,
                  type: 'bot'
                });
                // Store speed multiplier in bot's userData for BotAI to use
                if (entity.userData) {
                  entity.userData.poisonSpeedMultiplier = slowSpeedMultiplier;
                }
              }
            });
          }
          
          // Apply poison to remote players that were affected
          if (this.remotePlayerManager && this.multiplayerManager && this.multiplayerManager.isInRoom()) {
            const remotePlayers = this.remotePlayerManager.getRemotePlayers();
            for (const [playerId, remotePlayer] of remotePlayers) {
              const key = `remote_${playerId}`;
              if (this.meleeAffectedEntities.has(key)) {
                const mesh = remotePlayer.mesh;
                if (mesh) {
                  this.poisonedEntities.set(mesh, {
                    timeLeft: poisonDuration,
                    tickTimer: 0,
                    damage: poisonDamage,
                    tickInterval: poisonTickInterval,
                    speedMultiplier: slowSpeedMultiplier,
                    type: 'remote',
                    playerId: playerId
                  });
                  // Store speed multiplier in remote player's userData (for tracking/visual effects)
                  if (mesh.userData) {
                    mesh.userData.poisonSpeedMultiplier = slowSpeedMultiplier;
                  }
                }
              }
            }
          }
        }
        
        this.meleeAffectedEntities.clear();
        this.meleeDamagePerTick = null;
        this.meleeTickInterval = null;
        this.meleeRange = null;
        this.meleePoisonDamage = null;
        this.meleePoisonTickInterval = null;
        this.meleePoisonDuration = null;
        this.meleeInitialDamage = null;
        this.meleeSlowSpeedMultiplier = null;
        
        // Remove and dispose of circle
        if (this.swordSwingCircle) {
          this.sceneManager.getScene().remove(this.swordSwingCircle);
          this.swordSwingCircle.geometry.dispose();
          this.swordSwingCircle.material.dispose();
          this.swordSwingCircle = null;
        }
      }
    }

    // Update blast animation timer and circle position
    if (this.blastAnimationTime > 0 && player) {
      this.blastAnimationTime -= dt;
      
      // Update circle position to follow character
      if (this.blastCircle) {
        this.blastCircle.position.set(
          player.position.x,
          player.position.y + 0.2,
          player.position.z
        );
        
        // Animate circle expanding and fading
        const progress = 1 - (this.blastAnimationTime / this.blastAnimationDuration);
        if (this.blastCircle.material) {
          this.blastCircle.material.opacity = 0.9 * (1 - progress);
        }
      }
      
      // Clean up when animation ends
      if (this.blastAnimationTime <= 0) {
        this.blastAnimationTime = 0;
        
        // Remove and dispose of circle
        if (this.blastCircle) {
          this.sceneManager.getScene().remove(this.blastCircle);
          this.blastCircle.geometry.dispose();
          this.blastCircle.material.dispose();
          this.blastCircle = null;
        }
      }
    }

    // Update multi-projectile animation timer and circle position
    if (this.multiProjectileAnimationTime > 0 && player) {
      this.multiProjectileAnimationTime -= dt;
      
      // Update circle position to follow character
      if (this.multiProjectileCircle) {
        this.multiProjectileCircle.position.set(
          player.position.x,
          player.position.y + 0.2,
          player.position.z
        );
        
        // Animate circle fading
        const progress = 1 - (this.multiProjectileAnimationTime / this.multiProjectileAnimationDuration);
        if (this.multiProjectileCircle.material) {
          this.multiProjectileCircle.material.opacity = 0.8 * (1 - progress);
        }
      }
      
      // Clean up when animation ends
      if (this.multiProjectileAnimationTime <= 0) {
        this.multiProjectileAnimationTime = 0;
        
        // Remove and dispose of circle
        if (this.multiProjectileCircle) {
          this.sceneManager.getScene().remove(this.multiProjectileCircle);
          this.multiProjectileCircle.geometry.dispose();
          this.multiProjectileCircle.material.dispose();
          this.multiProjectileCircle = null;
        }
      }
    }
    
    // Update poison damage over time (continues after animation ends)
    if (this.poisonedEntities.size > 0) {
      const entitiesToRemove = [];
      
      for (const [entity, poisonData] of this.poisonedEntities.entries()) {
        // Update poison timer
        poisonData.timeLeft -= dt;
        poisonData.tickTimer += dt;
        
        // Apply poison damage at intervals
        if (poisonData.tickTimer >= poisonData.tickInterval) {
          poisonData.tickTimer = 0;
          
          if (poisonData.type === 'bot' && this.botManager) {
            // Update speed multiplier in bot's userData (in case it changed)
            if (entity.userData && poisonData.speedMultiplier !== undefined) {
              entity.userData.poisonSpeedMultiplier = poisonData.speedMultiplier;
            }
            const botDied = this.botManager.damageBot(entity, poisonData.damage, 'local');
            
            // Show poison damage number (purple color for poison)
            if (this.damageNumberManager) {
              this.damageNumberManager.showDamage(poisonData.damage, entity.position, 0xaa00ff);
            }
            
            if (botDied) {
              entitiesToRemove.push(entity);
              // Don't respawn immediately - death fade will handle it
            }
          } else if (poisonData.type === 'player') {
            // Apply poison damage to local player
            const isDead = this.characterManager.takeDamage(poisonData.damage);
            const currentHealth = this.characterManager.getHealth();
            const maxHealth = this.characterManager.getMaxHealth();
            
            // Update player userData for health bar
            if (entity && entity.userData) {
              entity.userData.health = currentHealth;
              entity.userData.maxHealth = maxHealth;
            }
            
            // Show poison damage number (purple color for poison)
            if (this.damageNumberManager && entity) {
              this.damageNumberManager.showDamage(poisonData.damage, entity.position, 0xaa00ff);
            }
            
            // Send damage event to other players via multiplayer
            if (this.multiplayerManager && this.multiplayerManager.isInRoom()) {
              this.multiplayerManager.sendPlayerDamage({
                damage: poisonData.damage,
                health: currentHealth,
                maxHealth: maxHealth
              });
            }
            
            if (isDead) {
              entitiesToRemove.push(entity);
            }
          } else if (poisonData.type === 'remote' && this.remotePlayerManager && this.multiplayerManager) {
            const mesh = entity;
            // Initialize userData if not set
            if (!mesh.userData) {
              mesh.userData = {};
            }
            // Update speed multiplier in remote player's userData (in case it changed)
            if (poisonData.speedMultiplier !== undefined) {
              mesh.userData.poisonSpeedMultiplier = poisonData.speedMultiplier;
            }
            // Initialize health if not set (fallback to default values)
            if (mesh.userData.health === undefined) {
              mesh.userData.health = 100; // Default health
            }
            if (mesh.userData.maxHealth === undefined) {
              mesh.userData.maxHealth = 100; // Default max health
            }
            
            // Apply poison damage
            mesh.userData.health = Math.max(0, mesh.userData.health - poisonData.damage);
            
            // Show poison damage number (purple color for poison)
            if (this.damageNumberManager) {
              this.damageNumberManager.showDamage(poisonData.damage, mesh.position, 0xaa00ff);
            }
            
            // Send updated health to server for sync
            this.multiplayerManager.sendPlayerDamage({
              damage: poisonData.damage,
              health: mesh.userData.health,
              maxHealth: mesh.userData.maxHealth
            });
            
            // Remove if dead
            if (mesh.userData.health <= 0) {
              entitiesToRemove.push(entity);
            }
          }
        }
        
        // Remove poison if duration expired
        if (poisonData.timeLeft <= 0) {
          entitiesToRemove.push(entity);
        }
      }
      
      // Remove expired or dead entities
      entitiesToRemove.forEach(entity => {
        this.poisonedEntities.delete(entity);
        // Clear speed multiplier from bot/remote player userData when poison expires
        if (entity && typeof entity === 'object' && entity.userData && entity.userData.poisonSpeedMultiplier !== undefined) {
          entity.userData.poisonSpeedMultiplier = undefined;
        }
      });
    }

    // Update magical particle animations
    this.sceneManager.updateParticles(dt);
    
    // Update blinking eyes animation
    this.sceneManager.updateBlinkingEyes(dt);

    // Camera follows player
    // isRunning() already checks mortarHoldActive internally
    const isRunningForCamera = this.inputManager.isRunning();
    this.sceneManager.updateCamera(player.position, isRunningForCamera);
  }

  /**
   * Handle ability updates (bolt, mortar, speed boost) - works in all game modes
   * @param {number} dt - Delta time
   * @param {THREE.Mesh} player - Player mesh
   * @param {string} mode - Current game mode
   * @private
   */
  _handleShootingMode(dt, player, mode = 'free-play') {
    // Track splash areas before update for distance-based vibration
    const previousSplashCount = this.projectileManager && this.projectileManager.splashAreas 
      ? this.projectileManager.splashAreas.length 
      : 0;
    
    // Update projectiles
    this.projectileManager.update(dt);
    
    // Check for new splash areas and trigger distance-based vibration
    if (this.projectileManager && this.projectileManager.splashAreas && this.vibrationManager && player) {
      const currentSplashCount = this.projectileManager.splashAreas.length;
      
      // If new splash areas were added, trigger vibration for each
      if (currentSplashCount > previousSplashCount) {
        const playerPos = player.position;
        
        // Check each new splash area
        for (let i = previousSplashCount; i < currentSplashCount; i++) {
          const splashArea = this.projectileManager.splashAreas[i];
          if (splashArea && splashArea.position) {
            // Use the actual THREE.Object3D position (more reliable than userData.position)
            const splashPos = splashArea.position;
            
            // Calculate horizontal distance from player to explosion (ignore Y axis)
            const dx = splashPos.x - playerPos.x;
            const dz = splashPos.z - playerPos.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            // Trigger distance-based vibration
            this.vibrationManager.mortarExplosionDistance(distance);
          }
        }
      }
    }
    
    // Update mortar release cooldown timer
    if (this.mortarReleaseCooldown > 0) {
      this.mortarReleaseCooldown -= dt;
      if (this.mortarReleaseCooldown < 0) {
        this.mortarReleaseCooldown = 0;
      }
    }
    
    const heraldAbilitiesBlocked = this._isHeraldSprinting();
    
    // Handle shooting input (left mouse click / RT) - auto-fire on hold
    // Don't allow shooting when mortar hold is active (RT is used for mortar release)
    // Also prevent shooting immediately after releasing mortar (cooldown period)
    if (!heraldAbilitiesBlocked) {
      if (!this.mortarHoldActive && this.mortarReleaseCooldown <= 0) {
        const shootInput = this.inputManager.isShootPressed();
        if (shootInput) {
          this._handleShootingInput(player);
        }
        this.lastShootInput = shootInput;
      } else {
        // Clear shoot input when in mortar hold mode or during cooldown
        this.lastShootInput = false;
      }
    } else {
      this.lastShootInput = false;
    }
    
    // Handle speed boost input (LB button) - Lucy only
    if (!heraldAbilitiesBlocked) {
      const speedBoostInput = this.inputManager.isSpeedBoostPressed();
      if (speedBoostInput && !this.lastSpeedBoostInput) {
        const characterName = this.characterManager.getCharacterName();
        const playerId = 'local';
        console.log('[SpeedBoost] Button pressed, activating for:', characterName);
        const activated = this.projectileManager.activateSpeedBoost(playerId, characterName);
        if (!activated) {
          console.log('[SpeedBoost] Activation failed');
        }
      }
      this.lastSpeedBoostInput = speedBoostInput;
    } else {
      this.lastSpeedBoostInput = false;
    }
    
    // Handle mortar hold system (RB hold, LT preview, RT release)
    if (!heraldAbilitiesBlocked) {
      this._handleMortarHoldSystem(player, dt);
    } else {
      this.lastMortarHoldInput = false;
      this.lastLeftTriggerInput = false;
      this.lastRightTriggerInput = false;
    }
    
    // Legacy mortar input (right mouse click) - only if not using gamepad hold system
    if (!heraldAbilitiesBlocked && !this.mortarHoldActive) {
      const mortarInput = this.inputManager.isMortarPressed();
      if (mortarInput && !this.lastMortarInput) {
        // Only handle mouse click if not holding RB
        if (!this.inputManager.isMortarHoldPressed()) {
          this._handleMortarInput(player);
        }
      }
      this.lastMortarInput = mortarInput;
    } else {
      this.lastMortarInput = false;
    }
    
    // Check projectile collisions
    this._handleProjectileCollisions(player);
    
    // Update bots (only in shooting mode)
    if (mode === 'shooting' && this.botManager) {
      // Check for bots falling out before updating
      const bots = this.botManager.getAllBots();
      const respawnStats = getRespawnStats();
      
      for (const bot of bots) {
        if (bot && bot.userData && bot.position.y < respawnStats.fallThreshold) {
          const botId = bot.userData.id || `bot_${bot.uuid}`;
          this._handleArenaFalloutKill(`bot_${botId}`);
        }
      }
      
      this.botManager.update(dt, player.position, this.sceneManager.getCamera());
    }
    
    // Clean up stale push tracking entries periodically
    this._cleanupPushTracking(10000);
    
    // Update health bars (only in shooting mode)
    if (mode === 'shooting' && this.healthBarManager) {
      this.healthBarManager.update(dt);
    }
    
    // Update visual effects
    if (this.screenShakeManager) {
      this.screenShakeManager.update(dt);
    }
    
    if (this.damageNumberManager) {
      this.damageNumberManager.update(dt);
    }
    
    if (this.screenFlashManager) {
      this.screenFlashManager.update(dt);
      
      // Update health-based red tint/saturation based on current health
      if (this.characterManager && player) {
        const currentHealth = this.characterManager.getHealth();
        const maxHealth = this.characterManager.getMaxHealth();
        this.screenFlashManager.updateHealth(currentHealth, maxHealth);
      }
    }
    
    if (this.killStreakManager) {
      const currentTime = performance.now() / 1000; // Convert to seconds
      this.killStreakManager.update(dt, currentTime);
    }
  }

  /**
   * Handle shooting input
   * @param {THREE.Mesh} player - Player mesh
   * @private
   */
  _handleShootingInput(player) {
    const playerPos = player.position;
    const characterName = this.characterManager.getCharacterName();
    const playerId = 'local';
    
    // Check if player can shoot (based on character-specific cooldown)
    if (!this.projectileManager.canShoot(playerId)) {
      return;
    }
    
    const inputMode = this.inputManager.getInputMode();
    const camera = this.sceneManager.getCamera();
    
    let directionX, directionZ, targetX, targetZ;
    
    // In keyboard mode, use mouse position for aiming
    if (inputMode === 'keyboard') {
      // Convert mouse position to world coordinates using cached raycaster
      const mousePos = this.inputManager.getMousePosition();
      this._cachedMouse.x = (mousePos.x / window.innerWidth) * 2 - 1;
      this._cachedMouse.y = -(mousePos.y / window.innerHeight) * 2 + 1;
      
      this._cachedRaycaster.setFromCamera(this._cachedMouse, camera);
      
      // Intersect with ground plane at y = 0 (reuse cached plane and intersect)
      this._cachedRaycaster.ray.intersectPlane(this._cachedPlane, this._cachedIntersect);
      
      // Calculate direction from player to mouse cursor position
      const toCursorX = this._cachedIntersect.x - playerPos.x;
      const toCursorZ = this._cachedIntersect.z - playerPos.z;
      const toCursorLength = Math.sqrt(toCursorX * toCursorX + toCursorZ * toCursorZ);
      
      if (toCursorLength > 0.01) {
        // Normalize direction
        directionX = toCursorX / toCursorLength;
        directionZ = toCursorZ / toCursorLength;
        
        // Set target for cursor following
        targetX = this._cachedIntersect.x;
        targetZ = this._cachedIntersect.z;
      } else {
        // Fallback to character facing direction if cursor is too close (reuse cached vectors)
        const lastFacing = this.characterManager.getLastFacing();
        camera.getWorldDirection(this._cachedCameraDir);
        this._cachedCameraForward.set(this._cachedCameraDir.x, 0, this._cachedCameraDir.z).normalize();
        
        if (lastFacing === 'back') {
          directionX = this._cachedCameraForward.x;
          directionZ = this._cachedCameraForward.z;
        } else {
          directionX = -this._cachedCameraForward.x;
          directionZ = -this._cachedCameraForward.z;
        }
        
        targetX = null;
        targetZ = null;
      }
    } else {
      // In controller mode, use right joystick for aiming
      const rightJoystickDir = this.inputManager.getRightJoystickDirection();
      const isRightJoystickPushed = this.inputManager.isRightJoystickPushed();
      
      // Prioritize right joystick for aiming only when actively pushed (smooth 360-degree aiming in world space)
      if (isRightJoystickPushed && (rightJoystickDir.x !== 0 || rightJoystickDir.z !== 0)) {
        // Use camera-relative direction: convert joystick input to world space using camera orientation
        // This matches how mouse aiming works and accounts for camera angle (reuse cached vectors)
        camera.getWorldDirection(this._cachedCameraDir);
        
        // Create a right vector perpendicular to camera direction (in XZ plane)
        this._cachedCameraRight.crossVectors(this._cachedCameraDir, this._cachedUpVector).normalize();
        
        // Create a forward vector in XZ plane (project camera direction onto ground)
        this._cachedCameraForward.set(this._cachedCameraDir.x, 0, this._cachedCameraDir.z).normalize();
        
        // Map joystick input to camera-relative direction
        // Right stick X = right/left relative to camera view
        // Right stick Z (from joystick Y) = up/down relative to camera view
        // Note: Invert Z because gamepad Y is negative when pushed up
        directionX = (this._cachedCameraRight.x * rightJoystickDir.x) + (this._cachedCameraForward.x * -rightJoystickDir.z);
        directionZ = (this._cachedCameraRight.z * rightJoystickDir.x) + (this._cachedCameraForward.z * -rightJoystickDir.z);
        
        // Normalize direction
        const dirLength = Math.sqrt(directionX * directionX + directionZ * directionZ);
        if (dirLength > 0.001) {
          directionX /= dirLength;
          directionZ /= dirLength;
        }
        
        // Calculate target point in the direction of the joystick (for cursor following)
        const targetDistance = 10; // Distance ahead to aim
        targetX = playerPos.x + directionX * targetDistance;
        targetZ = playerPos.z + directionZ * targetDistance;
      } else {
        // Use character facing direction when right joystick is not active (reuse cached vectors)
        const lastFacing = this.characterManager.getLastFacing();
        camera.getWorldDirection(this._cachedCameraDir);
        
        // Project camera direction onto ground plane (XZ plane)
        this._cachedCameraForward.set(this._cachedCameraDir.x, 0, this._cachedCameraDir.z).normalize();
        
        // Shoot in the direction the character is looking
        // If character is facing 'back' (towards camera, negative Z), shoot backward (towards camera)
        // If character is facing 'front' (away from camera, positive Z), shoot forward (away from camera)
        if (lastFacing === 'back') {
          // Shoot in back direction (same as camera forward, which is negative Z relative to camera)
          directionX = this._cachedCameraForward.x;
          directionZ = this._cachedCameraForward.z;
        } else {
          // Shoot in front direction (opposite of camera forward, which is positive Z relative to camera)
          directionX = -this._cachedCameraForward.x;
          directionZ = -this._cachedCameraForward.z;
        }
        
        // Normalize direction
        const dirLength = Math.sqrt(directionX * directionX + directionZ * directionZ);
        if (dirLength > 0.001) {
          directionX /= dirLength;
          directionZ /= dirLength;
        }
        
        // Don't set targetX/targetZ when using character facing direction to prevent cursor following (curving)
        targetX = null;
        targetZ = null;
      }
    }
    
    // Create projectile
    const projectile = this.projectileManager.createProjectile(
      playerPos.x,
      playerPos.y,
      playerPos.z,
      directionX,
      directionZ,
      playerId,
      characterName,
      targetX,
      targetZ
    );
    
    // Track player shot for learning system
    if (projectile && this.learningManager) {
      const playerPosVec = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z);
      const targetPosVec = targetX !== null && targetZ !== null 
        ? new THREE.Vector3(targetX, playerPos.y, targetZ)
        : null;
      this.learningManager.trackPlayerShot(playerPosVec, targetPosVec);
    }
    
    // Vibration for shooting bolt
    if (projectile && this.vibrationManager) {
      this.vibrationManager.shoot();
    }
    
    // Send projectile to other players via multiplayer
    if (projectile && this.multiplayerManager && this.multiplayerManager.isInRoom()) {
      this.multiplayerManager.sendProjectileCreate({
        projectileType: 'bolt',
        startX: playerPos.x,
        startY: playerPos.y,
        startZ: playerPos.z,
        directionX: directionX,
        directionZ: directionZ,
        characterName: characterName,
        targetX: targetX,
        targetZ: targetZ,
        projectileId: projectile.userData.projectileId
      });
    }
  }

  /**
   * Handle mortar hold system (RB toggle, LT preview, RT release)
   * @param {THREE.Mesh} player - Player mesh
   * @param {number} dt - Delta time
   * @private
   */
  _handleMortarHoldSystem(player, dt) {
    const mortarHoldInput = this.inputManager.isMortarHoldPressed();
    const leftTriggerInput = this.inputManager.isLeftTriggerPressed();
    const rightTriggerInput = this.inputManager.isRightTriggerPressed();
    
    // Handle RB toggle to enter/exit mortar hold mode
    if (mortarHoldInput && !this.lastMortarHoldInput) {
      // RB just pressed - toggle mortar hold mode
      if (this.mortarHoldActive) {
        // Already holding - drop the spell (exit hold mode)
        this.mortarHoldActive = false;
        this.inputManager.setMortarHoldActive(false);
        this._removeMortarHoldVisual();
        // Remove preview if active
        if (this.mortarArcPreview) {
          removeMortarArcPreview(this.mortarArcPreview, this.sceneManager.getScene());
          this.mortarArcPreview = null;
        }
      } else {
        // Not holding - enter mortar hold mode
        this.mortarHoldActive = true;
        this.inputManager.setMortarHoldActive(true);
        this._createMortarHoldVisual(player);
        // Reset cooldown when entering mortar hold mode (so canceling doesn't block shooting)
        this.mortarReleaseCooldown = 0;
      }
    }
    
    // Update mortar hold visual position and animation if active
    if (this.mortarHoldActive && this.mortarHoldVisual) {
      const characterName = this.characterManager.getCharacterName();
      const playerId = 'local';
      
      // Check if character color has changed (character was switched)
      const visual = this.mortarHoldVisual.children[0];
      const currentCharacterColor = this._getCharacterColorForParticles(characterName);
      if (visual && visual.userData.characterColor !== currentCharacterColor) {
        // Character changed - recreate visual with new color
        this._createMortarHoldVisual(player);
      } else {
        // Normal update - character hasn't changed
        // Check cooldown status
        const cooldownInfo = this.projectileManager.getMortarCooldownInfo(playerId, characterName);
        const isOnCooldown = !cooldownInfo.canShoot;
        
        this.mortarHoldVisual.position.set(
          player.position.x,
          player.position.y + 0.5,
          player.position.z
        );
        
        // Update visual based on cooldown status
        this._updateMortarHoldVisualAnimation(dt, isOnCooldown, cooldownInfo.percentage);
        
        // Update cooldown ring if it exists
        if (visual && visual.userData.cooldownRing) {
          this._updateCooldownRing(dt, isOnCooldown, cooldownInfo.percentage);
        }
      }
    }
    
    // Handle preview - show when right joystick is used in mortar hold mode
    const isRightJoystickPushed = this.inputManager.isRightJoystickPushed();
    if (this.mortarHoldActive && isRightJoystickPushed) {
      // Show preview while right joystick is used
      this._updateMortarArcPreview(player);
    } else {
      // Hide preview when joystick is not being used
      if (this.mortarArcPreview && (!isRightJoystickPushed || !this.mortarHoldActive)) {
        removeMortarArcPreview(this.mortarArcPreview, this.sceneManager.getScene());
        this.mortarArcPreview = null;
      }
    }
    
    // Handle release (RT) - release mortar when RT is pressed while in mortar hold mode
    // Only allow release if not on cooldown (RT should not drop the spell when on cooldown)
    if (this.mortarHoldActive && rightTriggerInput && !this.lastRightTriggerInput) {
      // Check cooldown status before allowing release
      const characterName = this.characterManager.getCharacterName();
      const playerId = 'local';
      const cooldownInfo = this.projectileManager.getMortarCooldownInfo(playerId, characterName);
      const canShoot = cooldownInfo.canShoot;
      
      // Only release if not on cooldown
      if (canShoot) {
        
        // RT just pressed - release mortar
        this._handleMortarInput(player);
        // Exit mortar hold mode after release
        this.mortarHoldActive = false;
        this.inputManager.setMortarHoldActive(false);
        this._removeMortarHoldVisual();
        // Remove preview
        if (this.mortarArcPreview) {
          removeMortarArcPreview(this.mortarArcPreview, this.sceneManager.getScene());
          this.mortarArcPreview = null;
        }
        // Set cooldown to prevent immediate bolt shooting (0.3 seconds)
        this.mortarReleaseCooldown = 0.3;
        // Reset lastRightTriggerInput to prevent immediate shooting after release
        this.lastRightTriggerInput = true; // Set to true so shooting won't trigger immediately
      }
      // If on cooldown, RT does nothing (spell stays held, can only be dropped with RB)
    }
    
    // Update tracking variables
    this.lastMortarHoldInput = mortarHoldInput;
    this.lastLeftTriggerInput = leftTriggerInput;
    this.lastRightTriggerInput = rightTriggerInput;
  }
  
  /**
   * Create visual effect for holding mortar spell
   * @param {THREE.Mesh} player - Player mesh
   * @private
   */
  _createMortarHoldVisual(player) {
    if (this.mortarHoldVisual) {
      // Already exists, remove old one
      this._removeMortarHoldVisual();
    }
    
    const characterName = this.characterManager.getCharacterName();
    const characterColor = this._getCharacterColorForParticles(characterName);
    const isHerald = characterName === 'herald';
    
    // Create container group for visual effects
    const visualGroup = new THREE.Group();
    
    // Create main glowing orb/sphere effect with reflection and glow (like fireball/bolt)
    const geometry = new THREE.SphereGeometry(0.3, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: characterColor,
      emissive: characterColor,
      emissiveIntensity: isHerald ? 1.2 : 0.8,
      metalness: 0.7,
      roughness: 0.2,
      transparent: true,
      opacity: 0.6
    });
    
    const visual = new THREE.Mesh(geometry, material);
    visual.castShadow = true;
    
    // Add glow effect with point light (like fireball/bolt)
    const lightIntensity = isHerald ? 2.0 : 1.2;
    const lightRange = isHerald ? 5 : 3;
    const glowLight = new THREE.PointLight(characterColor, lightIntensity, lightRange);
    glowLight.position.set(0, 0, 0); // Position relative to visualGroup
    
    // Create cooldown ring indicator (torus ring around the sphere)
    const ringGeometry = new THREE.TorusGeometry(0.4, 0.03, 8, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: characterColor, // Use character color
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const cooldownRing = new THREE.Mesh(ringGeometry, ringMaterial);
    cooldownRing.rotation.x = Math.PI / 2; // Rotate to be horizontal
    cooldownRing.visible = false; // Hidden by default when ready
    
    // Add visual first (so it's children[0]), then light, then ring
    visualGroup.add(visual);
    visualGroup.add(glowLight);
    visualGroup.add(cooldownRing);
    
    visualGroup.position.set(
      player.position.x,
      player.position.y + 0.5,
      player.position.z
    );
    
    // Store animation data and references
    visual.userData.pulseSpeed = 2.0; // Pulses per second when ready
    visual.userData.pulseSpeedCooldown = 0.8; // Slower pulse when on cooldown
    visual.userData.pulsePhase = 0;
    visual.userData.baseScale = 1.0;
    visual.userData.characterColor = characterColor;
    visual.userData.cooldownRing = cooldownRing;
    visual.userData.rotationPhase = 0; // For rotating ring animation
    visual.userData.glowLight = glowLight; // Store light reference for updates
    visual.userData.baseLightIntensity = lightIntensity; // Store base light intensity
    
    this.mortarHoldVisual = visualGroup;
    this.sceneManager.getScene().add(visualGroup);
  }
  
  /**
   * Remove visual effect for holding mortar spell
   * @private
   */
  _removeMortarHoldVisual() {
    if (this.mortarHoldVisual) {
      // Dispose of all children geometries and materials
      this.mortarHoldVisual.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      
      // Remove from scene before disposing
      this.sceneManager.getScene().remove(this.mortarHoldVisual);
      this.mortarHoldVisual = null;
    }
  }
  
  /**
   * Cancel active mortar hold state and clean up visuals
   * @private
   */
  _cancelMortarHold() {
    if (!this.mortarHoldActive) {
      return;
    }
    
    this.mortarHoldActive = false;
    this.inputManager.setMortarHoldActive(false);
    this._removeMortarHoldVisual();
    
    if (this.mortarArcPreview) {
      removeMortarArcPreview(this.mortarArcPreview, this.sceneManager.getScene());
      this.mortarArcPreview = null;
    }
    
    this.lastMortarHoldInput = false;
    this.lastLeftTriggerInput = false;
    this.lastRightTriggerInput = false;
    this.lastMortarInput = false;
  }
  
  /**
   * Check if Herald is currently sprinting (abilities should be blocked)
   * @returns {boolean} True if Herald is sprinting
   * @private
   */
  _isHeraldSprinting() {
    if (!this.characterManager || !this.inputManager) {
      return false;
    }
    if (this.characterManager.getCharacterName() !== 'herald') {
      return false;
    }
    return this.inputManager.isRunning();
  }
  
  /**
   * Update mortar hold visual animation based on cooldown status
   * @param {number} dt - Delta time in seconds
   * @param {boolean} isOnCooldown - Whether spell is on cooldown
   * @param {number} cooldownPercentage - Cooldown progress (0-1)
   * @private
   */
  _updateMortarHoldVisualAnimation(dt, isOnCooldown, cooldownPercentage) {
    const visual = this.mortarHoldVisual.children[0]; // Main sphere
    const pulseData = visual.userData;
    const glowLight = pulseData.glowLight;
    
    if (isOnCooldown) {
      // On cooldown: character color (darker/brighter), slower pulse, growing opacity
      const characterColorBase = new THREE.Color(pulseData.characterColor);
      const darkerCharacterColor = characterColorBase.clone().multiplyScalar(0.6); // Darker shade for pulsing

      // Calculate cooldown progress (0 = just started, 1 = almost ready)
      const progress = 1 - cooldownPercentage;

      // Sphere grows from small to full size as cooldown progresses
      // Start at 0.3x scale, grow to full baseScale (1.0x) when ready
      const minScale = 0.3;
      const maxScale = pulseData.baseScale;
      const growthScale = minScale + (maxScale - minScale) * progress;

      // Opacity grows from low to high as cooldown progresses
      const minOpacity = 0.2;
      const maxOpacity = 0.7;
      const growthOpacity = minOpacity + (maxOpacity - minOpacity) * progress;

      // Pulse between darker and brighter character color (smaller pulse during cooldown)
      pulseData.pulsePhase += dt * pulseData.pulseSpeedCooldown * Math.PI * 2;
      const pulseVariation = Math.sin(pulseData.pulsePhase) * 0.1; // Smaller pulse variation
      const pulseScale = growthScale + pulseVariation;
      visual.scale.set(pulseScale, pulseScale, pulseScale);

      // Color transition between character color shades
      const colorMix = (Math.sin(pulseData.pulsePhase) + 1) * 0.5;
      const currentColor = new THREE.Color().lerpColors(
        darkerCharacterColor,
        characterColorBase,
        colorMix
      );
      visual.material.color.copy(currentColor);
      visual.material.emissive.copy(currentColor); // Update emissive for glow
      
      // Update light color and intensity based on progress
      if (glowLight) {
        glowLight.color.copy(currentColor);
        const lightIntensity = pulseData.baseLightIntensity * 0.3 * progress; // Grow light intensity with progress
        glowLight.intensity = lightIntensity + Math.sin(pulseData.pulsePhase) * lightIntensity * 0.2;
      }
      
      // Base opacity grows with progress, with small pulsing variation
      const pulseOpacityVariation = Math.sin(pulseData.pulsePhase) * 0.1;
      visual.material.opacity = growthOpacity + pulseOpacityVariation;
    } else {
      // Ready: bright character color, smooth pulsing at full size
      pulseData.pulsePhase += dt * pulseData.pulseSpeed * Math.PI * 2;
      const pulseScale = pulseData.baseScale + Math.sin(pulseData.pulsePhase) * 0.2;
      visual.scale.set(pulseScale, pulseScale, pulseScale);
      
      // Bright character color with emissive glow
      visual.material.color.setHex(pulseData.characterColor);
      visual.material.emissive.setHex(pulseData.characterColor); // Update emissive for glow
      visual.material.opacity = 0.6 + Math.sin(pulseData.pulsePhase) * 0.2; // Smooth pulsing opacity
      
      // Update light color and intensity (pulsing)
      if (glowLight) {
        glowLight.color.setHex(pulseData.characterColor);
        const pulseLightIntensity = pulseData.baseLightIntensity + Math.sin(pulseData.pulsePhase) * pulseData.baseLightIntensity * 0.3;
        glowLight.intensity = pulseLightIntensity;
      }
    }
  }
  
  /**
   * Update cooldown ring indicator
   * @param {number} dt - Delta time in seconds
   * @param {boolean} isOnCooldown - Whether spell is on cooldown
   * @param {number} cooldownPercentage - Cooldown progress (0-1)
   * @private
   */
  _updateCooldownRing(dt, isOnCooldown, cooldownPercentage) {
    const visual = this.mortarHoldVisual.children[0];
    const cooldownRing = visual.userData.cooldownRing;
    
    if (isOnCooldown) {
      // Show ring and animate it
      cooldownRing.visible = true;
      
      // Rotate ring slowly
      visual.userData.rotationPhase += dt * 2.0; // Rotations per second
      cooldownRing.rotation.z = visual.userData.rotationPhase;
      
      // Update ring color based on cooldown progress (darker -> brighter character color as it charges)
      const progress = 1 - cooldownPercentage; // Invert so 0 = just started, 1 = almost ready
      const characterColor = visual.userData.characterColor;
      const darkerCharacterColor = new THREE.Color(characterColor).multiplyScalar(0.6); // Darker version
      const brighterCharacterColor = new THREE.Color(characterColor).multiplyScalar(1.2); // Brighter version

      // Lerp from darker to brighter character color as cooldown progresses
      const ringColor = new THREE.Color().lerpColors(
        darkerCharacterColor,
        brighterCharacterColor,
        progress
      );
      cooldownRing.material.color.copy(ringColor);
      
      // Pulse ring opacity based on progress
      const pulseOpacity = 0.6 + Math.sin(visual.userData.rotationPhase * 4) * 0.2;
      cooldownRing.material.opacity = pulseOpacity;
      
      // Scale ring slightly based on progress (grows as cooldown progresses)
      const scale = 0.9 + progress * 0.1;
      cooldownRing.scale.set(scale, scale, scale);
    } else {
      // Hide ring when ready
      cooldownRing.visible = false;
    }
  }
  
  /**
   * Update mortar arc preview visualization
   * Shows predicted trajectory when aiming (mouse in keyboard mode, right joystick in controller mode)
   * @param {THREE.Mesh} player - Player mesh
   * @private
   */
  _updateMortarArcPreview(player) {
    // Only show preview when holding RB (controller) or right-clicking (keyboard)
    const inputMode = this.inputManager.getInputMode();
    const hasAimingInput = inputMode === 'controller' 
      ? this.inputManager.isRightJoystickPushed() 
      : this.inputManager.isMortarPressed(); // In keyboard mode, show preview when right-clicking
    
    if (!this.mortarHoldActive || !hasAimingInput) {
      return;
    }
    
    const now = performance.now();
    
    // Throttle updates for smoother performance (only update every ~16ms)
    if (now - this._lastArcPreviewUpdate < this._arcPreviewUpdateInterval) {
      return;
    }
    this._lastArcPreviewUpdate = now;
    
    const playerPos = player.position;
    const characterName = this.characterManager.getCharacterName();
    const camera = this.sceneManager.getCamera();
    
    let targetX, targetZ;
    
    // In keyboard mode, use mouse position for aiming
    if (inputMode === 'keyboard') {
      // Convert mouse position to world coordinates using raycaster
      const mousePos = this.inputManager.getMousePosition();
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      mouse.x = (mousePos.x / window.innerWidth) * 2 - 1;
      mouse.y = -(mousePos.y / window.innerHeight) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      
      // Intersect with ground plane at y = 0
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersect = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersect);
      
      // Use mouse cursor position as target
      targetX = intersect.x;
      targetZ = intersect.z;
    } else {
      // In controller mode, use right joystick for aiming
      const rightJoystickDir = this.inputManager.getRightJoystickDirection();
      const isRightJoystickPushed = this.inputManager.isRightJoystickPushed();
      
      // Use right joystick if active, otherwise use character facing direction
      if (isRightJoystickPushed && (rightJoystickDir.x !== 0 || rightJoystickDir.z !== 0)) {
        // Calculate target position (same logic as _handleMortarInput)
        // Get camera forward and right vectors (in world space)
        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        
        // Create a right vector perpendicular to camera direction (in XZ plane)
        const cameraRight = new THREE.Vector3();
        cameraRight.crossVectors(cameraDir, new THREE.Vector3(0, 1, 0)).normalize();
        
        // Create a forward vector in XZ plane (project camera direction onto ground)
        const cameraForward = new THREE.Vector3(cameraDir.x, 0, cameraDir.z).normalize();
        
        // Map joystick input to camera-relative direction
        let directionX = (cameraRight.x * rightJoystickDir.x) + (cameraForward.x * -rightJoystickDir.z);
        let directionZ = (cameraRight.z * rightJoystickDir.x) + (cameraForward.z * -rightJoystickDir.z);
        
        // Normalize direction
        const dirLength = Math.sqrt(directionX * directionX + directionZ * directionZ);
        if (dirLength > 0.001) {
          directionX /= dirLength;
          directionZ /= dirLength;
        }
        
        // Get joystick magnitude to scale distance (0 = character position, 1 = max range)
        const magnitude = this.inputManager.getRightJoystickMagnitude();
        const mortarStats = getMortarStats(characterName);
        const maxDistance = mortarStats.maxRange; // Maximum mortar distance from stats
        
        // Scale distance based on magnitude (center = 0, max push = maxDistance)
        const deadZoneMagnitude = this.inputManager.gamepadDeadZone;
        const normalizedMagnitude = Math.max(0, Math.min(1, (magnitude - deadZoneMagnitude) / (1 - deadZoneMagnitude)));
        const targetDistance = normalizedMagnitude * maxDistance;
        
        // Calculate target point in the direction of the joystick
        targetX = playerPos.x + directionX * targetDistance;
        targetZ = playerPos.z + directionZ * targetDistance;
      } else {
        // Use character facing direction when joystick is not active
        const lastFacing = this.characterManager.getLastFacing();
        
        // Get camera forward direction in world space
        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        
        // Project camera direction onto ground plane (XZ plane)
        const cameraForward = new THREE.Vector3(cameraDir.x, 0, cameraDir.z).normalize();
        
        // Use default distance
        const mortarStats = getMortarStats(characterName);
        const defaultDistance = mortarStats.maxRange * 0.5; // Default to half max range
        
        if (lastFacing === 'back') {
          targetX = playerPos.x + cameraForward.x * defaultDistance;
          targetZ = playerPos.z + cameraForward.z * defaultDistance;
        } else {
          targetX = playerPos.x - cameraForward.x * defaultDistance;
          targetZ = playerPos.z - cameraForward.z * defaultDistance;
        }
      }
    }
    
    // Create or update arc preview
    if (!this.mortarArcPreview) {
      // Create new arc preview
      this.mortarArcPreview = createMortarArcPreview(
        this.sceneManager.getScene(),
        playerPos.x,
        playerPos.y,
        playerPos.z,
        targetX,
        targetZ,
        characterName,
        this.collisionManager
      );
      // Add to scene if preview was successfully created
      if (this.mortarArcPreview) {
        this.sceneManager.getScene().add(this.mortarArcPreview);
      }
    } else {
      // Update existing arc preview
      const updateSuccess = updateMortarArcPreview(
        this.mortarArcPreview,
        playerPos.x,
        playerPos.y,
        playerPos.z,
        targetX,
        targetZ,
        characterName,
        this.collisionManager
      );
      // If update failed (too few points), remove the preview
      if (!updateSuccess && this.mortarArcPreview) {
        removeMortarArcPreview(this.mortarArcPreview, this.sceneManager.getScene());
        this.mortarArcPreview = null;
      }
    }
  }

  /**
   * Handle mortar input
   * @param {THREE.Mesh} player - Player mesh
   * @private
   */
  _handleMortarInput(player) {
    const playerPos = player.position;
    const characterName = this.characterManager.getCharacterName();
    const playerId = 'local';
    
    // Check if player can shoot mortar
    if (!this.projectileManager.canShootMortar(playerId)) {
      return;
    }
    
    const inputMode = this.inputManager.getInputMode();
    const camera = this.sceneManager.getCamera();
    
    let targetX, targetZ;
    
    // In keyboard mode, use mouse position for aiming
    if (inputMode === 'keyboard') {
      // Convert mouse position to world coordinates using raycaster
      const mousePos = this.inputManager.getMousePosition();
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      mouse.x = (mousePos.x / window.innerWidth) * 2 - 1;
      mouse.y = -(mousePos.y / window.innerHeight) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      
      // Intersect with ground plane at y = 0
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersect = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersect);
      
      // Use mouse cursor position as target
      targetX = intersect.x;
      targetZ = intersect.z;
    } else {
      // In controller mode, use right joystick for aiming
      const rightJoystickDir = this.inputManager.getRightJoystickDirection();
      const isRightJoystickPushed = this.inputManager.isRightJoystickPushed();
      
      // Prioritize right joystick for aiming only when actively pushed (smooth 360-degree aiming in world space)
      if (isRightJoystickPushed && (rightJoystickDir.x !== 0 || rightJoystickDir.z !== 0)) {
        // Use camera-relative direction: convert joystick input to world space using camera orientation
        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        
        // Create a right vector perpendicular to camera direction (in XZ plane)
        const cameraRight = new THREE.Vector3();
        cameraRight.crossVectors(cameraDir, new THREE.Vector3(0, 1, 0)).normalize();
        
        // Create a forward vector in XZ plane (project camera direction onto ground)
        const cameraForward = new THREE.Vector3(cameraDir.x, 0, cameraDir.z).normalize();
        
        // Map joystick input to camera-relative direction
        let directionX = (cameraRight.x * rightJoystickDir.x) + (cameraForward.x * -rightJoystickDir.z);
        let directionZ = (cameraRight.z * rightJoystickDir.x) + (cameraForward.z * -rightJoystickDir.z);
        
        // Normalize direction
        const dirLength = Math.sqrt(directionX * directionX + directionZ * directionZ);
        if (dirLength > 0.001) {
          directionX /= dirLength;
          directionZ /= dirLength;
        }
        
        // Get joystick magnitude to scale distance (0 = character position, 1 = max range)
        const magnitude = this.inputManager.getRightJoystickMagnitude();
        const mortarStats = getMortarStats(characterName);
        const maxDistance = mortarStats.maxRange; // Maximum mortar distance from stats
        
        // Scale distance based on magnitude (center = 0, max push = maxDistance)
        const deadZoneMagnitude = this.inputManager.gamepadDeadZone;
        const normalizedMagnitude = Math.max(0, Math.min(1, (magnitude - deadZoneMagnitude) / (1 - deadZoneMagnitude)));
        const targetDistance = normalizedMagnitude * maxDistance;
        
        // Calculate target point in the direction of the joystick
        // If joystick is centered (distance = 0), target will be at character position
        targetX = playerPos.x + directionX * targetDistance;
        targetZ = playerPos.z + directionZ * targetDistance;
      } else {
        // When right joystick is not active, shoot straight up
        // Use a tiny offset to ensure horizontal distance > 0.1 (required by Mortar.js)
        targetX = playerPos.x + 0.15; // Small offset to ensure distance > 0.1
        targetZ = playerPos.z;
      }
    }
    
    // Create mortar
    const mortar = this.projectileManager.createMortar(
      playerPos.x,
      playerPos.y,
      playerPos.z,
      targetX,
      targetZ,
      playerId,
      characterName
    );
    
    // Vibration for shooting mortar
    if (mortar && this.vibrationManager) {
      this.vibrationManager.mortar();
    }
    
    // Play launch sound (arc sound disabled)
    if (mortar) {
      const soundManager = this.characterManager.getSoundManager();
      if (soundManager) {
        // Play launch sound with character name
        const characterName = this.characterManager.getCharacterName();
        soundManager.playMortarLaunch(characterName);
        
        // Arc sound disabled - no longer playing continuous whoosh during flight
      }
    }
    
    // Send mortar to other players via multiplayer
    if (mortar && this.multiplayerManager && this.multiplayerManager.isInRoom()) {
      this.multiplayerManager.sendProjectileCreate({
        projectileType: 'mortar',
        startX: playerPos.x,
        startY: playerPos.y,
        startZ: playerPos.z,
        targetX: targetX,
        targetZ: targetZ,
        characterName: characterName
      });
    }
  }

  /**
   * Handle projectile collisions
   * @param {THREE.Mesh} player - Player mesh
   * @private
   */
  _handleProjectileCollisions(player) {
    // Check projectile collisions with player
    const projectileCollision = this.projectileManager.checkPlayerCollision(
      player.position,
      this.characterManager.getPlayerSize(),
      'local'
    );

    if (projectileCollision.hit) {
      const shooterId = projectileCollision.projectile?.userData?.playerId;
      
      // Shake will be applied in _applyDamageToPlayer based on actual damage
      this._applyDamageToPlayer(projectileCollision.damage, player, shooterId);

      // Note: For mortars, splash will be created at target location when mortar hits ground
      // No need to create splash here - mortar continues to target
    }

    // Check mortar ground explosions for player
    const mortarCollision = this.projectileManager.checkMortarGroundCollision(
      player.position,
      this.characterManager.getPlayerSize(),
      'local'
    );

    if (mortarCollision.hit) {
      const shooterId = mortarCollision.projectile?.userData?.playerId;
      
      // Note: Distance-based vibration is now handled in _handleShootingMode
      // when new splash areas are created. This ensures vibration happens for
      // all explosions, not just when player is hit.
      
      // Shake will be applied in _applyDamageToPlayer based on actual damage
      this._applyDamageToPlayer(mortarCollision.damage, player, shooterId);

      // Note: Splash will be created at target location when mortar hits ground
      // No need to create splash here - mortar continues to target
      
      // Apply poison damage for Lucy's mortar or extra damage for Herald's mortar
      if (mortarCollision.projectile?.userData?.characterName === 'lucy') {
        // Apply poison effect from Lucy's mortar splash
        this._applyMortarPoison(player, mortarCollision.projectile.userData);
      } else if (mortarCollision.projectile?.userData?.characterName === 'herald') {
        // Herald's mortar splash does extra damage - already applied via areaDamage
        // But we need to ensure it's applied when walking in splash
      }
    }
    
    // Check splash areas separately for ongoing damage (walking in splash)
    if (this.projectileManager && this.projectileManager.splashAreas) {
      for (const splashArea of this.projectileManager.splashAreas) {
        const splashCollision = checkSplashAreaCollision(
          splashArea,
          player.position,
          'local'
        );
        
        if (splashCollision.hit) {
          const mortarData = splashArea.userData;
          const characterName = mortarData.characterName;
          
          // Apply splash area damage
          this._applyDamageToPlayer(splashCollision.damage, player, mortarData.playerId);
          
          // Show damage number for splash area
          if (this.damageNumberManager) {
            this.damageNumberManager.showDamage(splashCollision.damage, player.position, 0xff6600);
          }
          
          // Apply poison for Lucy's mortar or extra damage for Herald's mortar
          if (characterName === 'lucy') {
            // Apply poison effect from Lucy's mortar splash
            this._applyMortarPoison(player, mortarData);
          } else if (characterName === 'herald') {
            // Herald's mortar does extra damage - already in areaDamage, but ensure it's applied
          }
        }
      }
    }
    
    // Check projectile collisions with remote players
    if (this.remotePlayerManager && this.multiplayerManager && this.multiplayerManager.isInRoom()) {
      const remotePlayers = this.remotePlayerManager.getRemotePlayers();
      for (const [playerId, remotePlayer] of remotePlayers) {
        const mesh = remotePlayer.mesh;
        
        // Check projectile collisions
        const remoteCollision = this.projectileManager.checkPlayerCollision(
          mesh.position,
          this.characterManager.getPlayerSize(),
          playerId
        );
        
        if (remoteCollision.hit) {
          // Calculate damage (don't apply directly - damage comes from server)
          // But we can update visual feedback here
          // The actual damage sync happens via player-damage event
          
          // Show damage number for attacker (local player hitting remote player)
          const shooterId = remoteCollision.projectile?.userData?.playerId;
          if (shooterId === 'local' && this.damageNumberManager) {
            // Show damage number at remote player position (attacker sees damage they dealt)
            this.damageNumberManager.showDamage(remoteCollision.damage, mesh.position, 0xffaa00);
          }
        }
        
        // Check mortar ground explosions for remote players
        const remoteMortarCollision = this.projectileManager.checkMortarGroundCollision(
          mesh.position,
          this.characterManager.getPlayerSize(),
          playerId
        );
        
        if (remoteMortarCollision.hit) {
          // Visual feedback for mortar hit on remote player
          // Actual damage sync happens via player-damage event
          
          // Show damage number for attacker (local player hitting remote player)
          const shooterId = remoteMortarCollision.projectile?.userData?.playerId;
          if (shooterId === 'local' && this.damageNumberManager) {
            // Show damage number at remote player position (attacker sees damage they dealt)
            this.damageNumberManager.showDamage(remoteMortarCollision.damage, mesh.position, 0xff6600);
          }
        }
        
        // Check splash areas for remote players (walking in splash)
        if (this.projectileManager && this.projectileManager.splashAreas) {
          for (const splashArea of this.projectileManager.splashAreas) {
            const remoteSplashCollision = checkSplashAreaCollision(
              splashArea,
              mesh.position,
              playerId
            );
            
            if (remoteSplashCollision.hit) {
              const mortarData = splashArea.userData;
              
              // Show damage number for attacker (local player hitting remote player with splash)
              const shooterId = mortarData.playerId;
              if (shooterId === 'local' && this.damageNumberManager) {
                // Show damage number at remote player position (attacker sees damage they dealt)
                this.damageNumberManager.showDamage(remoteSplashCollision.damage, mesh.position, 0xff6600);
              }
            }
          }
        }
      }
    }
    
    // Check projectile collisions with bots
    if (this.botManager) {
      const bots = this.botManager.getBots();
      for (const bot of bots) {
        const botCollision = this.projectileManager.checkPlayerCollision(
          bot.position,
          this.characterManager.getPlayerSize(),
          bot.userData.id
        );
        
        if (botCollision.hit) {
          // Get killer playerId from projectile
          const killerId = botCollision.projectile?.userData?.playerId || 'local';
          const wasAlive = bot.userData.health > 0;
          const botDied = this.botManager.damageBot(bot, botCollision.damage, killerId);
          
          // Trigger kill feedback immediately when bot dies (local player kill)
          if (botDied && wasAlive && killerId === 'local' && this.killStreakManager) {
            const currentTime = performance.now() / 1000; // Convert to seconds
            this.killStreakManager.registerKill(currentTime);
          }
          
          // Vibration for hitting an enemy with projectile
          if (killerId === 'local' && this.vibrationManager) {
            this.vibrationManager.projectileHit();
          }
          
          // Show damage number for bot
          if (this.damageNumberManager) {
            this.damageNumberManager.showDamage(botCollision.damage, bot.position, 0xffaa00);
          }
          
          // Don't respawn immediately - death fade will handle it
        }
        
        // Check mortar ground explosions for bots
        const botMortarCollision = this.projectileManager.checkMortarGroundCollision(
          bot.position,
          this.characterManager.getPlayerSize(),
          bot.userData.id
        );
        
        if (botMortarCollision.hit) {
          // Get killer playerId from mortar
          const killerId = botMortarCollision.projectile?.userData?.playerId || 'local';
          const wasAlive = bot.userData.health > 0;
          const botDied = this.botManager.damageBot(bot, botMortarCollision.damage, killerId);
          
          // Trigger kill feedback immediately when bot dies (local player kill)
          if (botDied && wasAlive && killerId === 'local' && this.killStreakManager) {
            const currentTime = performance.now() / 1000; // Convert to seconds
            this.killStreakManager.registerKill(currentTime);
          }
          
          // Show damage number for bot (mortar damage is usually higher)
          if (this.damageNumberManager) {
            this.damageNumberManager.showDamage(botMortarCollision.damage, bot.position, 0xff6600);
          }
          
          // Screen shake on mortar impact (weaker than when hitting player)
          if (this.screenShakeManager) {
            const shakeIntensity = Math.min(0.08, botMortarCollision.damage / 100);
            this.screenShakeManager.shake(shakeIntensity, 0.2, 0.9);
          }
          
          // If direct hit at ground level, create splash immediately
          if (botMortarCollision.needsSplash && botMortarCollision.projectile) {
            this.projectileManager.createSplash(
              botMortarCollision.splashX,
              botMortarCollision.splashY,
              botMortarCollision.splashZ,
              botMortarCollision.projectile.userData
            );
          }
          
          // Don't respawn immediately - death fade will handle it
        }
      }
    }
  }

  /**
   * Apply damage to player
   * @param {number} damage - Damage amount
   * @param {THREE.Mesh} player - Player mesh
   * @param {string} shooterId - Optional ID of the shooter
   * @private
   */
  _applyDamageToPlayer(damage, player, shooterId = null) {
    if (this.characterManager) {
      // Play take damage sound
      const soundManager = this.characterManager.getSoundManager();
      if (soundManager) {
        soundManager.playTakeDamage();
      }
      
      const isDead = this.characterManager.takeDamage(damage);
      const currentHealth = this.characterManager.getHealth();
      const maxHealth = this.characterManager.getMaxHealth();

      // Update player userData for health bar
      if (player && player.userData) {
        player.userData.health = currentHealth;
        player.userData.maxHealth = maxHealth;
      }
      
      // Visual effects: Screen shake, damage number, and screen flash
      if (this.screenShakeManager) {
        // Shake intensity based on damage - scales linearly with damage (reduced overall intensity)
        // For example: 10 damage = 0.05 intensity, 20 damage = 0.1 intensity, 50+ damage = 0.25 intensity
        const shakeIntensity = Math.min(0.25, damage / 1000);
        // Duration scales slightly with damage too (more damage = longer shake)
        const shakeDuration = 0.15 + (damage / 300); // 0.15s to 0.32s
        this.screenShakeManager.shake(shakeIntensity, shakeDuration, 0.9);
      }
      
      if (this.damageNumberManager && player) {
        // Show damage number at player position
        this.damageNumberManager.showDamage(damage, player.position, 0xff0000);
      }
      
      if (this.screenFlashManager) {
        // Flash screen red when taking damage (reduced intensity)
        this.screenFlashManager.flash('#ff0000', 0.15, 0.15);
        
        // Update health overlay for persistent red tint
        this.screenFlashManager.updateHealth(currentHealth, maxHealth);
      }
      
      // Vibration for taking damage
      if (this.vibrationManager) {
        this.vibrationManager.takeDamage(damage);
      }

      // Send damage event to other players via multiplayer
      if (this.multiplayerManager && this.multiplayerManager.isInRoom()) {
        this.multiplayerManager.sendPlayerDamage({
          damage: damage,
          health: currentHealth,
          maxHealth: maxHealth
        });
      }

      if (isDead) {
        // Player died - play death animation and start fade out
        // Only trigger once (check if already dying)
        if (!this.characterManager.isDying()) {
          // Play death sound
          if (soundManager) {
            soundManager.playDeath();
          }
          
          this.characterManager.playDeathAnimation();
          
          // Vibration for death
          if (this.vibrationManager) {
            this.vibrationManager.death();
          }
          
          // Extra screen shake on death (reduced intensity)
          if (this.screenShakeManager) {
            this.screenShakeManager.shake(0.15, 0.4, 0.85);
          }
        }

        // Track kills for bots (local player deaths are tracked in GameModeManager)
        if (shooterId && shooterId !== 'local' && this.botManager) {
          const bots = this.botManager.getAllBots();
          const killerBot = bots.find(bot => bot.userData.id === shooterId);
          if (killerBot) {
            killerBot.userData.kills = (killerBot.userData.kills || 0) + 1;
          }
        }

        // Don't respawn immediately - wait for fade to complete
        // Respawn will happen in update() when fade completes
      }
    }
  }

  /**
   * Handle movement updates
   * @param {number} dt - Delta time
   * @param {THREE.Mesh} player - Player mesh
   * @param {THREE.Vector2} input - Input vector
   * @param {boolean} canMove - Whether player can move
   * @private
   */
  _handleMovement(dt, player, input, canMove) {
    // Don't allow movement during death fade
    if (this.characterManager.isDying()) {
      // Keep character idle during death fade
      this.characterManager.updateMovement(new THREE.Vector2(0, 0), new THREE.Vector3(0, 0, 0), this.sceneManager.getCamera(), false);
      return;
    }
    
    // Handle player knockback velocity (from melee attacks, blast, etc.)
    if (player.userData && player.userData.velocityX !== undefined && player.userData.velocityZ !== undefined) {
      const meleeStats = getMeleeStats(this.characterManager.getCharacterName());
      const velocityDecay = meleeStats.velocityDecay || 0.85;
      
      // Apply velocity decay
      player.userData.velocityX *= velocityDecay;
      player.userData.velocityZ *= velocityDecay;
      
      // Stop velocity if it's very small
      if (Math.abs(player.userData.velocityX) < 0.1) player.userData.velocityX = 0;
      if (Math.abs(player.userData.velocityZ) < 0.1) player.userData.velocityZ = 0;
      
      // Clear knockback flag if velocity is too low
      if (player.userData.isKnockedBack && 
          (Math.abs(player.userData.velocityX) < 0.1 && Math.abs(player.userData.velocityZ) < 0.1) &&
          this.characterManager.characterData.isGrounded) {
        player.userData.isKnockedBack = false;
      }
      
      // Apply knockback movement
      const knockbackMoveX = (player.userData.velocityX || 0) * dt;
      const knockbackMoveZ = (player.userData.velocityZ || 0) * dt;
      
      if (Math.abs(knockbackMoveX) > 0.001 || Math.abs(knockbackMoveZ) > 0.001) {
        const playerSize = this.characterManager.getPlayerSize();
        const knockbackPos = new THREE.Vector3(
          player.position.x + knockbackMoveX,
          player.position.y,
          player.position.z + knockbackMoveZ
        );
        
        // Check collision before applying knockback movement
        if (!this.collisionManager.willCollide(knockbackPos, playerSize)) {
          player.position.x += knockbackMoveX;
          player.position.z += knockbackMoveZ;
        } else {
          // Try sliding along each axis independently
          const knockbackPosX = new THREE.Vector3(
            player.position.x + knockbackMoveX,
            player.position.y,
            player.position.z
          );
          const knockbackPosZ = new THREE.Vector3(
            player.position.x,
            player.position.y,
            player.position.z + knockbackMoveZ
          );
          
          if (!this.collisionManager.willCollide(knockbackPosX, playerSize)) {
            player.position.x += knockbackMoveX;
          }
          if (!this.collisionManager.willCollide(knockbackPosZ, playerSize)) {
            player.position.z += knockbackMoveZ;
          }
        }
      }
    }
    
    // Movement is allowed while holding mortar spell (can move and aim)
    if (canMove) {
      // Check if player is being knocked back - if so, reduce normal movement
      const hasKnockback = player.userData && player.userData.isKnockedBack && 
                          player.userData.velocityX !== undefined && player.userData.velocityZ !== undefined &&
                          (Math.abs(player.userData.velocityX) > 0.1 || Math.abs(player.userData.velocityZ) > 0.1);
      
      if (!hasKnockback) {
        const currentSpeed = this.inputManager.getCurrentSpeed();
        const velocity = new THREE.Vector3(input.x, 0, -input.y).multiplyScalar(currentSpeed * dt);
        const nextPos = player.position.clone().add(velocity);
        const playerSize = this.characterManager.getPlayerSize();

        // Try full movement first
        if (!this.collisionManager.willCollide(nextPos, playerSize)) {
          // Full movement works - apply both axes
          player.position.x = nextPos.x;
          player.position.z = nextPos.z;
        } else {
          // Full movement blocked - try sliding along each axis independently
          // Try X-axis movement only
          const nextPosX = new THREE.Vector3(nextPos.x, player.position.y, player.position.z);
          const canMoveX = !this.collisionManager.willCollide(nextPosX, playerSize);
          
          // Try Z-axis movement only
          const nextPosZ = new THREE.Vector3(player.position.x, player.position.y, nextPos.z);
          const canMoveZ = !this.collisionManager.willCollide(nextPosZ, playerSize);
          
          // Apply movement along whichever axis is free (or both if both are free)
          if (canMoveX) {
            player.position.x = nextPos.x;
          }
          if (canMoveZ) {
            player.position.z = nextPos.z;
          }
        }

        // Track player movement for learning system
        if (this.learningManager) {
          const playerPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
          this.learningManager.trackPlayerMovement(playerPos, velocity);
        }
        
        // Update character movement and animation
        // isRunning() already checks mortarHoldActive internally, so we can use it directly
        const isRunning = this.inputManager.isRunning();
        this.characterManager.updateMovement(input, velocity, this.sceneManager.getCamera(), isRunning);
        this.characterManager.updateSmokeSpawnTimer(dt);

        if (this.characterManager.getCharacterName() === 'herald' && isRunning) {
          this._applyHeraldRollKnockback(player, velocity);
        }
      } else {
        // Player is being knocked back - still update animation but with reduced/no input
        const isRunning = this.inputManager.isRunning();
        this.characterManager.updateMovement(new THREE.Vector2(0, 0), new THREE.Vector3(0, 0, 0), this.sceneManager.getCamera(), isRunning);
      }
    } else {
      // Before game starts, keep character idle
      this.characterManager.updateMovement(new THREE.Vector2(0, 0), new THREE.Vector3(0, 0, 0), this.sceneManager.getCamera(), false);
    }
  }

  /**
   * Handle character swap input (Y button)
   * @private
   */
  _handleCharacterSwap() {
    // Vibration for character swap
    if (this.vibrationManager) {
      this.vibrationManager.characterSwap();
    }
    
    // Play character swap sound
    const soundManager = this.characterManager.getSoundManager();
    if (soundManager) {
      soundManager.playCharacterSwap();
    }
    
    const currentChar = this.characterManager.getCharacterName();
    const newChar = currentChar === 'lucy' ? 'herald' : 'lucy';
    
    // Trigger fast smoke particle burst
    const player = this.characterManager.getPlayer();
    if (player && this.characterManager.particleManager) {
      this.characterManager.particleManager.spawnCharacterSwapSmoke(player.position);
    }
    
    // Load the new character
    this.characterManager.loadCharacter(newChar).then(() => {
      // Save to localStorage when character changes
      setLastCharacter(newChar);
      if (this.inputManager && typeof this.inputManager.applyCharacterMovementStats === 'function') {
        this.inputManager.applyCharacterMovementStats(newChar);
      }
      
      // Reset bullets for new character
      if (this.projectileManager) {
        this.projectileManager.setCharacter(newChar, 'local');
      }
      
      // Update multiplayer if in a room
      if (this.multiplayerManager && this.multiplayerManager.isInRoom()) {
        // Send character change event
        this.multiplayerManager.sendCharacterChange(newChar);
        
        // Also update player info in connected players
        const localPlayerId = this.multiplayerManager.getLocalPlayerId();
        const playerInfo = this.multiplayerManager.getPlayerInfo(localPlayerId);
        if (playerInfo) {
          playerInfo.characterName = newChar;
        }
      }
      
      // Update UI to reflect the character change
      if (this.characterUIUpdateCallback) {
        this.characterUIUpdateCallback(newChar);
      }
      
      // Update mortar hold visual if active (recreate with new character color)
      if (this.mortarHoldActive && this.mortarHoldVisual && player) {
        this._createMortarHoldVisual(player);
      }
    });
  }

  /**
   * Apply knockback to nearby entities while Herald is rolling
   * @param {THREE.Mesh} player - Player mesh
  * @param {THREE.Vector3} velocity - Current frame movement delta
   * @private
   */
  _applyHeraldRollKnockback(player, velocity) {
    if (!player || !velocity) {
      return;
    }

    // Require meaningful movement to avoid triggering while idle
    if (velocity.lengthSq() <= 1e-6) {
      return;
    }

    const rollStats = getHeraldRollStats();
    if (!rollStats) {
      return;
    }

    const playerSize = typeof this.characterManager.getPlayerSize === 'function'
      ? this.characterManager.getPlayerSize()
      : 0.5;

    const radius = rollStats.radius !== undefined
      ? rollStats.radius
      : playerSize * (rollStats.radiusMultiplier || 1.0);

    if (radius <= 0) {
      return;
    }

    const horizontalVelocity = rollStats.horizontalVelocity ?? 10.0;
    const verticalVelocity = rollStats.verticalVelocity ?? 0;
    const cooldownMs = rollStats.cooldownMs ?? 300;
    const minDistance = rollStats.minDistance ?? 0.05;

    const radiusSq = radius * radius;
    const minDistanceSq = minDistance * minDistance;
    const now = performance.now();

    this._cleanupHeraldRollCooldowns(now, cooldownMs);

    const playerPos = player.position;
    let registeredHit = false;

    const applyKnockback = (key, dx, dz, applyVelocity) => {
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq > radiusSq) {
        return false;
      }

      if (this.heraldRollKnockCooldowns.has(key)) {
        const lastHit = this.heraldRollKnockCooldowns.get(key);
        if (lastHit && now - lastHit < cooldownMs) {
          return false;
        }
      }

      let distance = Math.sqrt(Math.max(distanceSq, minDistanceSq));
      if (distance < minDistance) {
        distance = minDistance;
      }

      const dirX = dx / distance;
      const dirZ = dz / distance;

      applyVelocity(dirX, dirZ);
      this.heraldRollKnockCooldowns.set(key, now);
      registeredHit = true;
      return true;
    };

    // Knockback bots
    if (this.botManager) {
      const bots = this.botManager.getAllBots();
      for (let i = 0; i < bots.length; i++) {
        const bot = bots[i];
        if (!bot || !bot.userData || bot.userData.health <= 0 || bot.userData.isDying) {
          continue;
        }

        const dx = bot.position.x - playerPos.x;
        const dz = bot.position.z - playerPos.z;
        const key = bot.userData.id ? `bot_${bot.userData.id}` : `bot_${bot.uuid}`;

        applyKnockback(key, dx, dz, (dirX, dirZ) => {
          bot.userData.velocityX = dirX * horizontalVelocity;
          bot.userData.velocityZ = dirZ * horizontalVelocity;
          if (verticalVelocity > 0) {
            const currentVelocityY = bot.userData.velocityY || 0;
            bot.userData.velocityY = Math.max(currentVelocityY, verticalVelocity);
          }
          bot.userData.isKnockedBack = true;
          
          // Track who pushed this bot (for arena fallout kills)
          this.pushedByTracker.set(key, {
            pusherId: 'local',
            timestamp: performance.now()
          });
        });
      }
    }

    // Knockback remote players (visual-only on local client)
    if (this.remotePlayerManager && this.multiplayerManager && this.multiplayerManager.isInRoom()) {
      const remotePlayers = this.remotePlayerManager.getRemotePlayers();
      for (const [playerId, remotePlayer] of remotePlayers) {
        if (!remotePlayer || !remotePlayer.mesh) {
          continue;
        }

        const mesh = remotePlayer.mesh;
        if (mesh.userData && mesh.userData.isDying) {
          continue;
        }

        const dx = mesh.position.x - playerPos.x;
        const dz = mesh.position.z - playerPos.z;
        const key = `remote_${playerId}`;

        applyKnockback(key, dx, dz, (dirX, dirZ) => {
          remotePlayer.velocityX = dirX * horizontalVelocity;
          remotePlayer.velocityZ = dirZ * horizontalVelocity;

          if (!mesh.userData) {
            mesh.userData = {};
          }
          if (!mesh.userData.characterData) {
            mesh.userData.characterData = {};
          }
          if (verticalVelocity > 0) {
            const currentVelocityY = mesh.userData.characterData.velocityY || 0;
            mesh.userData.characterData.velocityY = Math.max(currentVelocityY, verticalVelocity);
          }
          mesh.userData.characterData.isKnockedBack = true;
          
          // Track who pushed this remote player (for arena fallout kills)
          this.pushedByTracker.set(key, {
            pusherId: 'local',
            timestamp: performance.now()
          });
        });
      }
    }

    if (registeredHit) {
      if (this.vibrationManager) {
        this.vibrationManager.medium();
      }
      const soundManager = this.characterManager.getSoundManager();
      if (soundManager && typeof soundManager.playMeleeHit === 'function') {
        const characterName = this.characterManager.getCharacterName();
        soundManager.playMeleeHit(characterName);
      }
    }
  }

  /**
   * Handle arena fallout kill - award kill to pusher when entity falls out
   * @param {string} entityId - Entity ID ('local', 'bot_<id>', or 'remote_<id>')
   * @private
   */
  _handleArenaFalloutKill(entityId) {
    if (!this.pushedByTracker || !entityId) return;
    
    const pushInfo = this.pushedByTracker.get(entityId);
    if (!pushInfo) return;
    
    const now = performance.now();
    const timeSincePush = now - pushInfo.timestamp;
    const maxTimeWindow = 5000; // 5 seconds - if they fall out within this time, count as kill
    
    // Only count as kill if they fell out within reasonable time after being pushed
    if (timeSincePush <= maxTimeWindow && pushInfo.pusherId === 'local') {
      // Award kill to local player
      if (this.gameModeManager && this.gameModeManager.modeState) {
        this.gameModeManager.modeState.kills++;
      }
      
      // Trigger kill streak feedback
      if (this.killStreakManager) {
        const currentTime = performance.now() / 1000;
        this.killStreakManager.registerKill(currentTime);
      }
      
      // Update bot kills if entity is a bot
      if (entityId.startsWith('bot_')) {
        const botId = entityId.replace('bot_', '');
        if (this.botManager) {
          const bots = this.botManager.getAllBots();
          for (const bot of bots) {
            if (bot.userData && (bot.userData.id === botId || `bot_${bot.uuid}` === entityId)) {
              // Find the bot that killed this bot (if any)
              // For now, just track that local player got the kill
              break;
            }
          }
        }
      }
    }
    
    // Clean up tracking entry
    this.pushedByTracker.delete(entityId);
  }

  /**
   * Clean up stale push tracking entries
   * @param {number} maxAge - Maximum age in milliseconds
   * @private
   */
  _cleanupPushTracking(maxAge = 10000) {
    if (!this.pushedByTracker) return;
    
    const now = performance.now();
    for (const [entityId, pushInfo] of this.pushedByTracker) {
      if (!pushInfo || now - pushInfo.timestamp > maxAge) {
        this.pushedByTracker.delete(entityId);
      }
    }
  }

  /**
   * Remove stale cooldown entries for Herald roll knockback
   * @param {number} now - Current timestamp
   * @param {number} cooldownMs - Cooldown duration in ms
   * @private
   */
  _cleanupHeraldRollCooldowns(now, cooldownMs) {
    if (!this.heraldRollKnockCooldowns) {
      return;
    }

    const maxAge = Math.max(cooldownMs * 3, 1500);
    for (const [key, timestamp] of this.heraldRollKnockCooldowns) {
      if (!timestamp || now - timestamp > maxAge) {
        this.heraldRollKnockCooldowns.delete(key);
      }
    }
  }

  /**
   * Handle heal input (X button - hold to heal)
   * Healing increases per X milliseconds you hold it in one hold. Resets when released.
   * @param {THREE.Mesh} player - Player mesh
   * @param {number} dt - Delta time
   * @private
   */
  /**
   * Apply poison effect from Lucy's mortar splash
   * @param {THREE.Mesh} player - Player mesh
   * @param {Object} mortarData - Mortar userData
   * @private
   */
  _applyMortarPoison(player, mortarData) {
    // Apply poison similar to melee poison
    // Use Lucy's melee poison stats for consistency
    const characterName = mortarData.characterName || 'lucy';
    const meleeStats = getMeleeStats(characterName);
    const poisonDamage = meleeStats.poisonDamage || 1;
    const poisonTickInterval = meleeStats.poisonTickInterval || 0.5;
    const poisonDuration = meleeStats.poisonDuration || 3.0;
    const slowSpeedMultiplier = meleeStats.slowSpeedMultiplier || 0.6;
    
    // Apply poison to player
    if (!this.poisonedEntities.has(player)) {
      this.poisonedEntities.set(player, {
        timeLeft: poisonDuration,
        tickTimer: 0,
        damage: poisonDamage,
        tickInterval: poisonTickInterval,
        speedMultiplier: slowSpeedMultiplier,
        type: 'player'
      });
      
      // Store speed multiplier in player's userData
      if (player.userData) {
        player.userData.poisonSpeedMultiplier = slowSpeedMultiplier;
      }
    }
  }

  async _handleHeal(player, dt) {
    // Base heal rate per second
    const baseHealRate = 5; // HP per second
    
    // Healing multiplier increases based on hold duration
    // Every 0.5 seconds held, increase healing by 50% (up to 3x multiplier)
    const healMultiplierInterval = 0.5; // Seconds between multiplier increases
    const healMultiplierIncrease = 0.5; // Increase multiplier by this amount each interval
    const maxMultiplier = 3.0; // Maximum multiplier cap
    
    // Calculate multiplier based on hold duration
    const multiplierSteps = Math.floor(this.healHoldDuration / healMultiplierInterval);
    const healMultiplier = Math.min(1.0 + (multiplierSteps * healMultiplierIncrease), maxMultiplier);
    
    // Apply healing with multiplier
    const healRate = baseHealRate * healMultiplier; // HP per second (scaled by multiplier)
    const newHealth = Math.min(
      this.characterManager.getHealth() + healRate * dt,
      this.characterManager.getMaxHealth()
    );
    
    if (newHealth > this.characterManager.getHealth()) {
      const currentHealth = this.characterManager.getHealth();
      const healAmount = newHealth - currentHealth;
      this.characterManager.setHealth(newHealth);
      
      // Accumulate heal amount for display
      this._accumulatedHealAmount += healAmount;
      
      // Show healing number (green color for positive values)
      if (this.damageNumberManager && this._accumulatedHealAmount > 0) {
        // Show healing amount less frequently to avoid spam (every 0.2 seconds)
        const now = performance.now() / 1000;
        if (!this._lastHealNumberTime || now - this._lastHealNumberTime >= 0.2) {
          // Show accumulated heal amount (round to 1 decimal for display)
          const displayAmount = Math.round(this._accumulatedHealAmount * 10) / 10;
          if (displayAmount > 0) {
            this.damageNumberManager.showDamage(displayAmount, player.position, 0x00ff00);
            this._accumulatedHealAmount = 0; // Reset accumulator
          }
          this._lastHealNumberTime = now;
        }
      }
      
      // Vibration for healing (throttled to prevent too much vibration)
      if (this.vibrationManager) {
        const now = performance.now() / 1000; // Convert to seconds
        if (now - this._lastHealVibrationTime >= this._healVibrationInterval) {
          this.vibrationManager.heal();
          this._lastHealVibrationTime = now;
        }
      }
      
      // Add healing particles with character color
      // Increase particle count based on multiplier
      if (this.characterManager.particleManager) {
        const characterName = this.characterManager.getCharacterName();
        const characterColor = this._getCharacterColorForParticles(characterName);
        const particleCount = Math.floor(5 * healMultiplier); // More particles with higher multiplier
        // Spawn healing particles with character color around character
        for (let i = 0; i < particleCount; i++) {
          const pos = new THREE.Vector3(
            player.position.x + (Math.random() - 0.5) * 0.5,
            player.position.y + Math.random() * 0.3,
            player.position.z + (Math.random() - 0.5) * 0.5
          );
          this.characterManager.particleManager.spawnHealingParticle(pos, characterColor);
        }
      }
    }
  }

  /**
   * Check if there's a clear line of sight between two points (no walls blocking)
   * Optimized with reduced sampling and early exits
   * @param {THREE.Vector3} startPos - Start position
   * @param {THREE.Vector3} targetPos - Target position
   * @param {number} attackRadius - Radius of the attack circle (uses meleeRange if available)
   * @param {number} blockageThreshold - Maximum allowed blockage percentage (0-1, default: 0.3 = 30%)
   * @returns {Object} {clear: boolean, blockagePercentage: number} - Clear path and blockage info
   * @private
   */
  _hasLineOfSight(startPos, targetPos, attackRadius = null, blockageThreshold = 0.3) {
    if (!this.collisionManager) return { clear: true, blockagePercentage: 0 };
    
    const dx = targetPos.x - startPos.x;
    const dz = targetPos.z - startPos.z;
    const distanceSq = dx * dx + dz * dz;
    const distance = Math.sqrt(distanceSq);
    
    if (distance < 0.1) return { clear: true, blockagePercentage: 0 }; // Very close, assume clear
    
    // Use attack radius if provided, otherwise use a default check radius
    const checkRadius = attackRadius || 0.3;
    
    // Reduced sampling for performance - fewer samples, more efficient
    // Reduced from 8-20 samples to 4-10 samples
    const baseSamples = 4;
    const distanceSamples = Math.ceil(distance / 3); // +1 sample per 3 units (reduced frequency)
    const radiusSamples = Math.ceil(checkRadius * 2); // Reduced from 4 to 2
    const totalSamples = Math.min(baseSamples + distanceSamples + radiusSamples, 10); // Cap at 10 (reduced from 20)
    
    // Normalize direction
    const dirX = dx / distance;
    const dirZ = dz / distance;
    
    let blockedSamples = 0;
    let firstBlockedDistance = null;
    
    // Check multiple points along the path with circle area checking
    for (let i = 1; i <= totalSamples; i++) {
      const t = i / totalSamples; // Progress from 0 to 1
      const checkX = startPos.x + dirX * distance * t;
      const checkZ = startPos.z + dirZ * distance * t;
      const checkY = startPos.y; // Use start Y position
      
      // Check if this point (with circle radius) collides with walls
      // Use checkRadius * 2 to match the collision manager's expected size parameter
      if (this.collisionManager.willCollide(new THREE.Vector3(checkX, checkY, checkZ), checkRadius * 2)) {
        blockedSamples++;
        
        // Track first blocked point for early optimization
        if (firstBlockedDistance === null) {
          firstBlockedDistance = distance * t;
        }
        
        // Early exit optimization: if significant blockage found early, return immediately
        // This prevents checking further when we already know it's blocked
        if (blockedSamples >= 2 && i >= 3) {
          // If 2+ samples are blocked after checking at least 3 points, likely blocked
          return { 
            clear: false, 
            blockagePercentage: blockedSamples / i,
            blockedDistance: firstBlockedDistance
          };
        }
      }
    }
    
    // Calculate blockage percentage
    const blockagePercentage = blockedSamples / totalSamples;
    
    // Path is clear if blockage is below threshold
    const isClear = blockagePercentage <= blockageThreshold;
    
    return {
      clear: isClear,
      blockagePercentage: blockagePercentage,
      blockedDistance: firstBlockedDistance
    };
  }
  
  /**
   * Handle sword swing input (B button)
   * @param {THREE.Mesh} player - Player mesh
   * @private
   */
  _handleSwordSwing(player) {
    // Vibration for sword swing
    if (this.vibrationManager) {
      this.vibrationManager.swordSwing();
    }
    
    // Get character-specific melee stats
    const characterName = this.characterManager.getCharacterName();
    
    // Play melee swing sound
    const soundManager = this.characterManager.getSoundManager();
    if (soundManager) {
      soundManager.playMeleeSwing(characterName);
    }
    const meleeStats = getMeleeStats(characterName);
    const radius = meleeStats.range;
    const initialDamage = meleeStats.initialDamage;
    const damagePerTick = meleeStats.damage;
    const tickInterval = meleeStats.tickInterval;
    const animationDuration = meleeStats.animationDuration;
    const cooldown = meleeStats.cooldown;
    const poisonDamage = meleeStats.poisonDamage;
    const poisonTickInterval = meleeStats.poisonTickInterval;
    const poisonDuration = meleeStats.poisonDuration;
    const slowSpeedMultiplier = meleeStats.slowSpeedMultiplier;
    const horizontalVelocity = meleeStats.horizontalVelocity || 8;
    const verticalVelocity = meleeStats.verticalVelocity || 2;
    
    // Set cooldown timer
    this.meleeCooldownTimer = cooldown;
    
    // Sync melee cooldown to ProjectileManager for UI display
    if (this.projectileManager) {
      const playerId = 'local';
      this.projectileManager.setMeleeCooldown(playerId, cooldown);
    }
    
    // Update animation duration based on character
    this.swordSwingAnimationDuration = animationDuration;
    
    // Store melee stats for damage over time
    this.meleeInitialDamage = initialDamage;
    this.meleeDamagePerTick = damagePerTick;
    this.meleeTickInterval = tickInterval;
    this.meleeRange = radius;
    this.meleePoisonDamage = poisonDamage;
    this.meleePoisonTickInterval = poisonTickInterval;
    this.meleePoisonDuration = poisonDuration;
    this.meleeSlowSpeedMultiplier = slowSpeedMultiplier;
    
    // Create 360 degree damage circle visual effect
    // Inner radius scales with range (87.5% of range for visual effect)
    const segments = 32;
    const innerRadius = radius * 0.875; // Scale relative to range variable
    const outerRadius = radius; // Use exact range for outer edge
    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, segments);
    // Use character color for sword swing
    const characterColor = this._getCharacterColorForParticles(characterName);
    const material = new THREE.MeshBasicMaterial({
      color: characterColor,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    
    const circle = new THREE.Mesh(geometry, material);
    circle.rotation.x = -Math.PI / 2; // Lay flat on ground
    circle.position.set(player.position.x, player.position.y + .2, player.position.z);
    
    // Store reference to circle for following character during animation
    this.swordSwingCircle = circle;
    
    // Add to scene
    this.sceneManager.getScene().add(circle);
    
    // Spawn character-colored sword swing particles
    // Pass animationDuration so particles match the animation duration
    if (this.characterManager.particleManager) {
      const playerPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
      this.characterManager.particleManager.spawnSwordSwingParticles(playerPos, characterColor, radius, animationDuration);
    }
    
    // Fire projectiles in 360-degree pattern for Lucy's melee
    // Check for projectileCount property (use config directly if not in merged stats)
    const projectileCount = characterName === 'lucy' 
      ? (meleeStats.projectileCount || LUCY_MELEE_ATTACK_CONFIG.projectileCount || 16)
      : 0;
    
    if (characterName === 'lucy' && projectileCount && projectileCount > 0) {
      const projectileSpeed = meleeStats.projectileSpeed || LUCY_MELEE_ATTACK_CONFIG.projectileSpeed || 6;
      const projectileDamage = meleeStats.projectileDamage || LUCY_MELEE_ATTACK_CONFIG.projectileDamage || 8;
      const playerPos = player.position;
      const playerHeight = playerPos.y;
      
      // Debug: Log projectile creation
      console.log('[Lucy Melee] Firing', projectileCount, 'projectiles at speed', projectileSpeed);
      
      for (let i = 0; i < projectileCount; i++) {
        // Calculate angle for this projectile (360 degrees evenly distributed)
        const angle = (i / projectileCount) * Math.PI * 2;
        
        // Calculate direction vector
        const directionX = Math.cos(angle);
        const directionZ = Math.sin(angle);
        
        // Spawn position slightly offset from character
        const offsetX = directionX * 0.5;
        const offsetZ = directionZ * 0.5;
        
        // Create projectile (forceCreate bypasses cooldown for multiple projectiles)
        if (this.projectileManager) {
          const playerId = 'local';
          const projectile = this.projectileManager.createProjectile(
            playerPos.x + offsetX,
            playerHeight,
            playerPos.z + offsetZ,
            directionX,
            directionZ,
            playerId,
            characterName,
            null,
            null,
            { forceCreate: true }
          );
          
          // Override projectile speed and damage if needed
          if (projectile && projectile.userData) {
            projectile.userData.customSpeed = projectileSpeed;
            projectile.userData.damage = projectileDamage;
            // Set initial velocity immediately with custom speed
            const currentSpeed = Math.sqrt(
              projectile.userData.velocityX * projectile.userData.velocityX +
              projectile.userData.velocityZ * projectile.userData.velocityZ
            );
            if (currentSpeed > 0.001) {
              const speedRatio = projectileSpeed / currentSpeed;
              projectile.userData.velocityX *= speedRatio;
              projectile.userData.velocityZ *= speedRatio;
            }
          }
        }
      }
    }
    
    // Start sword swing animation tracking
    this.swordSwingAnimationTime = animationDuration;
    this.meleeDamageTickTimer = 0; // Reset damage tick timer
    
    // Clear previous affected entities - will be populated as damage is applied over time
    this.meleeAffectedEntities.clear();
    
    // Apply immediate damage on first hit
    const playerPos = player.position;
    const radiusSq = radius * radius; // Pre-calculate squared radius
    
    // Damage bots in range immediately - optimized
    if (this.botManager && initialDamage > 0) {
      const bots = this.botManager.getAllBots();
      let hitSoundPlayed = false; // Only play sound once per swing
      for (let i = 0; i < bots.length; i++) {
        const bot = bots[i];
        const dx = bot.position.x - playerPos.x;
        const dz = bot.position.z - playerPos.z;
        const distanceSq = dx * dx + dz * dz; // Use squared distance to avoid sqrt
        
        if (distanceSq <= radiusSq) {
          // Check line of sight - don't damage through walls
          const sightCheck = this._hasLineOfSight(playerPos, bot.position, radius, 0.3);
          
          if (sightCheck.clear) {
            // Play melee hit sound (once per swing)
            if (!hitSoundPlayed) {
              const soundManager = this.characterManager.getSoundManager();
              if (soundManager) {
                const characterName = this.characterManager.getCharacterName();
                soundManager.playMeleeHit(characterName);
                hitSoundPlayed = true;
              }
            }
            
            // Apply immediate damage
            const wasAlive = bot.userData.health > 0;
            const botDied = this.botManager.damageBot(bot, initialDamage, 'local');
            
            // Trigger kill feedback immediately when bot dies (local player kill)
            if (botDied && wasAlive && this.killStreakManager) {
              const currentTime = performance.now() / 1000; // Convert to seconds
              this.killStreakManager.registerKill(currentTime);
            }
            
            // Show damage number for melee initial hit
            if (this.damageNumberManager) {
              this.damageNumberManager.showDamage(initialDamage, bot.position, 0xff8800);
            }
            
            // Apply knockback to bot
            if (!botDied && distanceSq > 0.01) {
              const distance = Math.sqrt(distanceSq);
              const dirX = dx / distance;
              const dirZ = dz / distance;
              const distanceMultiplier = 1 - distance / radius;
              
              // Apply velocity to bot
              bot.userData.velocityX = dirX * horizontalVelocity * distanceMultiplier;
              bot.userData.velocityZ = dirZ * horizontalVelocity * distanceMultiplier;
              bot.userData.velocityY = verticalVelocity;
              bot.userData.isKnockedBack = true;
              
              // Track who pushed this bot (for arena fallout kills)
              const botId = bot.userData.id || `bot_${bot.uuid}`;
              this.pushedByTracker.set(botId, {
                pusherId: 'local',
                timestamp: performance.now()
              });
            }
            
            if (!botDied) {
              // Track this bot as affected for poison effect
              this.meleeAffectedEntities.add(bot);
            }
          }
        }
      }
    }
    
    // Damage remote players in multiplayer mode immediately - optimized
    if (this.remotePlayerManager && this.multiplayerManager && this.multiplayerManager.isInRoom() && initialDamage > 0) {
      const remotePlayers = this.remotePlayerManager.getRemotePlayers();
      let hitSoundPlayed = false; // Only play sound once per swing (may be set by bots above)
      for (const [playerId, remotePlayer] of remotePlayers) {
        const mesh = remotePlayer.mesh;
        if (!mesh) continue;
        
        const dx = mesh.position.x - playerPos.x;
        const dz = mesh.position.z - playerPos.z;
        const distanceSq = dx * dx + dz * dz; // Use squared distance to avoid sqrt
        
        if (distanceSq <= radiusSq) {
          // Check line of sight - don't damage through walls
          const sightCheck = this._hasLineOfSight(playerPos, mesh.position, radius, 0.3);
          
          if (sightCheck.clear) {
            // Play melee hit sound (once per swing)
            if (!hitSoundPlayed) {
              const soundManager = this.characterManager.getSoundManager();
              if (soundManager) {
                const characterName = this.characterManager.getCharacterName();
                soundManager.playMeleeHit(characterName);
                hitSoundPlayed = true;
              }
            }
            
            // Apply immediate damage to remote player (server will sync)
            // Initialize health if not set (fallback to default values)
            if (!mesh.userData) {
              mesh.userData = {};
            }
            if (mesh.userData.health === undefined) {
              mesh.userData.health = 100; // Default health
            }
            if (mesh.userData.maxHealth === undefined) {
              mesh.userData.maxHealth = 100; // Default max health
            }
            
            // Apply damage
            mesh.userData.health = Math.max(0, mesh.userData.health - initialDamage);
            
            // Show damage number for melee initial hit on remote player
            if (this.damageNumberManager) {
              this.damageNumberManager.showDamage(initialDamage, mesh.position, 0xff8800);
            }
            
            // Apply knockback to remote player
            if (mesh.userData.health > 0 && distanceSq > 0.01) {
              const distance = Math.sqrt(distanceSq);
              const dirX = dx / distance;
              const dirZ = dz / distance;
              const distanceMultiplier = 1 - distance / radius;
              
              // Apply velocity to remote player
              remotePlayer.velocityX = dirX * horizontalVelocity * distanceMultiplier;
              remotePlayer.velocityZ = dirZ * horizontalVelocity * distanceMultiplier;
              
              // Initialize characterData if needed
              if (!mesh.userData.characterData) {
                mesh.userData.characterData = {};
              }
              mesh.userData.characterData.velocityY = verticalVelocity;
              mesh.userData.characterData.isKnockedBack = true;
              
              // Track who pushed this remote player (for arena fallout kills)
              this.pushedByTracker.set(`remote_${playerId}`, {
                pusherId: 'local',
                timestamp: performance.now()
              });
            }
            
            // Send updated health to server for sync
            this.multiplayerManager.sendPlayerDamage({
              damage: initialDamage,
              health: mesh.userData.health,
              maxHealth: mesh.userData.maxHealth
            });
            
            // Track this remote player as affected for poison effect (if not dead)
            if (mesh.userData.health > 0) {
              this.meleeAffectedEntities.add(`remote_${playerId}`);
            }
          }
        }
      }
    }
    
    // Damage will be applied over time during the animation duration
  }

  /**
   * Handle Herald's blast ability - blows all characters in radius far away
   * @param {THREE.Mesh} player - Player mesh
   * @private
   */
  _handleHeraldBlast(player) {
    // Vibration for blast
    if (this.vibrationManager) {
      this.vibrationManager.veryHeavy();
    }
    
    // Play blast sound
    const characterName = this.characterManager.getCharacterName();
    const soundManager = this.characterManager.getSoundManager();
    if (soundManager) {
      // Try to play custom blast sound, fallback to melee swing
      soundManager.playMeleeSwing(characterName);
    }
    
    // Get blast stats (Herald's ability)
    const blastStats = getBlastStats(characterName);
    if (!blastStats) return;
    
    const radius = blastStats.radius;
    const horizontalVelocity = blastStats.horizontalVelocity;
    const verticalVelocity = blastStats.verticalVelocity;
    const velocityDecay = blastStats.velocityDecay;
    const bounceRestitution = blastStats.bounceRestitution;
    const minBounceVelocity = blastStats.minBounceVelocity;
    const cooldown = blastStats.cooldown;
    const animationDuration = blastStats.animationDuration;
    
    // Set cooldown timer
    this.specialAbilityCooldownTimer = cooldown;
    
    // Create visual effect (expanding circle)
    const segments = 32;
    const geometry = new THREE.RingGeometry(0, radius, segments);
    const characterColor = this._getCharacterColorForParticles('herald');
    const material = new THREE.MeshBasicMaterial({
      color: characterColor,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    
    const circle = new THREE.Mesh(geometry, material);
    circle.rotation.x = -Math.PI / 2; // Lay flat on ground
    circle.position.set(player.position.x, player.position.y + 0.2, player.position.z);
    
    // Store reference to circle for animation
    this.blastCircle = circle;
    this.blastAnimationTime = animationDuration;
    this.blastAnimationDuration = animationDuration;
    
    // Add to scene
    this.sceneManager.getScene().add(circle);
    
    // Spawn particles
    if (this.characterManager.particleManager) {
      const playerPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
      this.characterManager.particleManager.spawnSwordSwingParticles(playerPos, characterColor, radius, animationDuration);
    }
    
    // Push all characters away
    const playerPos = player.position;
    const radiusSq = radius * radius; // Pre-calculate squared radius
    const minDistanceSq = 0.01; // 0.1^2 for minimum distance check
    
    // Blast bots away with velocity - optimized
    if (this.botManager) {
      const bots = this.botManager.getAllBots();
      for (let i = 0; i < bots.length; i++) {
        const bot = bots[i];
        const dx = bot.position.x - playerPos.x;
        const dz = bot.position.z - playerPos.z;
        const distanceSq = dx * dx + dz * dz;
        
        if (distanceSq <= radiusSq && distanceSq > minDistanceSq) {
          const distance = Math.sqrt(distanceSq); // Only calculate sqrt when needed
          // Normalize direction
          const dirX = dx / distance;
          const dirZ = dz / distance;
          
          // Calculate velocity based on distance (stronger when closer)
          const distanceMultiplier = 1 - distance / radius;
          const velX = dirX * horizontalVelocity * distanceMultiplier;
          const velZ = dirZ * horizontalVelocity * distanceMultiplier;
          
          // Apply horizontal velocity
          bot.userData.velocityX = velX;
          bot.userData.velocityZ = velZ;
          
          // Apply vertical velocity (launch up)
          bot.userData.velocityY = verticalVelocity;
          
          // Mark as knocked back for bounce physics
          bot.userData.isKnockedBack = true;
          
          // Track who pushed this bot (for arena fallout kills)
          const botId = bot.userData.id || `bot_${bot.uuid}`;
          this.pushedByTracker.set(botId, {
            pusherId: 'local',
            timestamp: performance.now()
          });
        }
      }
    }
    
    // Blast remote players away with velocity - optimized
    if (this.remotePlayerManager && this.multiplayerManager && this.multiplayerManager.isInRoom()) {
      const remotePlayers = this.remotePlayerManager.getRemotePlayers();
      for (const [playerId, remotePlayer] of remotePlayers) {
        const mesh = remotePlayer.mesh;
        if (!mesh) continue;
        
        const dx = mesh.position.x - playerPos.x;
        const dz = mesh.position.z - playerPos.z;
        const distanceSq = dx * dx + dz * dz;
        
        if (distanceSq <= radiusSq && distanceSq > minDistanceSq) {
          const distance = Math.sqrt(distanceSq); // Only calculate sqrt when needed
          // Normalize direction
          const dirX = dx / distance;
          const dirZ = dz / distance;
          
          // Calculate velocity based on distance (stronger when closer)
          const distanceMultiplier = 1 - distance / radius;
          const velX = dirX * horizontalVelocity * distanceMultiplier;
          const velZ = dirZ * horizontalVelocity * distanceMultiplier;
          
          // Apply horizontal velocity (store in remote player data)
          remotePlayer.velocityX = velX;
          remotePlayer.velocityZ = velZ;
          
          // Apply vertical velocity (launch up) - store in mesh userData if available
          if (mesh.userData) {
            if (!mesh.userData.characterData) {
              mesh.userData.characterData = {};
            }
            mesh.userData.characterData.velocityY = verticalVelocity;
            mesh.userData.characterData.isKnockedBack = true; // Mark as knocked back for bounce physics
          }
          
          // Track who pushed this remote player (for arena fallout kills)
          this.pushedByTracker.set(`remote_${playerId}`, {
            pusherId: 'local',
            timestamp: performance.now()
          });
        }
      }
    }
  }

  /**
   * Handle Lucy's multi-projectile ability - shoots multiple projectiles around her at character height
   * @param {THREE.Mesh} player - Player mesh
   * @private
   */
  _handleLucyMultiProjectile(player) {
    // Vibration for multi-projectile
    if (this.vibrationManager) {
      this.vibrationManager.heavy();
    }
    
    // Play multi-projectile sound
    const characterName = this.characterManager.getCharacterName();
    const soundManager = this.characterManager.getSoundManager();
    if (soundManager) {
      // Try to play custom sound, fallback to melee swing
      soundManager.playMeleeSwing(characterName);
    }
    
    // Get multi-projectile stats (Lucy's ability)
    const multiProjectileStats = getMultiProjectileStats(characterName);
    if (!multiProjectileStats) return;
    
    const projectileCount = multiProjectileStats.projectileCount;
    const damage = multiProjectileStats.damage;
    const cooldown = multiProjectileStats.cooldown;
    const animationDuration = multiProjectileStats.animationDuration;
    const projectileSpeed = multiProjectileStats.projectileSpeed;
    const spreadRadius = multiProjectileStats.spreadRadius;
    
    // Set cooldown timer
    this.specialAbilityCooldownTimer = cooldown;
    
    // Create visual effect (circle)
    const segments = 32;
    const geometry = new THREE.RingGeometry(spreadRadius * 0.8, spreadRadius, segments);
    const characterColor = this._getCharacterColorForParticles('lucy');
    const material = new THREE.MeshBasicMaterial({
      color: characterColor,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    
    const circle = new THREE.Mesh(geometry, material);
    circle.rotation.x = -Math.PI / 2; // Lay flat on ground
    circle.position.set(player.position.x, player.position.y + 0.2, player.position.z);
    
    // Store reference to circle for animation
    this.multiProjectileCircle = circle;
    this.multiProjectileAnimationTime = animationDuration;
    this.multiProjectileAnimationDuration = animationDuration;
    
    // Add to scene
    this.sceneManager.getScene().add(circle);
    
    // Spawn particles
    if (this.characterManager.particleManager) {
      const playerPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
      this.characterManager.particleManager.spawnSwordSwingParticles(playerPos, characterColor, spreadRadius, animationDuration);
    }
    
    // Shoot projectiles in all directions around character
    const playerPos = player.position;
    const playerHeight = playerPos.y;
    
    for (let i = 0; i < projectileCount; i++) {
      // Calculate angle for this projectile
      const angle = (i / projectileCount) * Math.PI * 2;
      
      // Calculate direction vector
      const directionX = Math.cos(angle);
      const directionZ = Math.sin(angle);
      
      // Spawn position slightly offset from character
      const offsetX = directionX * 0.5;
      const offsetZ = directionZ * 0.5;
      
      // Create projectile
      if (this.projectileManager) {
        const playerId = 'local';
        const projectile = this.projectileManager.createProjectile(
          playerPos.x + offsetX,
          playerHeight,
          playerPos.z + offsetZ,
          directionX,
          directionZ,
          playerId,
          'lucy'
        );
        
        // Override projectile speed if needed
        if (projectile && projectile.userData) {
          projectile.userData.customSpeed = projectileSpeed;
          // Set custom damage
          projectile.userData.damage = damage;
        }
      }
    }
  }

  /**
   * Set callback to update character UI when character changes via controller
   * @param {Function} callback - Callback function that takes characterName as parameter
   */
  setCharacterUIUpdateCallback(callback) {
    this.characterUIUpdateCallback = callback;
  }

  /**
   * Get character color for particles/effects
   * @param {string} characterName - Character name
   * @returns {number} Character color as hex number
   * @private
   */
  _getCharacterColorForParticles(characterName) {
    return getCharacterColor(characterName);
  }
}

