/**
 * GameLoop.js
 * 
 * Main game loop coordinator.
 * Handles game updates, rendering, and system coordination.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

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
      this._handleShootingMode(dt, player);
    }
    
    // Handle jump input
    if (canMove && this.inputManager.isJumpPressed()) {
      this.characterManager.jump();
    }
    
    // Update jump physics
    this.characterManager.updateJumpPhysics(dt, this.collisionManager);
    
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
      this.characterManager.respawn();
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
    
    // Handle shooting input (left mouse click)
    const shootInput = this.inputManager.isShootPressed();
    if (shootInput && !this.lastShootInput) {
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
    const camera = this.sceneManager.getCamera();
    const mousePos = this.inputManager.getMousePosition();
    
    // Convert mouse to world coordinates on ground plane
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    mouse.x = (mousePos.x / window.innerWidth) * 2 - 1;
    mouse.y = -(mousePos.y / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Intersect with ground plane at y = 0
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersect);
    
    // Calculate direction from player to intersect point
    const playerPos = player.position;
    const directionX = intersect.x - playerPos.x;
    const directionZ = intersect.z - playerPos.z;
    
    // Get current character name for projectile stats
    const characterName = this.characterManager.getCharacterName();
    const playerId = 'local';
    
    // Check if player can shoot (based on character-specific cooldown)
    if (!this.projectileManager.canShoot(playerId)) {
      return;
    }
    
    // If no valid direction (too close to player), shoot forward
    const dirLength = Math.sqrt(directionX * directionX + directionZ * directionZ);
    if (dirLength < 0.1) {
      // Shoot in camera forward direction
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      const projectile = this.projectileManager.createProjectile(
        playerPos.x,
        playerPos.y,
        playerPos.z,
        cameraDir.x,
        cameraDir.z,
        playerId,
        characterName
      );
      
      // Send projectile to other players via multiplayer
      if (projectile && this.multiplayerManager && this.multiplayerManager.isInRoom()) {
        this.multiplayerManager.sendProjectileCreate({
          projectileType: 'firebolt',
          startX: playerPos.x,
          startY: playerPos.y,
          startZ: playerPos.z,
          directionX: cameraDir.x,
          directionZ: cameraDir.z,
          characterName: characterName
        });
      }
    } else {
      const projectile = this.projectileManager.createProjectile(
        playerPos.x,
        playerPos.y,
        playerPos.z,
        directionX,
        directionZ,
        playerId,
        characterName
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
          characterName: characterName
        });
      }
    }
  }

  /**
   * Handle mortar input
   * @param {THREE.Mesh} player - Player mesh
   * @private
   */
  _handleMortarInput(player) {
    const camera = this.sceneManager.getCamera();
    const mousePos = this.inputManager.getMousePosition();
    
    // Convert mouse to world coordinates on ground plane
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    mouse.x = (mousePos.x / window.innerWidth) * 2 - 1;
    mouse.y = -(mousePos.y / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Intersect with ground plane to get target position
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersect);
    
    const playerPos = player.position;
    const characterName = this.characterManager.getCharacterName();
    const playerId = 'local';
    
    // Check if player can shoot mortar
    if (this.projectileManager.canShootMortar(playerId)) {
      const mortar = this.projectileManager.createMortar(
        playerPos.x,
        playerPos.y,
        playerPos.z,
        intersect.x,
        intersect.z,
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
          targetX: intersect.x,
          targetZ: intersect.z,
          characterName: characterName
        });
      }
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
        this.characterManager.respawn();
        
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
}

