/**
 * GameLoop.js
 * 
 * Main game loop coordinator.
 * Handles game updates, rendering, and system coordination.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getCharacterColor, getMeleeStats, getMortarStats } from '../projectile/CharacterStats.js';
import { setLastCharacter } from '../../utils/StorageUtils.js';
import { createMortarArcPreview, updateMortarArcPreview, removeMortarArcPreview } from '../projectile/MortarArcPreview.js';

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
   */
  constructor(sceneManager, characterManager, inputManager, collisionManager, gameModeManager, entityManager, projectileManager = null, botManager = null, healthBarManager = null, multiplayerManager = null, remotePlayerManager = null) {
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
    
    this.lastTime = performance.now();
    this.isRunning = false;
    this.lastShootInput = false;
    this.lastMortarInput = false;
    this.lastCharacterSwapInput = false;
    this.lastSwordSwingInput = false;
    this.lastHealInput = false;
    
    // Healing hold duration tracking
    this.healHoldDuration = 0; // Time in seconds that heal button has been held
    
    // Sword swing animation tracking
    this.swordSwingAnimationTime = 0;
    this.swordSwingAnimationDuration = 0.5; // Default duration (will be updated per character)
    this.lastCharacterPositionForSwing = null; // Track character position for swing follow
    this.swordSwingCircle = null; // Reference to the sword swing circle visual effect
    this.meleeDamageTickTimer = 0; // Timer for damage over time ticks
    this.meleeAffectedEntities = new Set(); // Track entities in range for damage over time
    this.meleeDamagePerTick = null; // Damage per tick (set during attack)
    this.meleeTickInterval = null; // Tick interval (set during attack)
    this.meleeRange = null; // Attack range (set during attack)
    this.meleeCooldownTimer = 0; // Cooldown timer for melee attacks
    this.meleePoisonDamage = null; // Poison damage per tick (set during attack)
    this.meleePoisonTickInterval = null; // Poison tick interval (set during attack)
    this.meleePoisonDuration = null; // Poison duration (set during attack)
    this.poisonedEntities = new Map(); // Track poisoned entities: Map<entity, {timeLeft, tickTimer, damage, tickInterval}>
    
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
    this.mortarReleaseCooldown = 0; // Cooldown timer after releasing mortar (prevents immediate firebolt)
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
   * Main game loop tick
   */
  tick() {
    if (!this.isRunning) return;
    
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.033);
    this.lastTime = now;

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
    
    // Handle shooting mode
    if (mode === 'shooting' && this.projectileManager) {
      // Set up cursor tracking for projectiles (update player position each frame)
      if (player) {
        const playerPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
        this.projectileManager.setCursorTracking(
          this.sceneManager.getCamera(),
          this.inputManager,
          playerPos
        );
      }
      this._handleShootingMode(dt, player);
    } else {
      // Clean up arc preview when not in shooting mode
      if (this.mortarArcPreview) {
        removeMortarArcPreview(this.mortarArcPreview, this.sceneManager.getScene());
        this.mortarArcPreview = null;
      }
      // Clean up mortar hold visual when not in shooting mode
      if (this.mortarHoldVisual) {
        this._removeMortarHoldVisual();
      }
      // Reset mortar hold state
      if (this.mortarHoldActive) {
        this.mortarHoldActive = false;
        this.inputManager.setMortarHoldActive(false);
      }
    }
    
    // Handle jump input
    if (canMove && this.inputManager.isJumpPressed()) {
      this.characterManager.jump();
    }
    
    // Handle double jump input
    if (canMove && this.inputManager.isDoubleJumpDetected()) {
      this.characterManager.doubleJump();
    }
    
    // Update jump physics
    const isLevitating = this.inputManager.isLevitatePressed();
    this.characterManager.updateJumpPhysics(dt, this.collisionManager, isLevitating);
    
    // Handle character swap (Y button)
    const characterSwapInput = this.inputManager.isCharacterSwapPressed();
    if (characterSwapInput && !this.lastCharacterSwapInput) {
      this._handleCharacterSwap();
    }
    this.lastCharacterSwapInput = characterSwapInput;
    
    // Handle sword swing (B button)
    const swordSwingInput = this.inputManager.isSwordSwingPressed();
    if (swordSwingInput && !this.lastSwordSwingInput) {
      // Check cooldown before allowing attack
      if (this.meleeCooldownTimer <= 0) {
        this._handleSwordSwing(player);
      }
    }
    this.lastSwordSwingInput = swordSwingInput;
    
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
    }
    
    // Handle heal (X button - hold to heal)
    const healInput = this.inputManager.isHealPressed();
    
    // Track heal button press/release to reset hold duration
    if (healInput && !this.lastHealInput) {
      // Just pressed - reset hold duration
      this.healHoldDuration = 0;
    } else if (!healInput && this.lastHealInput) {
      // Just released - reset hold duration
      this.healHoldDuration = 0;
    }
    
    if (healInput) {
      // Increase hold duration while held
      this.healHoldDuration += dt;
      this._handleHeal(player, dt);
    }
    
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
      // Reset overlay immediately before respawning
      this.collisionManager.resetRespawn();
      const currentMode = this.gameModeManager ? this.gameModeManager.getMode() : null;
      this.characterManager.respawn(currentMode, this.collisionManager);
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
      this.characterManager.respawn(currentMode, this.collisionManager);
      
      // Update userData after respawn
      const player = this.characterManager.getPlayer();
      if (player && player.userData) {
        player.userData.health = this.characterManager.getHealth();
        player.userData.maxHealth = this.characterManager.getMaxHealth();
      }
    }
    
    // Update smoke particles
    if (this.characterManager.particleManager) {
      this.characterManager.particleManager.update(dt);
      // Billboard smoke particles to camera
      this.characterManager.particleManager.billboardToCamera(
        this.sceneManager.getCamera()
      );
      
      // Update sword swing particles to follow character during animation
      if (this.swordSwingAnimationTime > 0 && player) {
        const currentPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
        if (this.lastCharacterPositionForSwing) {
          this.characterManager.particleManager.updateSwordSwingParticles(
            currentPos,
            this.lastCharacterPositionForSwing
          );
        }
        this.lastCharacterPositionForSwing = currentPos.clone();
      } else if (this.swordSwingAnimationTime <= 0) {
        this.lastCharacterPositionForSwing = null;
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
          const damagePerTick = this.meleeDamagePerTick;
          
          // Damage bots in range
          if (this.botManager) {
            this.botManager.getAllBots().forEach(bot => {
              const distance = Math.sqrt(
                Math.pow(bot.position.x - playerPos.x, 2) + 
                Math.pow(bot.position.z - playerPos.z, 2)
              );
              if (distance <= radius) {
                // Check line of sight - don't damage through walls
                // Use attack radius for more accurate circle-based checking
                const startPos = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z);
                const targetPos = new THREE.Vector3(bot.position.x, bot.position.y, bot.position.z);
                const sightCheck = this._hasLineOfSight(startPos, targetPos, radius, 0.3);
                
                if (!sightCheck.clear) {
                  // Wall is blocking - remove from tracking and skip damage
                  this.meleeAffectedEntities.delete(bot);
                  return; // Skip this bot
                }
                
                // Track this bot as affected
                this.meleeAffectedEntities.add(bot);
                
                // Apply damage per tick
                const botDied = this.botManager.damageBot(bot, damagePerTick);
                if (botDied) {
                  this.meleeAffectedEntities.delete(bot);
                  // Don't respawn immediately - death fade will handle it
                }
              } else {
                // Remove from tracking if out of range
                this.meleeAffectedEntities.delete(bot);
              }
            });
          }
          
          // Damage remote players in multiplayer mode
          if (this.remotePlayerManager && this.multiplayerManager && this.multiplayerManager.isInRoom()) {
            const remotePlayers = this.remotePlayerManager.getRemotePlayers();
            for (const [playerId, remotePlayer] of remotePlayers) {
              const mesh = remotePlayer.mesh;
              if (!mesh) continue;
              
              const distance = Math.sqrt(
                Math.pow(mesh.position.x - playerPos.x, 2) + 
                Math.pow(mesh.position.z - playerPos.z, 2)
              );
              if (distance <= radius) {
                // Check line of sight - don't damage through walls
                // Use attack radius for more accurate circle-based checking
                const startPos = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z);
                const targetPos = new THREE.Vector3(mesh.position.x, mesh.position.y, mesh.position.z);
                const sightCheck = this._hasLineOfSight(startPos, targetPos, radius, 0.3);
                
                if (!sightCheck.clear) {
                  // Wall is blocking - remove from tracking and skip damage
                  this.meleeAffectedEntities.delete(`remote_${playerId}`);
                  continue; // Skip this remote player
                }
                
                // Track this remote player as affected
                this.meleeAffectedEntities.add(`remote_${playerId}`);
                
                // Apply damage per tick to remote player (server will sync)
                if (mesh.userData && mesh.userData.health !== undefined) {
                  mesh.userData.health = Math.max(0, mesh.userData.health - damagePerTick);
                  
                  // Send updated health to server for sync
                  this.multiplayerManager.sendPlayerDamage({
                    damage: damagePerTick,
                    health: mesh.userData.health,
                    maxHealth: mesh.userData.maxHealth || 100
                  });
                }
              } else {
                // Remove from tracking if out of range
                this.meleeAffectedEntities.delete(`remote_${playerId}`);
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
                  type: 'bot'
                });
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
                    type: 'remote',
                    playerId: playerId
                  });
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
        
        // Remove and dispose of circle
        if (this.swordSwingCircle) {
          this.sceneManager.getScene().remove(this.swordSwingCircle);
          this.swordSwingCircle.geometry.dispose();
          this.swordSwingCircle.material.dispose();
          this.swordSwingCircle = null;
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
            const botDied = this.botManager.damageBot(entity, poisonData.damage);
            if (botDied) {
              entitiesToRemove.push(entity);
              // Don't respawn immediately - death fade will handle it
            }
          } else if (poisonData.type === 'remote' && this.remotePlayerManager && this.multiplayerManager) {
            const mesh = entity;
            if (mesh.userData && mesh.userData.health !== undefined) {
              mesh.userData.health = Math.max(0, mesh.userData.health - poisonData.damage);
              
              // Send updated health to server for sync
              this.multiplayerManager.sendPlayerDamage({
                damage: poisonData.damage,
                health: mesh.userData.health,
                maxHealth: mesh.userData.maxHealth || 100
              });
              
              // Remove if dead
              if (mesh.userData.health <= 0) {
                entitiesToRemove.push(entity);
              }
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
   * Handle shooting mode updates
   * @param {number} dt - Delta time
   * @param {THREE.Mesh} player - Player mesh
   * @private
   */
  _handleShootingMode(dt, player) {
    // Update projectiles
    this.projectileManager.update(dt);
    
    // Update mortar release cooldown timer
    if (this.mortarReleaseCooldown > 0) {
      this.mortarReleaseCooldown -= dt;
      if (this.mortarReleaseCooldown < 0) {
        this.mortarReleaseCooldown = 0;
      }
    }
    
    // Handle shooting input (left mouse click / RT) - auto-fire on hold
    // Don't allow shooting when mortar hold is active (RT is used for mortar release)
    // Also prevent shooting immediately after releasing mortar (cooldown period)
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
    
    // Handle mortar hold system (RB hold, LT preview, RT release)
    this._handleMortarHoldSystem(player, dt);
    
    // Legacy mortar input (right mouse click) - only if not using gamepad hold system
    if (!this.mortarHoldActive) {
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
    
    // Update bots
    if (this.botManager) {
      this.botManager.update(dt, player.position, this.sceneManager.getCamera());
    }
    
    // Update health bars (only in shooting mode)
    if (this.healthBarManager) {
      const currentMode = this.gameModeManager ? this.gameModeManager.getMode() : 'free-play';
      if (currentMode === 'shooting') {
        this.healthBarManager.update(dt);
      }
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
      
      // Calculate direction from player to mouse cursor position
      const toCursorX = intersect.x - playerPos.x;
      const toCursorZ = intersect.z - playerPos.z;
      const toCursorLength = Math.sqrt(toCursorX * toCursorX + toCursorZ * toCursorZ);
      
      if (toCursorLength > 0.01) {
        // Normalize direction
        directionX = toCursorX / toCursorLength;
        directionZ = toCursorZ / toCursorLength;
        
        // Set target for cursor following
        targetX = intersect.x;
        targetZ = intersect.z;
      } else {
        // Fallback to character facing direction if cursor is too close
        const lastFacing = this.characterManager.getLastFacing();
        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        const cameraForward = new THREE.Vector3(cameraDir.x, 0, cameraDir.z).normalize();
        
        if (lastFacing === 'back') {
          directionX = cameraForward.x;
          directionZ = cameraForward.z;
        } else {
          directionX = -cameraForward.x;
          directionZ = -cameraForward.z;
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
        // This matches how mouse aiming works and accounts for camera angle
        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        
        // Create a right vector perpendicular to camera direction (in XZ plane)
        const cameraRight = new THREE.Vector3();
        cameraRight.crossVectors(cameraDir, new THREE.Vector3(0, 1, 0)).normalize();
        
        // Create a forward vector in XZ plane (project camera direction onto ground)
        const cameraForward = new THREE.Vector3(cameraDir.x, 0, cameraDir.z).normalize();
        
        // Map joystick input to camera-relative direction
        // Right stick X = right/left relative to camera view
        // Right stick Z (from joystick Y) = up/down relative to camera view
        // Note: Invert Z because gamepad Y is negative when pushed up
        directionX = (cameraRight.x * rightJoystickDir.x) + (cameraForward.x * -rightJoystickDir.z);
        directionZ = (cameraRight.z * rightJoystickDir.x) + (cameraForward.z * -rightJoystickDir.z);
        
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
        // Use character facing direction when right joystick is not active
        const lastFacing = this.characterManager.getLastFacing();
        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        
        // Project camera direction onto ground plane (XZ plane)
        const cameraForward = new THREE.Vector3(cameraDir.x, 0, cameraDir.z).normalize();
        
        // Shoot in the direction the character is looking
        // If character is facing 'back' (towards camera, negative Z), shoot backward (towards camera)
        // If character is facing 'front' (away from camera, positive Z), shoot forward (away from camera)
        if (lastFacing === 'back') {
          // Shoot in back direction (same as camera forward, which is negative Z relative to camera)
          directionX = cameraForward.x;
          directionZ = cameraForward.z;
        } else {
          // Shoot in front direction (opposite of camera forward, which is positive Z relative to camera)
          directionX = -cameraForward.x;
          directionZ = -cameraForward.z;
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
    
    // Send projectile to other players via multiplayer
    if (projectile && this.multiplayerManager && this.multiplayerManager.isInRoom()) {
      this.multiplayerManager.sendProjectileCreate({
        projectileType: 'firebolt',
        startX: playerPos.x,
        startY: playerPos.y,
        startZ: playerPos.z,
        directionX: directionX,
        directionZ: directionZ,
        characterName: characterName,
        targetX: targetX,
        targetZ: targetZ
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
      const visual = this.mortarHoldVisual.children[0];
      if (visual && visual.userData.cooldownRing) {
        this._updateCooldownRing(dt, isOnCooldown, cooldownInfo.percentage);
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
        // Set cooldown to prevent immediate firebolt shooting (0.3 seconds)
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
    
    // Create main glowing orb/sphere effect with reflection and glow (like fireball/firebolt)
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
    
    // Add glow effect with point light (like fireball/firebolt)
    const lightIntensity = isHerald ? 2.0 : 1.2;
    const lightRange = isHerald ? 5 : 3;
    const glowLight = new THREE.PointLight(characterColor, lightIntensity, lightRange);
    glowLight.position.set(0, 0, 0); // Position relative to visualGroup
    
    // Create cooldown ring indicator (torus ring around the sphere)
    const ringGeometry = new THREE.TorusGeometry(0.4, 0.03, 8, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00, // Fireball orange color
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
      // On cooldown: fireball orange color, slower pulse, growing opacity
      const fireballOrange = 0xffaa00; // Same as fireball color
      const darkOrange = 0xcc8800; // Darker shade for pulsing
      
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
      
      // Pulse between orange and dark orange (smaller pulse during cooldown)
      pulseData.pulsePhase += dt * pulseData.pulseSpeedCooldown * Math.PI * 2;
      const pulseVariation = Math.sin(pulseData.pulsePhase) * 0.1; // Smaller pulse variation
      const pulseScale = growthScale + pulseVariation;
      visual.scale.set(pulseScale, pulseScale, pulseScale);
      
      // Color transition between orange shades
      const colorMix = (Math.sin(pulseData.pulsePhase) + 1) * 0.5;
      const currentColor = new THREE.Color().lerpColors(
        new THREE.Color(darkOrange),
        new THREE.Color(fireballOrange),
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
      
      // Update ring color based on cooldown progress (orange -> brighter orange as it charges)
      const progress = 1 - cooldownPercentage; // Invert so 0 = just started, 1 = almost ready
      const fireballOrange = 0xffaa00; // Fireball orange color
      const brightOrange = 0xffcc44; // Brighter orange/yellow
      
      // Lerp from fireball orange to bright orange as cooldown progresses
      const ringColor = new THREE.Color().lerpColors(
        new THREE.Color(fireballOrange),
        new THREE.Color(brightOrange),
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
      this._applyDamageToPlayer(projectileCollision.damage, player);
      
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
      this._applyDamageToPlayer(mortarCollision.damage, player);
      
      // Note: Splash will be created at target location when mortar hits ground
      // No need to create splash here - mortar continues to target
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
          const botDied = this.botManager.damageBot(bot, botCollision.damage);
          // Don't respawn immediately - death fade will handle it
        }
        
        // Check mortar ground explosions for bots
        const botMortarCollision = this.projectileManager.checkMortarGroundCollision(
          bot.position,
          this.characterManager.getPlayerSize(),
          bot.userData.id
        );
        
        if (botMortarCollision.hit) {
          const botDied = this.botManager.damageBot(bot, botMortarCollision.damage);
          
          // If direct hit at ground level, create splash immediately
          if (botMortarCollision.needsSplash && botMortarCollision.projectile) {
            this.projectileManager.createFireSplash(
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
   * @private
   */
  _applyDamageToPlayer(damage, player) {
    if (this.characterManager) {
      const isDead = this.characterManager.takeDamage(damage);
      const currentHealth = this.characterManager.getHealth();
      const maxHealth = this.characterManager.getMaxHealth();
      
      // Update player userData for health bar
      if (player && player.userData) {
        player.userData.health = currentHealth;
        player.userData.maxHealth = maxHealth;
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
          this.characterManager.playDeathAnimation();
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
    
    // Movement is allowed while holding mortar spell (can move and aim)
    if (canMove) {
      const currentSpeed = this.inputManager.getCurrentSpeed();
      const velocity = new THREE.Vector3(input.x, 0, -input.y).multiplyScalar(currentSpeed * dt);
      const nextPos = player.position.clone().add(velocity);

      // Collision check against walls only
      if (!this.collisionManager.willCollide(nextPos, this.characterManager.getPlayerSize())) {
        player.position.x = nextPos.x;
        player.position.z = nextPos.z;
      }

      // Update character movement and animation
      // isRunning() already checks mortarHoldActive internally, so we can use it directly
      const isRunning = this.inputManager.isRunning();
      this.characterManager.updateMovement(input, velocity, this.sceneManager.getCamera(), isRunning);
      this.characterManager.updateSmokeSpawnTimer(dt);
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
    const currentChar = this.characterManager.getCharacterName();
    const newChar = currentChar === 'lucy' ? 'herald' : 'lucy';
    
    // Trigger fast smoke particle burst
    const player = this.characterManager.getPlayer();
    if (player && this.characterManager.particleManager) {
      // Spawn lots of smoke particles quickly
      for (let i = 0; i < 20; i++) {
        setTimeout(() => {
          const pos = new THREE.Vector3(
            player.position.x + (Math.random() - 0.5) * 0.5,
            player.position.y,
            player.position.z + (Math.random() - 0.5) * 0.5
          );
          this.characterManager.particleManager.spawnSmokeParticle(pos);
        }, i * 10); // Spread over 200ms
      }
    }
    
    // Load the new character
    this.characterManager.loadCharacter(newChar).then(() => {
      // Save to localStorage when character changes
      setLastCharacter(newChar);
      
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
    });
  }

  /**
   * Handle heal input (X button - hold to heal)
   * Healing increases per X milliseconds you hold it in one hold. Resets when released.
   * @param {THREE.Mesh} player - Player mesh
   * @param {number} dt - Delta time
   * @private
   */
  _handleHeal(player, dt) {
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
      this.characterManager.setHealth(newHealth);
      
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
   * Optimized with adaptive sampling and circle area checking
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
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance < 0.1) return { clear: true, blockagePercentage: 0 }; // Very close, assume clear
    
    // Use attack radius if provided, otherwise use a default check radius
    const checkRadius = attackRadius || 0.3;
    
    // Adaptive sampling: more samples for longer distances and larger attack radius
    // Base samples: 8, add more for distance and radius
    const baseSamples = 8;
    const distanceSamples = Math.ceil(distance / 2); // +1 sample per 2 units
    const radiusSamples = Math.ceil(checkRadius * 4); // More samples for larger radius
    const totalSamples = Math.min(baseSamples + distanceSamples + radiusSamples, 20); // Cap at 20
    
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
      
      const checkPos = new THREE.Vector3(checkX, checkY, checkZ);
      
      // Check if this point (with circle radius) collides with walls
      // Use checkRadius * 2 to match the collision manager's expected size parameter
      if (this.collisionManager.willCollide(checkPos, checkRadius * 2)) {
        blockedSamples++;
        
        // Track first blocked point for early optimization
        if (firstBlockedDistance === null) {
          firstBlockedDistance = distance * t;
        }
        
        // Early exit optimization: if significant blockage found early, return immediately
        // This prevents checking further when we already know it's blocked
        const currentBlockage = blockedSamples / i;
        if (currentBlockage > blockageThreshold && i >= Math.min(4, totalSamples / 2)) {
          // If more than threshold is blocked and we've checked at least 4 points or half the path
          return { 
            clear: false, 
            blockagePercentage: currentBlockage,
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
    // Get character-specific melee stats
    const characterName = this.characterManager.getCharacterName();
    const meleeStats = getMeleeStats(characterName);
    const radius = meleeStats.range;
    const damagePerTick = meleeStats.damage;
    const tickInterval = meleeStats.tickInterval;
    const animationDuration = meleeStats.animationDuration;
    const cooldown = meleeStats.cooldown;
    const poisonDamage = meleeStats.poisonDamage;
    const poisonTickInterval = meleeStats.poisonTickInterval;
    const poisonDuration = meleeStats.poisonDuration;
    
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
    this.meleeDamagePerTick = damagePerTick;
    this.meleeTickInterval = tickInterval;
    this.meleeRange = radius;
    this.meleePoisonDamage = poisonDamage;
    this.meleePoisonTickInterval = poisonTickInterval;
    this.meleePoisonDuration = poisonDuration;
    
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
    
    // Start sword swing animation tracking
    this.swordSwingAnimationTime = animationDuration;
    this.meleeDamageTickTimer = 0; // Reset damage tick timer
    
    // Clear previous affected entities - will be populated as damage is applied over time
    this.meleeAffectedEntities.clear();
    
    // Damage will be applied over time during the animation duration
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

