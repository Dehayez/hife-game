import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

export class GameLoop {
  constructor(sceneManager, characterManager, inputManager, collisionManager) {
    this.sceneManager = sceneManager;
    this.characterManager = characterManager;
    this.inputManager = inputManager;
    this.collisionManager = collisionManager;
    
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
    const player = this.characterManager.getPlayer();
    const input = this.inputManager.getInputVector();
    
    // Handle jump input
    if (this.inputManager.isJumpPressed()) {
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
    this.characterManager.updateMovement(input, velocity, this.sceneManager.getCamera());
    this.characterManager.updateAnimation(dt, this.inputManager.isRunning());

    // Camera follows player
    this.sceneManager.updateCamera(player.position);
  }
}
