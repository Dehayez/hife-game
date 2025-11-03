/**
 * LargeArenaCollisionManager.js
 * 
 * Collision manager for large arena with diverse obstacles.
 * Extends base collision functionality with pillars, bridges, and platforms.
 * 
 * This file acts as a facade, delegating to specialized modules:
 * - CollisionStats.js: Collision stats configuration (including large arena obstacles)
 * - CollisionManager.js: Base collision functionality
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { CollisionManager } from './CollisionManager.js';
import { getLargeArenaObstacles, getLargeArenaColors, getLargeArenaConfig } from '../config/CollisionStats.js';

export class LargeArenaCollisionManager extends CollisionManager {
  /**
   * Create a new LargeArenaCollisionManager
   * @param {Object} scene - THREE.js scene
   * @param {number} arenaSize - Arena size (should be 40 for large)
   * @param {Object} respawnOverlay - Respawn overlay instance
   */
  constructor(scene, arenaSize, respawnOverlay = null) {
    super(scene, arenaSize, respawnOverlay);
    this.obstacleData = [];
    this._createDiverseObstacles();
  }

  /**
   * Create diverse obstacles for large arena
   * @private
   */
  _createDiverseObstacles() {
    // Check if we should create inner obstacles
    const shouldCreateInnerWalls = !this.gameModeManager || this.gameModeManager.getMode() !== 'survival';
    
    if (shouldCreateInnerWalls) {
      const obstacles = getLargeArenaObstacles();
      this.obstacleData = obstacles;
      
      for (const obstacle of obstacles) {
        const wall = this.addObstacle(obstacle);
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
    this._createDiverseObstacles();
  }

  /**
   * Add an obstacle based on type
   * @param {Object} obstacle - Obstacle configuration
   * @returns {THREE.Mesh} Created obstacle mesh
   */
  addObstacle(obstacle) {
    const { x, z, w, h, type, color, height } = obstacle;
    const wallStats = this.constructor.getWallStats ? this.constructor.getWallStats() : { height: 1.2 };
    const defaultHeight = height || wallStats.height;
    
    let wall;
    
    switch (type) {
      case 'pillar':
        // Cylindrical pillar
        const pillarGeo = new THREE.CylinderGeometry(w / 2, w / 2, defaultHeight, 8);
        const pillarMat = new THREE.MeshStandardMaterial({ color });
        wall = new THREE.Mesh(pillarGeo, pillarMat);
        wall.position.set(x, defaultHeight / 2, z);
        break;
        
      case 'square':
        // Square block
        const squareGeo = new THREE.BoxGeometry(w, defaultHeight, h);
        const squareMat = new THREE.MeshStandardMaterial({ color });
        wall = new THREE.Mesh(squareGeo, squareMat);
        wall.position.set(x, defaultHeight / 2, z);
        break;
        
      case 'bridge':
        // Bridge - thinner and taller
        const bridgeHeight = defaultHeight * 1.5;
        const bridgeGeo = new THREE.BoxGeometry(w, bridgeHeight, h);
        const bridgeMat = new THREE.MeshStandardMaterial({ color });
        wall = new THREE.Mesh(bridgeGeo, bridgeMat);
        wall.position.set(x, bridgeHeight / 2, z);
        break;
        
      default:
        // Regular rectangular wall
        return this.addWall(x, z, w, h, color, defaultHeight);
    }
    
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);
    this.walls.push(wall);
    return wall;
  }

  /**
   * Add a wall (overrides base method to support custom height)
   * @param {number} x - X position
   * @param {number} z - Z position
   * @param {number} w - Width
   * @param {number} h - Height
   * @param {number} color - Wall color
   * @param {number} height - Wall height (optional)
   * @returns {THREE.Mesh} Created wall mesh
   */
  addWall(x, z, w, h, color = 0xe57474, height = null) {
    const wallStats = this.constructor.getWallStats ? this.constructor.getWallStats() : { height: 1.2 };
    const wallHeight = height || wallStats.height;
    const wallGeo = new THREE.BoxGeometry(w, wallHeight, h);
    const wallMat = new THREE.MeshStandardMaterial({ color });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(x, wallHeight / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);
    this.walls.push(wall);
    return wall;
  }

  /**
   * Check if position will collide with walls
   * @param {THREE.Vector3} nextPos - Next position
   * @param {number} playerSize - Player size
   * @returns {boolean} True if collision will occur
   */
  willCollide(nextPos, playerSize) {
    const half = playerSize / 2;
    const playerBox = new THREE.Box3(
      new THREE.Vector3(nextPos.x - half, nextPos.y, nextPos.z - half),
      new THREE.Vector3(nextPos.x + half, nextPos.y + playerSize, nextPos.z + half)
    );
    
    const largeArenaConfig = getLargeArenaConfig();
    
    for (const wall of this.walls) {
      let wallBox = this.getAABBFor(wall);
      
      // In survival mode, extend collision box height to prevent jumping over walls
      if (this.gameModeManager && this.gameModeManager.getMode() === 'survival') {
        wallBox = wallBox.clone();
        wallBox.max.y = largeArenaConfig.survivalWallHeight;
      }
      
      if (playerBox.intersectsBox(wallBox)) return true;
    }
    
    return false;
  }

  /**
   * Get ground height at position (supports platforms)
   * @param {number} x - X position
   * @param {number} z - Z position
   * @param {number} playerSize - Player size
   * @returns {number} Ground height
   */
  getGroundHeight(x, z, playerSize) {
    const half = playerSize / 2;
    const halfArena = this.arenaSize / 2;
    const isWithinArena = Math.abs(x) < halfArena && Math.abs(z) < halfArena;
    
    if (!isWithinArena) {
      return -Infinity;
    }
    
    const largeArenaConfig = getLargeArenaConfig();
    let highestPlatform = 0; // Default ground height
    
    for (const wall of this.walls) {
      const wallBox = this.getAABBFor(wall);
      
      const horizontalOverlap = (x - half) < wallBox.max.x && 
                               (x + half) > wallBox.min.x &&
                               (z - half) < wallBox.max.z && 
                               (z + half) > wallBox.min.z;
      
      if (horizontalOverlap) {
        const platformTop = wallBox.max.y;
        if (platformTop > highestPlatform) {
          highestPlatform = platformTop;
        }
      }
    }
    
    return highestPlatform;
  }

  /**
   * Check if point collides with obstacle (for spawning)
   * @param {number} x - X position
   * @param {number} z - Z position
   * @param {number} clearance - Clearance radius
   * @returns {boolean} True if point collides
   */
  pointCollidesWithObstacle(x, z, clearance = 1.5) {
    const half = clearance / 2;
    const largeArenaConfig = getLargeArenaConfig();
    const testBox = new THREE.Box3(
      new THREE.Vector3(x - half, 0, z - half),
      new THREE.Vector3(x + half, largeArenaConfig.groundCheckHeight, z + half)
    );
    
    for (const wall of this.walls) {
      const wallBox = this.getAABBFor(wall);
      if (testBox.intersectsBox(wallBox)) return true;
    }
    
    return false;
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
    const halfArena = this.arenaSize / 2;
    const isWithinArena = Math.abs(x) < halfArena && Math.abs(z) < halfArena;
    
    if (!isWithinArena && y < 0) {
      if (!this.isFallingOutside) {
        this.isFallingOutside = true;
        this.respawnCountdown = this.respawnTime;
        
        if (this.respawnOverlay) {
          this.respawnOverlay.show(this.respawnCountdown);
        }
      } else {
        this.respawnCountdown -= dt;
        
        if (this.respawnOverlay) {
          this.respawnOverlay.updateCountdown(this.respawnCountdown);
        }
        
        if (this.respawnCountdown <= 0) {
          this.respawnCountdown = 0;
          return true;
        }
      }
    } else if (isWithinArena && this.isFallingOutside) {
      this.isFallingOutside = false;
      this.respawnCountdown = 0;
      
      if (this.respawnOverlay) {
        this.respawnOverlay.hide();
      }
    }
    
    return false;
  }

  /**
   * Constrain position to arena bounds
   * @param {THREE.Vector3} position - Position to constrain
   * @param {number} playerSize - Player size
   * @returns {THREE.Vector3} Constrained position
   */
  constrainToArena(position, playerSize) {
    const largeArenaConfig = getLargeArenaConfig();
    const halfArena = this.arenaSize / 2 - largeArenaConfig.arenaMargin;
    position.x = Math.max(-halfArena, Math.min(halfArena, position.x));
    position.z = Math.max(-halfArena, Math.min(halfArena, position.z));
    return position;
  }
}

