import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

export class GameLoop {
  constructor(sceneManager, characterManager, inputManager, collisionManager, gameModeManager, entityManager, projectileManager = null) {
    this.sceneManager = sceneManager;
    this.characterManager = characterManager;
    this.inputManager = inputManager;
    this.collisionManager = collisionManager;
    this.gameModeManager = gameModeManager;
    this.entityManager = entityManager;
    this.projectileManager = projectileManager;
    
    this.lastTime = performance.now();
    this.isRunning = false;
    this.lastShootInput = false;
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
    
    // Handle shooting mode
    if (mode === 'shooting' && this.projectileManager) {
      // Update projectiles
      this.projectileManager.update(dt);
      
      // Handle shooting input
      const shootInput = this.inputManager.isShootPressed();
      if (shootInput && !this.lastShootInput && this.projectileManager.canShoot()) {
        // Get shooting direction (towards mouse cursor on ground plane)
        const camera = this.sceneManager.getCamera();
        const mousePos = this.inputManager.getMousePosition();
        
        // Convert mouse to world coordinates on ground plane
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        mouse.x = (mousePos.x / window.innerWidth) * 2 - 1;
        mouse.y = -(mousePos.y / window.innerHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        
        // Intersect with ground plane at y = 0.6
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.6);
        const intersect = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersect);
        
        // Calculate direction from player to intersect point
        const playerPos = player.position;
        const directionX = intersect.x - playerPos.x;
        const directionZ = intersect.z - playerPos.z;
        
        // If no valid direction (too close to player), shoot forward
        const dirLength = Math.sqrt(directionX * directionX + directionZ * directionZ);
        if (dirLength < 0.1) {
          // Shoot in camera forward direction
          const cameraDir = new THREE.Vector3();
          camera.getWorldDirection(cameraDir);
          this.projectileManager.createProjectile(
            playerPos.x,
            playerPos.z,
            cameraDir.x,
            cameraDir.z,
            'local'
          );
        } else {
          this.projectileManager.createProjectile(
            playerPos.x,
            playerPos.z,
            directionX,
            directionZ,
            'local'
          );
        }
      }
      this.lastShootInput = shootInput;
      
      // Check projectile collisions with player
      const projectileCollision = this.projectileManager.checkPlayerCollision(
        player.position,
        this.characterManager.getPlayerSize(),
        'local'
      );
      
      if (projectileCollision.hit) {
        // Apply damage
        if (this.gameModeManager && this.gameModeManager.modeState) {
          this.gameModeManager.modeState.health -= projectileCollision.damage;
          
          if (this.gameModeManager.modeState.health <= 0) {
            // Player died - respawn
            this.gameModeManager.modeState.deaths++;
            this.gameModeManager.modeState.health = 100;
            this.characterManager.respawn();
          }
        }
      }
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
