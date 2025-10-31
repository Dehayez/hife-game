import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

export class GameLoop {
  constructor(sceneManager, characterManager, inputManager, collisionManager, gameModeManager, entityManager) {
    this.sceneManager = sceneManager;
    this.characterManager = characterManager;
    this.inputManager = inputManager;
    this.collisionManager = collisionManager;
    this.gameModeManager = gameModeManager;
    this.entityManager = entityManager;
    
    this.lastTime = performance.now();
    this.isRunning = false;
  }

  start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.tick();
  }

  stop() {
    this.isRunning = false;
  }

  tick() {
    if (!this.isRunning) return;
    
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.033);
    this.lastTime = now;

    this.update(dt);
    this.sceneManager.render();
    
    requestAnimationFrame(() => this.tick());
  }

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
    
    // Only allow movement if game is started (or doesn't require start)
    if (canMove) {
      // Calculate intended next position on XZ plane
      const currentSpeed = this.inputManager.getCurrentSpeed();
      const velocity = new THREE.Vector3(input.x, 0, -input.y).multiplyScalar(currentSpeed * dt);
      const nextPos = player.position.clone().add(velocity);

      // Collision check against walls only (no invisible boundaries)
      if (!this.collisionManager.willCollide(nextPos, this.characterManager.getPlayerSize())) {
        player.position.x = nextPos.x;
        player.position.z = nextPos.z;
        // Y position is handled by jump physics
      }

      // Update character movement and animation
      const isRunning = this.inputManager.isRunning();
      this.characterManager.updateMovement(input, velocity, this.sceneManager.getCamera(), isRunning);
      this.characterManager.updateSmokeSpawnTimer(dt);
    } else {
      // Before game starts, keep character idle
      this.characterManager.updateMovement(new THREE.Vector2(0, 0), new THREE.Vector3(0, 0, 0), this.sceneManager.getCamera(), false);
    }
    
    this.characterManager.updateAnimation(dt, this.inputManager.isRunning());

    // Update smoke particles
    if (this.characterManager.particleManager) {
      this.characterManager.particleManager.update(dt);
      // Billboard smoke particles to camera
      this.characterManager.particleManager.billboardToCamera(
        this.characterManager.particleManager.smokeParticles,
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
}
