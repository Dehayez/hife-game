/**
 * CombatHandler.js
 * 
 * Handles combat-related logic: shooting, melee attacks, healing.
 * Extracted from GameLoop for better organization.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getMeleeStats } from '../../../systems/abilities/functions/CharacterAbilityStats.js';

/**
 * Combat handler for game loop
 */
export class CombatHandler {
  constructor(gameLoop) {
    this.gameLoop = gameLoop;
  }
  
  /**
   * Handle shooting input
   * @param {THREE.Mesh} player - Player mesh
   */
  handleShootingInput(player) {
    const playerPos = player.position;
    const characterName = this.gameLoop.characterManager.getCharacterName();
    const playerId = 'local';
    
    // Check if player can shoot
    if (!this.gameLoop.projectileManager.canShoot(playerId)) {
      return;
    }
    
    const inputMode = this.gameLoop.inputManager.getInputMode();
    const camera = this.gameLoop.sceneManager.getCamera();
    
    let directionX, directionZ, targetX, targetZ;
    
    // In keyboard mode, use mouse position for aiming
    if (inputMode === 'keyboard') {
      const mousePos = this.gameLoop.inputManager.getMousePosition();
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      mouse.x = (mousePos.x / window.innerWidth) * 2 - 1;
      mouse.y = -(mousePos.y / window.innerHeight) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersect = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersect);
      
      const toCursorX = intersect.x - playerPos.x;
      const toCursorZ = intersect.z - playerPos.z;
      const toCursorLength = Math.sqrt(toCursorX * toCursorX + toCursorZ * toCursorZ);
      
      if (toCursorLength > 0.01) {
        directionX = toCursorX / toCursorLength;
        directionZ = toCursorZ / toCursorLength;
        targetX = intersect.x;
        targetZ = intersect.z;
      } else {
        // Fallback to character facing direction
        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        directionX = cameraDir.x;
        directionZ = cameraDir.z;
        targetX = null;
        targetZ = null;
      }
    } else {
      // Controller mode - use camera direction
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      directionX = cameraDir.x;
      directionZ = cameraDir.z;
      targetX = null;
      targetZ = null;
    }
    
    // Create projectile
    const projectile = this.gameLoop.projectileManager.createProjectile(
      playerPos.x,
      playerPos.y + 0.5,
      playerPos.z,
      directionX,
      directionZ,
      playerId,
      characterName,
      targetX,
      targetZ
    );
    
