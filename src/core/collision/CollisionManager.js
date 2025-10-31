/**
 * CollisionManager.js
 * 
 * Main manager for collision detection and wall management.
 * Handles wall creation, collision checks, and respawn system.
 * 
 * This file acts as a facade, delegating to specialized modules:
 * - CollisionStats.js: Collision stats configuration
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getWallStats, getInnerWallPositions, getRespawnStats, getGroundStats } from './CollisionStats.js';

export class CollisionManager {
  /**
   * Create a new CollisionManager
   * @param {Object} scene - THREE.js scene
   * @param {number} arenaSize - Arena size
   * @param {Object} respawnOverlay - Respawn overlay instance
   */
  constructor(scene, arenaSize, respawnOverlay = null) {
    this.scene = scene;
    this.arenaSize = arenaSize;
    this.walls = [];
    this.innerWalls = [];
    this.gameModeManager = null;
    
    // Respawn system
    const respawnStats = getRespawnStats();
    this.isFallingOutside = false;
    this.respawnCountdown = 0;
    this.respawnTime = respawnStats.respawnTime;
    this.respawnOverlay = respawnOverlay;
    
    this._createWalls();
  }

  /**
   * Set the game mode manager
   * @param {Object} gameModeManager - Game mode manager instance
   */
  setGameModeManager(gameModeManager) {
    this.gameModeManager = gameModeManager;
    this.updateWallsForMode();
  }

  /**
   * Update walls based on current game mode
   */
  updateWallsForMode() {
    this._updateInnerWalls();
  }

  /**
   * Create all walls
   * @private
   */
  _createWalls() {
    const wallStats = getWallStats();
    const margin = wallStats.margin;
    
    // Perimeter walls (slightly inside arena bounds)
    const darkerGreen = wallStats.perimeterColor;
    this.addWall(0, -(this.arenaSize / 2) + margin, this.arenaSize - margin * 2, 0.4, darkerGreen);
    this.addWall(0, (this.arenaSize / 2) - margin, this.arenaSize - margin * 2, 0.4, darkerGreen);
    this.addWall(-(this.arenaSize / 2) + margin, 0, 0.4, this.arenaSize - margin * 2, darkerGreen);
    this.addWall((this.arenaSize / 2) - margin, 0, 0.4, this.arenaSize - margin * 2, darkerGreen);

    // Inner obstacles
    this._createInnerWalls();
  }

  /**
   * Create inner walls based on game mode
   * @private
   */
  _createInnerWalls() {
    const wallStats = getWallStats();
    const lightGrey = wallStats.innerWallColor;
    
    // Check if we should create inner walls (not in survival mode)
    const shouldCreateInnerWalls = !this.gameModeManager || this.gameModeManager.getMode() !== 'survival';
    
    if (shouldCreateInnerWalls) {
      // Determine arena type based on size
      const arenaType = this.arenaSize >= 35 ? 'large' : 'standard';
      const innerWallData = getInnerWallPositions(arenaType);

      for (const wallData of innerWallData) {
        const wall = this.addWall(wallData.x, wallData.z, wallData.w, wallData.h, lightGrey);
        this.innerWalls.push(wall);
      }
    }
  }

  /**
   * Update inner walls based on current mode
   * @private
   */
  _updateInnerWalls() {
    // Remove existing inner walls
    for (const wall of this.innerWalls) {
      this.scene.remove(wall);
      const index = this.walls.indexOf(wall);
      if (index > -1) {
        this.walls.splice(index, 1);
      }
      
      // Clean up
      if (wall.geometry) wall.geometry.dispose();
      if (wall.material) wall.material.dispose();
    }
    this.innerWalls = [];

    // Recreate inner walls based on current mode
    this._createInnerWalls();
  }

  /**
   * Add a wall to the scene
   * @param {number} x - X position
   * @param {number} z - Z position
   * @param {number} w - Width
   * @param {number} h - Height
   * @param {number} color - Wall color
   * @returns {THREE.Mesh} Created wall mesh
   */
  addWall(x, z, w, h, color = 0xe57474) {
    const wallStats = getWallStats();
    const height = wallStats.height;
    const wallGeo = new THREE.BoxGeometry(w, height, h);
    const wallMat = new THREE.MeshStandardMaterial({ color });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(x, height / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);
    this.walls.push(wall);
    return wall;
  }

  /**
   * Get AABB for a mesh
   * @param {THREE.Mesh} mesh - Mesh to get AABB for
   * @returns {THREE.Box3} Axis-aligned bounding box
   */
  getAABBFor(mesh) {
    const box = new THREE.Box3().setFromObject(mesh);
    return box;
  }

  /**
   * Check if position will collide with walls
   * @param {THREE.Vector3} nextPos - Next position
   * @param {number} playerSize - Player size
   * @returns {boolean} True if collision will occur
   */
  willCollide(nextPos, playerSize) {
    // Construct a temporary AABB for player at next position
    const half = playerSize / 2;
    const playerBox = new THREE.Box3(
      new THREE.Vector3(nextPos.x - half, nextPos.y, nextPos.z - half),
      new THREE.Vector3(nextPos.x + half, nextPos.y + playerSize, nextPos.z + half)
    );

    // Check collision with all walls
    for (const wall of this.walls) {
      const wallBox = this.getAABBFor(wall);
      if (playerBox.intersectsBox(wallBox)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get ground height at position
   * @param {number} x - X position
   * @param {number} z - Z position
   * @param {number} playerSize - Player size (for obstacle checks)
   * @returns {number} Ground height
   */
  getGroundHeight(x, z, playerSize) {
    const groundStats = getGroundStats();
    
    // Check if position is on an obstacle (wall)
    const nextPos = new THREE.Vector3(x, groundStats.defaultHeight, z);
    if (this.willCollide(nextPos, playerSize)) {
      // On obstacle - return obstacle height
      const wallStats = getWallStats();
      return wallStats.height;
    }
    
    // On base ground
    return groundStats.defaultHeight;
  }

  /**
   * Check if point collides with obstacle
   * @param {number} x - X position
   * @param {number} z - Z position
   * @param {number} radius - Check radius
   * @returns {boolean} True if point collides with obstacle
   */
  pointCollidesWithObstacle(x, z, radius) {
    const nextPos = new THREE.Vector3(x, 0.6, z);
    return this.willCollide(nextPos, radius * 2);
  }

  /**
   * Update respawn system
   * @param {number} x - Player X position
   * @param {number} z - Player Z position
   * @param {number} y - Player Y position
   * @param {number} playerSize - Player size
   * @param {number} dt - Delta time in seconds
   * @returns {boolean} True if respawn should occur
   */
  updateRespawnSystem(x, z, y, playerSize, dt) {
    const respawnStats = getRespawnStats();
    
    // Check if player is falling outside arena
    if (y < respawnStats.fallThreshold) {
      if (!this.isFallingOutside) {
        this.isFallingOutside = true;
        this.respawnCountdown = 0;
        
        if (this.respawnOverlay) {
          this.respawnOverlay.show();
        }
      }
      
      this.respawnCountdown += dt;
      
      if (this.respawnOverlay) {
        const remainingTime = this.respawnTime - this.respawnCountdown;
        this.respawnOverlay.updateCountdown(remainingTime);
      }
      
      // Respawn if countdown complete
      if (this.respawnCountdown >= this.respawnTime) {
        this.isFallingOutside = false;
        this.respawnCountdown = 0;
        
        if (this.respawnOverlay) {
          this.respawnOverlay.hide();
        }
        
        return true; // Signal to respawn player
      }
    } else {
      if (this.isFallingOutside) {
        this.isFallingOutside = false;
        this.respawnCountdown = 0;
        
        if (this.respawnOverlay) {
          this.respawnOverlay.hide();
        }
      }
    }
    
    return false;
  }

  /**
   * Update respawn system (legacy method for backward compatibility)
   * @param {THREE.Vector3} playerPos - Player position
   * @param {number} dt - Delta time in seconds
   * @returns {boolean} True if respawn should occur
   */
  updateRespawn(playerPos, dt) {
    return this.updateRespawnSystem(playerPos.x, playerPos.z, playerPos.y, 0, dt);
  }

  /**
   * Reset respawn state
   */
  resetRespawn() {
    this.isFallingOutside = false;
    this.respawnCountdown = 0;
    
    if (this.respawnOverlay) {
      this.respawnOverlay.hide();
    }
  }
}

