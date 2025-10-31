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
      maxHealth: getCharacterHealthStats().maxHealth
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
   */
  respawn() {
    if (!this.player) return;
    
    respawnCharacterPhysics(this.player, this.characterData);
    
    // Update player userData health
    if (this.player.userData) {
      this.player.userData.health = this.characterData.health;
      this.player.userData.maxHealth = this.characterData.maxHealth;
    }
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
}