    if (projectile) {
      // Vibration feedback for shooting
      this.gameLoop.vibrationManager.vibrate(0.1, 0.1, 50);
    }
  }
  
  /**
   * Handle melee/sword swing input
   * @param {THREE.Mesh} player - Player mesh
   */
  handleSwordSwing(player) {
    const characterName = this.gameLoop.characterManager.getCharacterName();
    const meleeStats = getMeleeStats(characterName);
    
    // Check cooldown
    if (this.gameLoop.meleeCooldownTimer > 0) {
      return;
    }
    
    // Set cooldown timer
    this.gameLoop.meleeCooldownTimer = meleeStats.cooldown;
    
    // Sync cooldown to ProjectileManager
    if (this.gameLoop.projectileManager) {
      this.gameLoop.projectileManager.setMeleeCooldown('local', meleeStats.cooldown);
    }
    
    // Set animation duration
    this.gameLoop.swordSwingAnimationTime = meleeStats.duration;
    this.gameLoop.swordSwingAnimationDuration = meleeStats.duration;
    
    // Store attack stats for damage over time
    this.gameLoop.meleeDamagePerTick = meleeStats.damagePerTick;
    this.gameLoop.meleeTickInterval = meleeStats.tickInterval;
    this.gameLoop.meleeRange = meleeStats.range;
    this.gameLoop.meleeInitialDamage = meleeStats.initialDamage;
    this.gameLoop.meleePoisonDamage = meleeStats.poisonDamage;
    this.gameLoop.meleePoisonTickInterval = meleeStats.poisonTickInterval;
    this.gameLoop.meleePoisonDuration = meleeStats.poisonDuration;
    this.gameLoop.meleeSlowSpeedMultiplier = meleeStats.slowSpeedMultiplier;
    
    // Create visual circle effect
    this._createSwordSwingCircle(player, meleeStats);
    
    // Apply initial damage
    this._applyInitialMeleeDamage(player, meleeStats);
    
    // Vibration feedback
    this.gameLoop.vibrationManager.vibrate(0.2, 0.2, 100);
  }
  
  /**
   * Create sword swing circle visual effect
   * @param {THREE.Mesh} player - Player mesh
   * @param {Object} meleeStats - Melee stats
   * @private
   */
  _createSwordSwingCircle(player, meleeStats) {
    const geometry = new THREE.RingGeometry(0.1, meleeStats.range, 32);
    const material = new THREE.MeshBasicMaterial({
      color: meleeStats.color || 0xff0000,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3
    });
    
    const circle = new THREE.Mesh(geometry, material);
    circle.rotation.x = -Math.PI / 2;
    circle.position.set(player.position.x, player.position.y + 0.2, player.position.z);
    
    this.gameLoop.sceneManager.getScene().add(circle);
    this.gameLoop.swordSwingCircle = circle;
    this.gameLoop.lastCharacterPositionForParticles = player.position.clone();
  }
  
  /**
   * Apply initial melee damage
   * @param {THREE.Mesh} player - Player mesh
   * @param {Object} meleeStats - Melee stats
   * @private
   */
  _applyInitialMeleeDamage(player, meleeStats) {
    if (!meleeStats.initialDamage || meleeStats.initialDamage <= 0) {
      return;
    }
    
    const playerPos = player.position;
    const radius = meleeStats.range;
    
    // Damage bots
    if (this.gameLoop.botManager) {
      this.gameLoop.botManager.getAllBots().forEach(bot => {
        const distance = Math.sqrt(
          Math.pow(bot.position.x - playerPos.x, 2) + 
          Math.pow(bot.position.z - playerPos.z, 2)
        );
        
        if (distance <= radius) {
          const sightCheck = this._hasLineOfSight(
            new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z),
            new THREE.Vector3(bot.position.x, bot.position.y, bot.position.z),
            radius,
            0.3
          );
          
          if (sightCheck.clear) {
            this.gameLoop.botManager.damageBot(bot, meleeStats.initialDamage, 'local');
          }
        }
      });
    }
    
    // Damage remote players in multiplayer
    if (this.gameLoop.remotePlayerManager && this.gameLoop.multiplayerManager && 
        this.gameLoop.multiplayerManager.isInRoom()) {
      const remotePlayers = this.gameLoop.remotePlayerManager.getRemotePlayers();
      for (const [playerId, remotePlayer] of remotePlayers) {
        const mesh = remotePlayer.mesh;
        if (!mesh) continue;
        
        const distance = Math.sqrt(
          Math.pow(mesh.position.x - playerPos.x, 2) + 
          Math.pow(mesh.position.z - playerPos.z, 2)
        );
        
        if (distance <= radius) {
          const sightCheck = this._hasLineOfSight(
            new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z),
            new THREE.Vector3(mesh.position.x, mesh.position.y, mesh.position.z),
            radius,
            0.3
          );
          
          if (sightCheck.clear && mesh.userData && mesh.userData.health !== undefined) {
            mesh.userData.health = Math.max(0, mesh.userData.health - meleeStats.initialDamage);
            
            this.gameLoop.multiplayerManager.sendPlayerDamage({
              damage: meleeStats.initialDamage,
              health: mesh.userData.health,
              maxHealth: mesh.userData.maxHealth || 100
            });
          }
        }
      }
    }
  }
  
  /**
   * Check line of sight between two points
   * @param {THREE.Vector3} start - Start position
   * @param {THREE.Vector3} end - End position
   * @param {number} radius - Attack radius
   * @param {number} heightOffset - Height offset for line of sight check
   * @returns {Object} Sight check result
   * @private
   */
  _hasLineOfSight(start, end, radius, heightOffset) {
    // This is a simplified check - full implementation would use raycaster
    // For now, delegate to GameLoop's method if it exists
    if (this.gameLoop._hasLineOfSight) {
      return this.gameLoop._hasLineOfSight(start, end, radius, heightOffset);
    }
    
    // Fallback: simple distance check
    const distance = start.distanceTo(end);
    return { clear: distance <= radius };
  }
  
  /**
   * Handle healing input
   * @param {THREE.Mesh} player - Player mesh
   * @param {number} dt - Delta time
   */
  handleHeal(player, dt) {
    const currentHealth = this.gameLoop.characterManager.getHealth();
    const maxHealth = this.gameLoop.characterManager.getMaxHealth();
    
    if (currentHealth >= maxHealth) {
      this.gameLoop.healHoldDuration = 0;
      return;
    }
    
    // Increment hold duration
    this.gameLoop.healHoldDuration += dt;
    
    // Heal over time (configurable rate)
    const healRate = 20; // Health per second
    const healAmount = healRate * dt;
    const newHealth = Math.min(maxHealth, currentHealth + healAmount);
    
    this.gameLoop.characterManager.setHealth(newHealth);
    
    // Vibration feedback for healing (throttled)
    const now = performance.now();
    if (now - this.gameLoop._lastHealVibrationTime >= this.gameLoop._healVibrationInterval) {
      this.gameLoop.vibrationManager.vibrate(0.05, 0.05, 30);
      this.gameLoop._lastHealVibrationTime = now;
    }
  }
}

