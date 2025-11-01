/**
 * GameLoop.js
 * 
 * Main game loop coordinator.
 * Handles game updates, rendering, and system coordination.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getCharacterColor, getMeleeStats } from '../projectile/CharacterStats.js';
import { setLastCharacter } from '../../utils/StorageUtils.js';

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
    
    // Sword swing animation tracking
    this.swordSwingAnimationTime = 0;
    this.swordSwingAnimationDuration = 0.5; // Default duration (will be updated per character)
    this.lastCharacterPositionForSwing = null; // Track character position for swing follow
    this.swordSwingCircle = null; // Reference to the sword swing circle visual effect
    
    // Callback to update character UI when character changes via controller
    this.characterUIUpdateCallback = null;
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
    }
    
    // Handle jump input
    if (canMove && this.inputManager.isJumpPressed()) {
      this.characterManager.jump();
    }
    
    // Handle double jump input
    if (canMove && this.inputManager.isDoubleJumpDetected()) {
      console.log('🎮 Double jump detected in GameLoop');
      this.characterManager.doubleJump();
    }
    
    // Update jump physics
    this.characterManager.updateJumpPhysics(dt, this.collisionManager);
    
    // Handle character swap (Y button)
    const characterSwapInput = this.inputManager.isCharacterSwapPressed();
    if (characterSwapInput && !this.lastCharacterSwapInput) {
      this._handleCharacterSwap();
    }
    this.lastCharacterSwapInput = characterSwapInput;
    
    // Handle sword swing (B button)
    const swordSwingInput = this.inputManager.isSwordSwingPressed();
    if (swordSwingInput && !this.lastSwordSwingInput) {
      this._handleSwordSwing(player);
    }
    this.lastSwordSwingInput = swordSwingInput;
    
    // Handle heal (X button - hold to heal)
    const healInput = this.inputManager.isHealPressed();
    if (healInput) {
      this._handleHeal(player, dt);
    }
    
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
    this.characterManager.updateAnimation(dt, this.inputManager.isRunning());

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
      
      // Clean up when animation ends
      if (this.swordSwingAnimationTime <= 0) {
        this.swordSwingAnimationTime = 0;
        
        // Remove and dispose of circle
        if (this.swordSwingCircle) {
          this.sceneManager.getScene().remove(this.swordSwingCircle);
          this.swordSwingCircle.geometry.dispose();
          this.swordSwingCircle.material.dispose();
          this.swordSwingCircle = null;
        }
      }
    }

    // Update magical particle animations
    this.sceneManager.updateParticles(dt);
    
    // Update blinking eyes animation
    this.sceneManager.updateBlinkingEyes(dt);

    // Camera follows player
    this.sceneManager.updateCamera(player.position, this.inputManager.isRunning());
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
    
    // Handle shooting input (left mouse click) - auto-fire on hold
    const shootInput = this.inputManager.isShootPressed();
    if (shootInput) {
      this._handleShootingInput(player);
    }
    this.lastShootInput = shootInput;
    
    // Handle mortar input (right mouse click)
    const mortarInput = this.inputManager.isMortarPressed();
    if (mortarInput && !this.lastMortarInput) {
      this._handleMortarInput(player);
    }
    this.lastMortarInput = mortarInput;
    
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
    
    // Check if right joystick is active for aiming (preferred for smooth 360-degree aiming)
    const rightJoystickDir = this.inputManager.getRightJoystickDirection();
    const isRightJoystickActive = this.inputManager.isRightJoystickDirectionActive();
    
    // Check if left joystick is active for projectile direction (alternative control)
    const leftJoystickDir = this.inputManager.getProjectileDirection();
    const isLeftJoystickActive = this.inputManager.isProjectileDirectionActive();
    
    let directionX, directionZ, targetX, targetZ;
    
    // Prioritize right joystick for aiming (smooth 360-degree aiming in world space)
    if (isRightJoystickActive && (rightJoystickDir.x !== 0 || rightJoystickDir.z !== 0)) {
      // Use camera-relative direction: convert joystick input to world space using camera orientation
      // This matches how mouse aiming works and accounts for camera angle
      const camera = this.sceneManager.getCamera();
      
      // Get camera forward and right vectors (in world space)
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
    } else if (isLeftJoystickActive && (leftJoystickDir.x !== 0 || leftJoystickDir.z !== 0)) {
      // Fallback to left joystick direction for projectile control
      // leftJoystickDir is already normalized, so use it directly
      directionX = leftJoystickDir.x;
      directionZ = leftJoystickDir.z;
      
      // Calculate target point in the direction of the joystick (for cursor following)
      const targetDistance = 10; // Distance ahead to aim
      targetX = playerPos.x + directionX * targetDistance;
      targetZ = playerPos.z + directionZ * targetDistance;
    } else {
      // Fallback: Use character facing direction when right joystick is not active
      const lastFacing = this.characterManager.getLastFacing();
      const camera = this.sceneManager.getCamera();
      
      // Get camera forward direction in world space
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
      
      // Calculate target point in the direction of character facing
      const targetDistance = 10; // Distance ahead to aim
      targetX = playerPos.x + directionX * targetDistance;
      targetZ = playerPos.z + directionZ * targetDistance;
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
    
    let targetX, targetZ;
    
    // Check if right joystick is active for aiming (preferred for smooth 360-degree aiming)
    const rightJoystickDir = this.inputManager.getRightJoystickDirection();
    const isRightJoystickActive = this.inputManager.isRightJoystickDirectionActive();
    
    // Check if left joystick is active for projectile direction (alternative control)
    const leftJoystickDir = this.inputManager.getProjectileDirection();
    const isLeftJoystickActive = this.inputManager.isProjectileDirectionActive();
    
    // Prioritize right joystick for aiming (smooth 360-degree aiming in world space)
    if (isRightJoystickActive && (rightJoystickDir.x !== 0 || rightJoystickDir.z !== 0)) {
      // Use camera-relative direction: convert joystick input to world space using camera orientation
      // This matches how mouse aiming works and accounts for camera angle
      const camera = this.sceneManager.getCamera();
      
      // Get camera forward and right vectors (in world space)
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
      const maxDistance = 10; // Maximum mortar distance
      
      // Scale distance based on magnitude (center = 0, max push = maxDistance)
      const deadZoneMagnitude = this.inputManager.gamepadDeadZone;
      const normalizedMagnitude = Math.max(0, Math.min(1, (magnitude - deadZoneMagnitude) / (1 - deadZoneMagnitude)));
      const targetDistance = normalizedMagnitude * maxDistance;
      
      // Calculate target point in the direction of the joystick
      // If joystick is centered (distance = 0), target will be at character position
      targetX = playerPos.x + directionX * targetDistance;
      targetZ = playerPos.z + directionZ * targetDistance;
    } else if (isLeftJoystickActive && (leftJoystickDir.x !== 0 || leftJoystickDir.z !== 0)) {
      // Fallback to left joystick direction for mortar target
      // leftJoystickDir is already normalized, so use it directly
      const targetDistance = 10; // Distance ahead to aim mortar
      targetX = playerPos.x + leftJoystickDir.x * targetDistance;
      targetZ = playerPos.z + leftJoystickDir.z * targetDistance;
    } else {
      // Fallback: Use character facing direction when right joystick is not active
      const lastFacing = this.characterManager.getLastFacing();
      const camera = this.sceneManager.getCamera();
      
      // Get camera forward direction in world space
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      
      // Project camera direction onto ground plane (XZ plane)
      const cameraForward = new THREE.Vector3(cameraDir.x, 0, cameraDir.z).normalize();
      
      // Shoot in the direction the character is looking
      // If character is facing 'back' (towards camera, negative Z), shoot backward (towards camera)
      // If character is facing 'front' (away from camera, positive Z), shoot forward (away from camera)
      let directionX, directionZ;
      if (lastFacing === 'back') {
        // Shoot in back direction (same as camera forward, which is negative Z relative to camera)
        directionX = cameraForward.x;
        directionZ = cameraForward.z;
      } else {
        // Shoot in front direction (opposite of camera forward, which is positive Z relative to camera)
        directionX = -cameraForward.x;
        directionZ = -cameraForward.z;
      }
      
      // Calculate target point in the direction of character facing
      const targetDistance = 10; // Distance ahead to aim mortar
      targetX = playerPos.x + directionX * targetDistance;
      targetZ = playerPos.z + directionZ * targetDistance;
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
          if (botDied) {
            setTimeout(() => {
              this.botManager.respawnBot(bot);
            }, 2000);
          }
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
          
          if (botDied) {
            setTimeout(() => {
              this.botManager.respawnBot(bot);
            }, 2000);
          }
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
        // Player died - respawn
        if (this.gameModeManager && this.gameModeManager.modeState) {
          this.gameModeManager.modeState.deaths++;
        }
        const currentMode = this.gameModeManager ? this.gameModeManager.getMode() : null;
        this.characterManager.respawn(currentMode, this.collisionManager);
        
        // Update userData after respawn
        if (player && player.userData) {
          player.userData.health = this.characterManager.getHealth();
          player.userData.maxHealth = this.characterManager.getMaxHealth();
        }
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
    if (canMove) {
      // Calculate intended next position on XZ plane
      const currentSpeed = this.inputManager.getCurrentSpeed();
      const velocity = new THREE.Vector3(input.x, 0, -input.y).multiplyScalar(currentSpeed * dt);
      const nextPos = player.position.clone().add(velocity);

      // Collision check against walls only
      if (!this.collisionManager.willCollide(nextPos, this.characterManager.getPlayerSize())) {
        player.position.x = nextPos.x;
        player.position.z = nextPos.z;
      }

      // Update character movement and animation
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
      console.log(`🔄 Swapped to ${newChar}`);
      
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
   * @param {THREE.Mesh} player - Player mesh
   * @param {number} dt - Delta time
   * @private
   */
  _handleHeal(player, dt) {
    // Heal slowly over time while held
    const healRate = 5; // HP per second
    const newHealth = Math.min(
      this.characterManager.getHealth() + healRate * dt,
      this.characterManager.getMaxHealth()
    );
    
    if (newHealth > this.characterManager.getHealth()) {
      this.characterManager.setHealth(newHealth);
      
      // Add healing particles with character color
      if (this.characterManager.particleManager) {
        const characterName = this.characterManager.getCharacterName();
        const characterColor = this._getCharacterColorForParticles(characterName);
        // Spawn healing particles with character color around character
        for (let i = 0; i < 5; i++) {
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
   * Handle sword swing input (B button)
   * @param {THREE.Mesh} player - Player mesh
   * @private
   */
  _handleSwordSwing(player) {
    console.log('⚔️ Sword swing!');
    
    // Get character-specific melee stats
    const characterName = this.characterManager.getCharacterName();
    const meleeStats = getMeleeStats(characterName);
    const radius = meleeStats.range;
    const swordDamage = meleeStats.damage;
    const animationDuration = meleeStats.animationDuration;
    
    // Update animation duration based on character
    this.swordSwingAnimationDuration = animationDuration;
    
    // Create 360 degree damage circle visual effect
    const segments = 32;
    const geometry = new THREE.RingGeometry(radius - 0.1, radius, segments);
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
    if (this.characterManager.particleManager) {
      const playerPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
      this.characterManager.particleManager.spawnSwordSwingParticles(playerPos, characterColor, radius);
    }
    
    // Start sword swing animation tracking
    this.swordSwingAnimationTime = animationDuration;
    
    // Add damage to nearby entities (bots, remote players)
    const playerPos = player.position;
    
    // Damage bots in range
    if (this.botManager) {
      this.botManager.getAllBots().forEach(bot => {
        const distance = Math.sqrt(
          Math.pow(bot.position.x - playerPos.x, 2) + 
          Math.pow(bot.position.z - playerPos.z, 2)
        );
        if (distance <= radius) {
          const botDied = this.botManager.damageBot(bot, swordDamage);
          if (botDied) {
            setTimeout(() => {
              this.botManager.respawnBot(bot);
            }, 2000);
          }
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
          // Apply damage to remote player (server will sync)
          if (mesh.userData && mesh.userData.health !== undefined) {
            mesh.userData.health = Math.max(0, mesh.userData.health - swordDamage);
            
            // Send updated health to server for sync
            this.multiplayerManager.sendPlayerDamage({
              damage: swordDamage,
              health: mesh.userData.health,
              maxHealth: mesh.userData.maxHealth || 100
            });
          }
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

