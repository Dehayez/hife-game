/**
 * EntityManager.js
 * 
 * Main manager for all entity-related functionality.
 * Coordinates collectibles, hazards, checkpoints, confetti effects, and collision detection.
 * 
 * This file acts as a facade, delegating to specialized modules:
 * - EntityStats.js: Entity stats configuration
 * - Collectible.js: Collectible creation and management
 * - Hazard.js: Hazard creation and movement
 * - Checkpoint.js: Checkpoint creation and activation
 * - Confetti.js: Confetti effect handling
 * - EntityAnimation.js: Entity animation updates
 * - CollisionDetector.js: Collision detection logic
 * - Spawner.js: Entity spawning and position generation
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getSpawnStats } from '../../../../config/entity/EntityStats.js';
import { createCollectible, collectItem, updateCollectible } from './Collectible.js';
import { createHazard, updateHazard } from './Hazard.js';
import { createCheckpoint, activateCheckpoint, updateCheckpoint } from './Checkpoint.js';
import { createConfettiBurst, updateConfetti, removeConfetti } from './Confetti.js';
import { updateCollectibleAnimation, updateCheckpointAnimation } from './EntityAnimation.js';
import { checkPlayerCollision } from './CollisionDetector.js';
import { generateRandomPositions, getAdjustedSpawnCount } from './Spawner.js';

export class EntityManager {
  /**
   * Create a new EntityManager
   * @param {Object} scene - THREE.js scene
   * @param {number} arenaSize - Arena size
   * @param {Object} collisionManager - Collision manager for wall checks
   */
  constructor(scene, arenaSize, collisionManager = null) {
    this.scene = scene;
    this.arenaSize = arenaSize;
    this.collisionManager = collisionManager;
    this.collectibles = [];
    this.hazards = [];
    this.checkpoints = [];
    this.collectedIds = new Set();
    this.confettiEffects = []; // Store active confetti bursts
    this.totalCollectiblesCount = 0; // Track initial total count for display
  }

  /**
   * Set the collision manager (can be set after construction)
   * @param {Object} collisionManager - Collision manager instance
   */
  setCollisionManager(collisionManager) {
    this.collisionManager = collisionManager;
  }

  /**
   * Create a collectible gem
   * @param {number} x - X position
   * @param {number} z - Z position
   * @param {string} id - Unique identifier
   * @returns {THREE.Mesh} Created collectible mesh
   */
  createCollectible(x, z, id) {
    const collectible = createCollectible(this.scene, x, z, id);
    this.collectibles.push(collectible);
    return collectible;
  }

  /**
   * Create a hazard (thorn cluster)
   * @param {number} x - X position
   * @param {number} z - Z position
   * @param {string} id - Unique identifier
   * @param {number} size - Hazard size (optional)
   * @returns {THREE.Group} Created hazard group
   */
  createHazard(x, z, id, size = null) {
    const hazard = createHazard(this.scene, x, z, id, size);
    this.hazards.push(hazard);
    return hazard;
  }

  /**
   * Create a checkpoint (shrine)
   * @param {number} x - X position
   * @param {number} z - Z position
   * @param {string} id - Unique identifier
   * @returns {THREE.Group} Created checkpoint group
   */
  createCheckpoint(x, z, id) {
    const checkpoint = createCheckpoint(this.scene, x, z, id);
    this.checkpoints.push(checkpoint);
    return checkpoint;
  }

  /**
   * Check player collision with all entities
   * @param {THREE.Vector3} playerPos - Player position
   * @param {number} playerSize - Player size
   * @returns {Object} Collision results
   */
  checkPlayerCollision(playerPos, playerSize) {
    return checkPlayerCollision(
      playerPos,
      playerSize,
      this.collectibles,
      this.hazards,
      this.checkpoints
    );
  }

  /**
   * Collect an item
   * @param {THREE.Mesh} item - Item mesh
   * @returns {boolean} True if item was collected
   */
  collectItem(item) {
    if (item.userData.collected) return false;
    
    const wasCollected = collectItem(item, this.scene);
    if (wasCollected) {
      this.collectedIds.add(item.userData.id);
      
      // Create confetti burst effect
      const confettiEffect = createConfettiBurst(
        this.scene,
        item.position.x,
        item.position.y,
        item.position.z
      );
      this.confettiEffects.push(confettiEffect);
      
      // Mark as fading out
      item.userData.fadingOut = true;
      item.material.transparent = true;
    }
    
    return wasCollected;
  }

  /**
   * Activate a checkpoint
   * @param {THREE.Group} checkpoint - Checkpoint group
   * @returns {boolean} True if checkpoint was activated
   */
  activateCheckpoint(checkpoint) {
    return activateCheckpoint(checkpoint);
  }

  /**
   * Spawn collectibles for collection mode
   * @param {number} count - Number of collectibles to spawn
   */
  spawnCollectiblesForCollection(count = 8) {
    this.clearAll();
    
    const spawnStats = getSpawnStats();
    const adjustedCount = getAdjustedSpawnCount('collection', count, this.arenaSize);
    
    const positions = this._generateRandomPositions(adjustedCount, spawnStats.minDistance);
    positions.forEach((pos, index) => {
      this.createCollectible(pos.x, pos.z, `collectible_${index}`);
    });
    
    // Store the total count for display purposes
    this.totalCollectiblesCount = adjustedCount;
  }

  /**
   * Spawn hazards for survival mode
   * @param {number} count - Number of hazards to spawn
   */
  spawnHazardsForSurvival(count = 10) {
    this.clearAll();
    
    const spawnStats = getSpawnStats();
    const adjustedCount = getAdjustedSpawnCount('survival', count, this.arenaSize);
    
    const positions = this._generateRandomPositions(adjustedCount, spawnStats.minDistance);
    positions.forEach((pos, index) => {
      const size = 0.5 + Math.random() * 0.3;
      const hazard = this.createHazard(pos.x, pos.z, `hazard_${index}`, size);
      hazard.userData.size = size; // Store size for collision detection
      
      // Make hazards faster in large arena
      if (this.arenaSize >= 35) {
        hazard.userData.speed *= 2.5;
      }
    });
  }

  /**
   * Spawn checkpoints for time trial mode
   * @param {number} count - Number of checkpoints to spawn
   */
  spawnCheckpointsForTimeTrial(count = 5) {
    this.clearAll();
    
    const positions = this._generateCheckpointPath(count);
    positions.forEach((pos, index) => {
      this.createCheckpoint(pos.x, pos.z, `checkpoint_${index}`);
    });
  }

  /**
   * Generate random positions for spawning entities
   * @param {number} count - Number of positions to generate
   * @param {number} minDistance - Minimum distance from center
   * @returns {Array<Object>} Array of position objects
   * @private
   */
  _generateRandomPositions(count, minDistance) {
    const halfArena = this.arenaSize / 2 - 2;
    const maxAttempts = 200; // Increased attempts for large arenas
    
    const positions = [];
    
    for (let i = 0; i < count; i++) {
      let attempts = 0;
      let valid = false;
      let x, z;
      
      while (!valid && attempts < maxAttempts) {
        x = (Math.random() - 0.5) * halfArena * 2;
        z = (Math.random() - 0.5) * halfArena * 2;
        
        valid = true;
        
        // Check distance from existing positions
        for (const existing of positions) {
          const dx = x - existing.x;
          const dz = z - existing.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < minDistance) {
            valid = false;
            break;
          }
        }
        
        // Check collision with obstacles if collisionManager available
        if (valid && this.collisionManager && this.collisionManager.pointCollidesWithObstacle) {
          if (this.collisionManager.pointCollidesWithObstacle(x, z, minDistance)) {
            valid = false;
          }
        }
        
        attempts++;
      }
      
      if (valid) {
        positions.push({ x, z });
      }
    }
    
    return positions;
  }

  /**
   * Generate checkpoint path positions
   * @param {number} count - Number of checkpoints
   * @returns {Array<Object>} Array of position objects
   * @private
   */
  _generateCheckpointPath(count) {
    const positions = [];
    const halfArena = this.arenaSize / 2 - 2;
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = halfArena * 0.6;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      positions.push({ x, z });
    }
    
    return positions;
  }

  /**
   * Update all entity animations and effects
   * @param {number} dt - Delta time in seconds
   * @param {boolean} canMove - Whether entities can move
   */
  updateAnims(dt, canMove = true) {
    // Update confetti effects
    const confettiToRemove = [];
    for (let i = 0; i < this.confettiEffects.length; i++) {
      const effect = this.confettiEffects[i];
      const shouldRemove = updateConfetti(effect, dt);
      
      if (shouldRemove) {
        confettiToRemove.push(i);
      }
    }
    
    // Remove finished confetti effects (in reverse to preserve indices)
    for (let i = confettiToRemove.length - 1; i >= 0; i--) {
      const index = confettiToRemove[i];
      const effect = this.confettiEffects[index];
      removeConfetti(this.scene, effect);
      this.confettiEffects.splice(index, 1);
    }
    
    // Process collected items that are fading out
    const itemsToRemove = [];
    for (const item of this.collectibles) {
      if (item.userData.fadingOut) {
        // Fade out animation using delta time
        const fadeSpeed = 3.0; // fade out over ~0.33 seconds
        item.material.opacity = Math.max(0, item.material.opacity - dt * fadeSpeed);
        item.scale.multiplyScalar(1 - dt * 2.7); // shrink faster
        
        if (item.material.opacity <= 0) {
          itemsToRemove.push(item);
        }
        continue;
      }
      
      if (item.userData.collected) continue;
      
      // Update collectible animation
      updateCollectibleAnimation(item, dt);
    }
    
    // Remove faded out items
    for (const item of itemsToRemove) {
      this.scene.remove(item);
      const index = this.collectibles.indexOf(item);
      if (index > -1) {
        this.collectibles.splice(index, 1);
      }
    }

    // Update hazards
    for (const hazard of this.hazards) {
      if (!hazard.userData.active) continue;
      
      // Only move hazards if canMove is true
      if (!canMove) continue;
      
      // Update hazard movement
      updateHazard(hazard, dt, this.collisionManager, this.arenaSize);
    }

    // Update checkpoints
    for (const checkpoint of this.checkpoints) {
      updateCheckpointAnimation(checkpoint, dt);
    }
  }

  /**
   * Clear all entities
   */
  clearAll() {
    // Remove collectibles
    for (const item of this.collectibles) {
      if (item.userData.glowLight) {
        this.scene.remove(item.userData.glowLight);
      }
      this.scene.remove(item);
      if (item.geometry) item.geometry.dispose();
      if (item.material) item.material.dispose();
    }
    
    // Remove hazards
    for (const hazard of this.hazards) {
      this.scene.remove(hazard);
      // Dispose of all children
      hazard.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }
    
    // Remove checkpoints
    for (const checkpoint of this.checkpoints) {
      if (checkpoint.userData.glowLight) {
        this.scene.remove(checkpoint.userData.glowLight);
      }
      this.scene.remove(checkpoint);
      // Dispose of all children
      checkpoint.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }
    
    // Clean up confetti effects
    for (const effect of this.confettiEffects) {
      removeConfetti(this.scene, effect);
    }
    
    // Reset arrays
    this.collectibles = [];
    this.hazards = [];
    this.checkpoints = [];
    this.collectedIds.clear();
    this.confettiEffects = [];
    this.totalCollectiblesCount = 0;
  }

  /**
   * Get remaining collectibles count
   * @returns {number} Number of uncollected items
   */
  getRemainingCollectibles() {
    return this.collectibles.filter(item => !item.userData.collected).length;
  }

  /**
   * Get total collectibles count (for display)
   * @returns {number} Total collectibles count
   */
  getAllCollectibles() {
    // Return the stored total count if available (for display), otherwise current length
    return this.totalCollectiblesCount > 0 ? this.totalCollectiblesCount : this.collectibles.length;
  }

  /**
   * Get activated checkpoints count
   * @returns {number} Number of activated checkpoints
   */
  getActivatedCheckpoints() {
    return this.checkpoints.filter(cp => cp.userData.activated).length;
  }

  /**
   * Get total checkpoints count
   * @returns {number} Total checkpoints count
   */
  getAllCheckpoints() {
    return this.checkpoints.length;
  }
}

