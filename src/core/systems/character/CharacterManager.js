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
import { SoundManager } from '../../../utils/SoundManager.js';
import { getCharacterHealthStats, getCharacterMovementStats } from '../../../config/character/CharacterStats.js';
import { getCharacterPhysicsStats } from '../../../config/character/PhysicsConfig.js';
import { getRunningSmokeConfig } from '../../../config/abilities/base/SmokeParticleConfig.js';
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
import { getCharacterColorHex } from '../../../config/abilities/CharacterColors.js';
import { startDeathFade, updateDeathFade, resetDeathFade, DEATH_FADE_CONFIG } from '../../../utils/DeathFadeUtils.js';
import { createSpriteMesh } from '../../../utils/SpriteUtils.js';

const WORLD_UP = new THREE.Vector3(0, 1, 0);

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
      hasDoubleJumped: false,
      levitationCooldown: 0,
      isLevitationActive: false,
      levitationTimeRemaining: 0,
      levitationInitialDuration: 0
    };
    
    // Sound manager
    this.soundManager = new SoundManager(footstepSoundPath);
    
    // Collision manager reference
    this.collisionManager = null;
    
    // Particle manager reference
    this.particleManager = null;
    
    // Death fade tracking
    this._isDying = false;
    this.deathFadeTimer = 0;
    this.deathFadeDuration = DEATH_FADE_CONFIG.duration;
    
    // Smoke particle spawn timer
    this.smokeSpawnTimer = 0;
    const smokeConfig = getRunningSmokeConfig();
    this.smokeSpawnInterval = smokeConfig.spawnInterval;
    this.rollMesh = null;
    this.rollRadius = Math.max(this.playerSize * 0.75, this.playerHeight * 0.4);
    this._rollTempAxis = new THREE.Vector3();
    this._rollTempDir = new THREE.Vector3();
    this._rollTempQuat = new THREE.Quaternion();
    this._isRollVisible = false;
    
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
    this.player = createSpriteMesh(this.playerHeight);
    this.player.position.set(0, this.playerHeight * 0.5, 0);
    
    // Add health tracking to player mesh
    const healthStats = getCharacterHealthStats();
    this.player.userData = {
      type: 'player',
      health: this.characterData.health,
      maxHealth: healthStats.maxHealth
    };
    
    this.scene.add(this.player);
    this._ensureRollingMesh();
  }

  /**
   * Initialize player with scene
   * @param {Object} scene - THREE.js scene
   */
  initializePlayer(scene) {
    this.scene = scene;
    if (!this.player) {
      this._setupPlayer();
    } else if (this.scene && this.player.parent !== this.scene) {
      this.scene.add(this.player);
      this._ensureRollingMesh();
    }
  }

  /**
   * Load character animations and sounds
   * @param {string} name - Character name ('lucy' or 'herald')
   * @param {Function} onProgress - Optional progress callback (step, total, task)
   */
  async loadCharacter(name, onProgress = null) {
    this.characterName = name;
    
    // Load animations with progress tracking
    const loaded = await loadCharacterAnimations(name, onProgress);
    
    // Load sounds with progress tracking
    await loadAllCharacterSounds(name, this.soundManager, onProgress);
    
    this.animations = loaded;
    this.currentAnimKey = 'idle_front';
    this.lastFacing = 'front';
    this.setCurrentAnim(this.currentAnimKey, true);
    this._ensureRollingMesh();
    this._updateRollMeshAppearance();
    this._resetRollingVisual();
    
    // Force immediate texture update to ensure character image changes right away
    if (this.player && this.player.material) {
      this.player.material.needsUpdate = true;
      if (this.player.material.map) {
        this.player.material.map.needsUpdate = true;
      }
    }
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
      this._shouldMuteFootsteps(isRunning) ? null : this.soundManager,
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
    
    const soundManager = this._shouldMuteFootsteps(isRunning) ? null : this.soundManager;
    
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
      soundManager,
      this.particleManager,
      this.smokeSpawnTimer,
      isRunning
    );
    
    this.currentAnimKey = movementResult.currentAnimKey;
    this.lastFacing = movementResult.lastFacing;
    this.smokeSpawnTimer = movementResult.smokeSpawnTimer;
    this._updateRollingVisual(velocity, isRunning);
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
   * Check if character is currently dying (fading out)
   * @returns {boolean} True if dying
   */
  isDying() {
    return this._isDying;
  }

  /**
   * Get character name
   * @returns {string} Character name
   */
  getCharacterName() {
    return this.characterName;
  }
  
  /**
   * Get character color as hex number
   * @returns {number} Character color as hex number
   */
  getCharacterColor() {
    return getCharacterColorHex(this.characterName);
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

    // Only allow double jump if in air and haven't double jumped yet
    // Note: Double jump ignores cooldown since it's triggered by rapid button presses
    if (!this.characterData.isGrounded && !this.characterData.hasDoubleJumped) {
      this.characterData.velocityY = physicsStats.jumpForce * 0.8; // Slightly weaker than normal jump
      this.characterData.hasDoubleJumped = true;

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
   * @param {boolean} isLevitating - Whether character is levitating
   */
  updateJumpPhysics(dt, collisionManager, isLevitating = false) {
    if (!this.player) return;
    
    updateCharacterPhysics(
      this.player,
      this.player.userData,
      this.characterData,
      collisionManager,
      this.soundManager,
      () => this.isOnBaseGround(),
      dt,
      isLevitating
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
    
    // Reset death state
    this._isDying = false;
    this.deathFadeTimer = 0;
    
    // Use collision manager from this instance if not provided
    const colManager = collisionManager || this.collisionManager;
    respawnCharacterPhysics(this.player, this.characterData, gameMode, colManager);
    
    // Update player userData health
    if (this.player.userData) {
      this.player.userData.health = this.characterData.health;
      this.player.userData.maxHealth = this.characterData.maxHealth;
    }
    
    // Reset opacity and scale
    if (this.player.material) {
      this.player.material.opacity = 1.0;
    }
    this.player.scale.set(1, 1, 1);
    
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
   * Get current levitation state
   * @returns {{isActive: boolean, durationRemaining: number, cooldownRemaining: number}}
   */
  getLevitationState() {
    const data = this.characterData || {};

    return {
      isActive: Boolean(data.isLevitationActive),
      durationRemaining: Math.max(0, data.levitationTimeRemaining || 0),
      cooldownRemaining: Math.max(0, data.levitationCooldown || 0)
    };
  }

  /**
   * Get levitation cooldown
   * @returns {number} Current levitation cooldown
   */
  getLevitationCooldown() {
    const { cooldownRemaining } = this.getLevitationState();
    return cooldownRemaining;
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
    const idleKey = this.lastFacing === 'back' ? 'idle_back' : 'idle_front';
    
    // Check if death animation actually exists (not a fallback to idle)
    const deathAnim = this.animations[animKey];
    const idleAnim = this.animations[idleKey];
    
    // If death animation is actually the idle animation (fallback), skip animation
    if (deathAnim === idleAnim) {
      // Death animation doesn't exist, start fade out immediately
      this.startDeathFade();
      return;
    }
    
    const newKey = setCharacterAnimation(
      this.player,
      animKey,
      this.animations,
      this.currentAnimKey,
      true,
      () => {
        // When death animation completes, start fade out
        this.startDeathFade();
      }
    );
    
    this.currentAnimKey = newKey;
    
    // Start fade out immediately (particles will spawn)
    this.startDeathFade();
  }

  /**
   * Start death fade effect
   */
  startDeathFade() {
    if (!this.player) return;
    
    const characterData = {
      isDying: this._isDying,
      deathFadeTimer: this.deathFadeTimer
    };
    
    startDeathFade(this.player, characterData, this.getCharacterName(), this.particleManager);
    
    // Sync back to instance properties
    this._isDying = characterData.isDying;
    this.deathFadeTimer = characterData.deathFadeTimer;
  }

  /**
   * Update death fade effect
   * @param {number} dt - Delta time in seconds
   * @returns {boolean} True if fade is complete
   */
  updateDeathFade(dt) {
    if (!this._isDying || !this.player) return false;
    
    const characterData = {
      isDying: this._isDying,
      deathFadeTimer: this.deathFadeTimer
    };
    
    const complete = updateDeathFade(this.player, characterData, dt, this.deathFadeDuration);
    
    // Sync back to instance properties
    this._isDying = characterData.isDying;
    this.deathFadeTimer = characterData.deathFadeTimer;
    
    return complete;
  }

  /**
   * Play spawn animation
   */
  playSpawnAnimation() {
    if (!this.animations || !this.player) return;
    
    const animKey = this.lastFacing === 'back' ? 'spawn_back' : 'spawn_front';
    const idleKey = this.lastFacing === 'back' ? 'idle_back' : 'idle_front';
    
    // Check if spawn animation actually exists (not a fallback to idle)
    const spawnAnim = this.animations[animKey];
    const idleAnim = this.animations[idleKey];
    
    // If spawn animation is actually the idle animation (fallback), skip animation
    if (spawnAnim === idleAnim) {
      // Spawn animation doesn't exist, just set to idle immediately
      this.currentAnimKey = idleKey;
      this.setCurrentAnim(this.currentAnimKey, true);
      return;
    }
    
    const newKey = setCharacterAnimation(
      this.player,
      animKey,
      this.animations,
      this.currentAnimKey,
      true,
      () => {
        // When spawn animation completes, return to idle
        this.currentAnimKey = idleKey;
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

  /**
   * Ensure rolling mesh exists and is attached to the scene
   * @private
   */
  _ensureRollingMesh() {
    if (!this.scene) return;
    
    if (!this.rollMesh) {
      const segments = 28;
      const geometry = new THREE.SphereGeometry(this.rollRadius, segments, segments);
      const material = this._createRollMaterial(getCharacterColorHex(this.characterName));
      this.rollMesh = new THREE.Mesh(geometry, material);
      this.rollMesh.castShadow = true;
      this.rollMesh.receiveShadow = true;
      this.rollMesh.visible = false;
      this.scene.add(this.rollMesh);
    } else if (this.rollMesh.parent !== this.scene) {
      this.scene.add(this.rollMesh);
    }
    
    this._updateRollMeshAppearance();
  }

  /**
   * Create material for rolling mesh
   * @param {number} colorHex - Color hex value
   * @private
   */
  _createRollMaterial(colorHex) {
    const color = new THREE.Color(colorHex);
    const emissive = color.clone().multiplyScalar(0.2);
    return new THREE.MeshStandardMaterial({
      color,
      metalness: 0.3,
      roughness: 0.55,
      emissive,
      emissiveIntensity: 0.35
    });
  }

  /**
   * Update rolling mesh color to match current character
   * @private
   */
  _updateRollMeshAppearance() {
    if (!this.rollMesh || !this.rollMesh.material) return;
    
    const colorHex = getCharacterColorHex(this.characterName);
    const color = new THREE.Color(colorHex);
    this.rollMesh.material.color.copy(color);
    if (this.rollMesh.material.emissive) {
      const emissive = color.clone().multiplyScalar(0.2);
      this.rollMesh.material.emissive.copy(emissive);
    }
  }

  /**
   * Reset rolling visual to default (sprite visible, ball hidden)
   * @private
   */
  _resetRollingVisual() {
    if (this.player) {
      this.player.visible = true;
    }
    if (this.rollMesh) {
      this.rollMesh.visible = false;
      this.rollMesh.quaternion.identity();
    }
    this._isRollVisible = false;
  }

  /**
   * Update rolling ball visibility and rotation
   * @param {THREE.Vector3} velocity - Current frame movement delta
   * @param {boolean} isRunning - Whether sprint is active
   * @private
   */
  _updateRollingVisual(velocity, isRunning) {
    if (!this.rollMesh || !this.player) return;
    
    const shouldRoll = isRunning &&
                       this.characterName === 'herald' &&
                       !this.isPlayingSpecialAnimation();
    
    if (!shouldRoll) {
      if (this._isRollVisible) {
        this._resetRollingVisual();
      }
      return;
    }
    
    if (!this._isRollVisible) {
      this._updateRollMeshAppearance();
      this.player.visible = false;
      this.rollMesh.visible = true;
      this.rollMesh.quaternion.identity();
      this._isRollVisible = true;
    }
    
    const baseGroundY = this.player.position.y - this.playerHeight * 0.5;
    const rollCenterY = baseGroundY + this.rollRadius;
    this.rollMesh.position.set(
      this.player.position.x,
      rollCenterY,
      this.player.position.z
    );
    
    const moveDistance = velocity.length();
    if (moveDistance <= 1e-6) {
      return;
    }
    
    this._rollTempDir.copy(velocity).normalize();
    this._rollTempAxis.crossVectors(this._rollTempDir, WORLD_UP);
    
    if (this._rollTempAxis.lengthSq() <= 1e-8) {
      return;
    }
    
    this._rollTempAxis.normalize();
    const angle = moveDistance / this.rollRadius;
    this._rollTempQuat.setFromAxisAngle(this._rollTempAxis, angle);
    this.rollMesh.quaternion.premultiply(this._rollTempQuat);
  }

  /**
   * Determine if footstep audio should be muted for current state
   * @param {boolean} isRunning - Whether sprint is active
   * @returns {boolean} True when footsteps should be muted
   * @private
   */
  _shouldMuteFootsteps(isRunning) {
    return this.characterName === 'herald' && isRunning;
  }
}

