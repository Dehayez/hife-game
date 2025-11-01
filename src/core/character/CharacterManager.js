/**
 * CharacterManager.js
 * 
 * Main manager for all player character-related functionality.
 * Coordinates character creation, updates, animation, physics, and sound.
 * 
 * This file acts as a facade, delegating to specialized modules:
 * - CharacterStats.js: Character stats configuration
 * - CharacterAnimation.js: Animation loading and updating
 * - CharacterPhysics.js: Physics and jump mechanics
 * - CharacterSound.js: Sound loading and management
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { SoundManager } from '../../utils/SoundManager.js';
import { 
  getCharacterHealthStats, 
  getCharacterMovementStats, 
  getCharacterPhysicsStats,
  getCharacterParticleStats 
} from './CharacterStats.js';
import { 
  loadCharacterAnimations, 
  setCharacterAnimation, 
  updateCharacterAnimation,
  updateCharacterMovement 
} from './CharacterAnimation.js';
import { 
  updateCharacterPhysics, 
  characterJump, 
  isCharacterJumping,
  initializeCharacterPhysics,
  respawnCharacterPhysics 
} from './CharacterPhysics.js';
import { loadAllCharacterSounds } from './CharacterSound.js';

export class CharacterManager {
  /**
   * Create a new CharacterManager
   * @param {Object} scene - THREE.js scene
   * @param {string} footstepSoundPath - Optional custom footstep sound path
   */
  constructor(scene, footstepSoundPath = null) {
    this.scene = scene;
    this.player = null;
    this.animations = null;
    this.currentAnimKey = 'idle_front';
    this.lastFacing = 'front';
    this.characterName = 'lucy';
    
    // Get stats from config
    const movementStats = getCharacterMovementStats();
    this.playerSize = movementStats.playerSize;
    this.playerHeight = movementStats.playerHeight;
    
    // Character data object for physics and health
    this.characterData = {
      velocityY: 0,
      isGrounded: true,
      wasGrounded: true,
      jumpCooldown: 0,
      health: getCharacterHealthStats().defaultHealth,
      maxHealth: getCharacterHealthStats().maxHealth,
      hasDoubleJumped: false
    };
    
    // Sound manager
    this.soundManager = new SoundManager(footstepSoundPath);
    
    // Collision manager reference
    this.collisionManager = null;
    
    // Particle manager reference
    this.particleManager = null;
    
    // Smoke particle spawn timer
    const particleStats = getCharacterParticleStats();
    this.smokeSpawnTimer = 0;
    this.smokeSpawnInterval = particleStats.smokeSpawnInterval;
    
    // Only setup player if scene is available
    if (this.scene) {
      this._setupPlayer();
    }
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
   * Get the sound manager
   * @returns {Object} Sound manager instance
   */
  getSoundManager() {
    return this.soundManager;
  }

  /**
   * Check if player is on base ground
   * @returns {boolean} True if on base ground (height ≈ 0)
   */
  isOnBaseGround() {
    if (!this.collisionManager) return true;
    
    const groundHeight = this.collisionManager.getGroundHeight(
      this.player.position.x,
      this.player.position.z,
      this.playerSize
    );
    
    // Consider it base ground if height is very close to 0
    return Math.abs(groundHeight) < 0.1;
  }

  /**
   * Setup player sprite
   * @private
   */
  _setupPlayer() {
    const spriteGeo = new THREE.PlaneGeometry(this.playerHeight * 0.7, this.playerHeight);
    const spriteMat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.1 });
    this.player = new THREE.Mesh(spriteGeo, spriteMat);
    this.player.position.set(0, this.playerHeight * 0.5, 0);
    this.player.castShadow = true;
    this.player.receiveShadow = false;
    
    // Add health tracking to player mesh
    const healthStats = getCharacterHealthStats();
    this.player.userData = {
      type: 'player',
      health: this.characterData.health,
      maxHealth: healthStats.maxHealth
    };
    
    this.scene.add(this.player);
  }

  /**
   * Initialize player with scene
   * @param {Object} scene - THREE.js scene
   */
  initializePlayer(scene) {
    this.scene = scene;
    if (!this.player) {
      this._setupPlayer();
    }
  }

  /**
   * Load character animations and sounds
   * @param {string} name - Character name ('lucy' or 'herald')
   */
  async loadCharacter(name) {
    this.characterName = name;
    
    // Load animations
    const loaded = await loadCharacterAnimations(name);
    
    // Load sounds
    await loadAllCharacterSounds(name, this.soundManager);
    
    this.animations = loaded;
    this.currentAnimKey = 'idle_front';
    this.lastFacing = 'front';
    this.setCurrentAnim(this.currentAnimKey, true);
  }

  /**
   * Set current animation
   * @param {string} key - Animation key
   * @param {boolean} force - Force animation change
   */
  setCurrentAnim(key, force = false) {
    if (!this.animations || !this.player) return;
    
    const newKey = setCharacterAnimation(
      this.player,
      key,
      this.animations,
      this.currentAnimKey,
      force
    );
    
    this.currentAnimKey = newKey;
  }

  /**
   * Update animation frame
   * @param {number} dt - Delta time in seconds
   * @param {boolean} isRunning - Whether character is running
   */
  updateAnimation(dt, isRunning = false) {
    if (!this.animations || !this.player) return;
    
    updateCharacterAnimation(
      this.player,
      this.animations,
      this.currentAnimKey,
      this.characterData.isGrounded,
      () => this.isOnBaseGround(),
      this.soundManager,
      dt,
      isRunning
    );
  }

  /**
   * Update movement and animation state
   * @param {THREE.Vector3} input - Input vector
   * @param {THREE.Vector3} velocity - Velocity vector
   * @param {THREE.Camera} camera - Camera reference
   * @param {boolean} isRunning - Whether character is running
   */
  updateMovement(input, velocity, camera, isRunning = false) {
    if (!this.player) return;
    
    const movementResult = updateCharacterMovement(
      this.player,
      camera,
      input,
      velocity,
      isCharacterJumping(this.characterData),
      this.characterData.isGrounded,
      () => this.isOnBaseGround(),
      this.animations,
      this.currentAnimKey,
      this.lastFacing,
      this.soundManager,
      this.particleManager,
      this.smokeSpawnTimer,
      isRunning
    );
    
    this.currentAnimKey = movementResult.currentAnimKey;
    this.lastFacing = movementResult.lastFacing;
    this.smokeSpawnTimer = movementResult.smokeSpawnTimer;
  }

  /**
   * Update smoke spawn timer
   * @param {number} dt - Delta time in seconds
   */
  updateSmokeSpawnTimer(dt) {
    this.smokeSpawnTimer -= dt;
    if (this.smokeSpawnTimer < 0) {
      this.smokeSpawnTimer = 0;
    }
  }

  /**
   * Get player mesh
   * @returns {THREE.Mesh} Player mesh
   */
  getPlayer() {
    return this.player;
  }

  /**
   * Get player size
   * @returns {number} Player size
   */
  getPlayerSize() {
    return this.playerSize;
  }

  /**
   * Get character name
   * @returns {string} Character name
   */
  getCharacterName() {
    return this.characterName;
  }

  /**
   * Get character facing direction
   * @returns {string} Character facing direction ('front' or 'back')
   */
  getLastFacing() {
    return this.lastFacing;
  }

  /**
   * Make character jump
   */
  jump() {
    characterJump(
      this.characterData,
      this.soundManager,
      () => this.isOnBaseGround()
    );
  }

  /**
   * Make character double jump (while in air)
   */
  doubleJump() {
    const physicsStats = getCharacterPhysicsStats();
    
    // Only allow double jump if in air, going upward (positive velocityY), and haven't double jumped yet
    if (!this.characterData.isGrounded && this.characterData.velocityY > 0 && !this.characterData.hasDoubleJumped && this.characterData.jumpCooldown <= 0) {
      this.characterData.velocityY = physicsStats.jumpForce * 0.8; // Slightly weaker than normal jump
      this.characterData.hasDoubleJumped = true;
      this.characterData.jumpCooldown = physicsStats.jumpCooldownTime;
      
      // Play jump sound
      if (this.soundManager) {
        this.soundManager.playJump(false); // Double jump always uses regular jump sound
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Update jump physics and ground collision
   * @param {number} dt - Delta time in seconds
   * @param {Object} collisionManager - Collision manager
   */
  updateJumpPhysics(dt, collisionManager) {
    if (!this.player) return;
    
    updateCharacterPhysics(
      this.player,
      this.player.userData,
      this.characterData,
      collisionManager,
      this.soundManager,
      () => this.isOnBaseGround(),
      dt
    );
  }

  /**
   * Check if character is jumping
   * @returns {boolean} True if jumping
   */
  isJumping() {
    return isCharacterJumping(this.characterData);
  }

  /**
   * Respawn character
   * @param {string} gameMode - Optional game mode ('shooting' for random spawn)
   * @param {Object} collisionManager - Optional collision manager for ground height checks
   */
  respawn(gameMode = null, collisionManager = null) {
    if (!this.player) return;
    
    // Use collision manager from this instance if not provided
    const colManager = collisionManager || this.collisionManager;
    respawnCharacterPhysics(this.player, this.characterData, gameMode, colManager);
    
    // Update player userData health
    if (this.player.userData) {
      this.player.userData.health = this.characterData.health;
      this.player.userData.maxHealth = this.characterData.maxHealth;
    }
    
    // Play spawn animation
    this.playSpawnAnimation();
  }

  /**
   * Get current health
   * @returns {number} Current health
   */
  getHealth() {
    return this.characterData.health;
  }

  /**
   * Get max health
   * @returns {number} Max health
   */
  getMaxHealth() {
    return this.characterData.maxHealth;
  }

  /**
   * Damage character
   * @param {number} damage - Damage amount
   * @returns {boolean} True if character is dead
   */
  takeDamage(damage) {
    this.characterData.health = Math.max(0, this.characterData.health - damage);
    
    // Play hit animation if not already dead
    if (this.characterData.health > 0) {
      this.playHitAnimation();
    }
    
    return this.characterData.health <= 0;
  }

  /**
   * Set character health
   * @param {number} health - Health value
   */
  setHealth(health) {
    const healthStats = getCharacterHealthStats();
    this.characterData.health = Math.max(0, Math.min(healthStats.maxHealth, health));
  }

  /**
   * Play hit animation
   */
  playHitAnimation() {
    if (!this.animations || !this.player) return;
    
    const animKey = this.lastFacing === 'back' ? 'hit_back' : 'hit_front';
    const idleKey = this.lastFacing === 'back' ? 'idle_back' : 'idle_front';
    
    // Check if hit animation actually exists (not a fallback to idle)
    const hitAnim = this.animations[animKey];
    const idleAnim = this.animations[idleKey];
    
    // If hit animation is actually the idle animation (fallback), skip animation
    if (hitAnim === idleAnim) {
      // Hit animation doesn't exist, just skip - don't play animation
      return;
    }
    
    const newKey = setCharacterAnimation(
      this.player,
      animKey,
      this.animations,
      this.currentAnimKey,
      true,
      () => {
        // When hit animation completes, return to idle/walk based on current state
        this.currentAnimKey = idleKey;
        this.setCurrentAnim(this.currentAnimKey, true);
      }
    );
    
    this.currentAnimKey = newKey;
  }

  /**
   * Play death animation
   */
  playDeathAnimation() {
    if (!this.animations || !this.player) return;
    
    const animKey = this.lastFacing === 'back' ? 'death_back' : 'death_front';
    const newKey = setCharacterAnimation(
      this.player,
      animKey,
      this.animations,
      this.currentAnimKey,
      true
    );
    
    this.currentAnimKey = newKey;
  }

  /**
   * Play spawn animation
   */
  playSpawnAnimation() {
    if (!this.animations || !this.player) return;
    
    const animKey = this.lastFacing === 'back' ? 'spawn_back' : 'spawn_front';
    const newKey = setCharacterAnimation(
      this.player,
      animKey,
      this.animations,
      this.currentAnimKey,
      true,
      () => {
        // When spawn animation completes, return to idle
        this.currentAnimKey = this.lastFacing === 'back' ? 'idle_back' : 'idle_front';
        this.setCurrentAnim(this.currentAnimKey, true);
      }
    );
    
    this.currentAnimKey = newKey;
  }

  /**
   * Check if currently playing a special animation (hit, death, spawn)
   * @returns {boolean} True if playing special animation
   */
  isPlayingSpecialAnimation() {
    return this.currentAnimKey.includes('hit') || 
           this.currentAnimKey.includes('death') || 
           this.currentAnimKey.includes('spawn');
  }
}

