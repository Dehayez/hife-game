import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

export class LargeArenaCollisionManager {
  constructor(scene, arenaSize, respawnOverlay = null) {
    this.scene = scene;
    this.arenaSize = arenaSize;
    this.walls = [];
    this.innerWalls = [];
    this.gameModeManager = null;
    
    // Respawn system
    this.isFallingOutside = false;
    this.respawnCountdown = 0;
    this.respawnTime = 3;
    this.respawnOverlay = respawnOverlay;
    
    this._createWalls();
    this._createDiverseObstacles();
  }

  setGameModeManager(gameModeManager) {
    this.gameModeManager = gameModeManager;
    this.updateWallsForMode();
  }

  updateWallsForMode() {
    this._updateInnerWalls();
  }

  _createWalls() {
    // Perimeter walls (slightly inside arena bounds)
    const margin = 0.2;
    const darkerGreen = 0x1a3008;
    this.addWall(0, -(this.arenaSize / 2) + margin, this.arenaSize - margin * 2, 0.4, darkerGreen);
    this.addWall(0, (this.arenaSize / 2) - margin, this.arenaSize - margin * 2, 0.4, darkerGreen);
    this.addWall(-(this.arenaSize / 2) + margin, 0, 0.4, this.arenaSize - margin * 2, darkerGreen);
    this.addWall((this.arenaSize / 2) - margin, 0, 0.4, this.arenaSize - margin * 2, darkerGreen);
  }

  _createDiverseObstacles() {
    const lightGrey = 0x808080;
    const stoneColor = 0x6a6a6a;
    const mossColor = 0x4a6a4a;
    
    // Store obstacle configurations for recreation
    this.obstacleData = [
      // Corridor-style walls forming passageways
      { x: -12, z: -8, w: 2, h: 0.4, type: 'horizontal', color: lightGrey },
      { x: -8, z: -12, w: 0.4, h: 2, type: 'vertical', color: lightGrey },
      { x: 8, z: 12, w: 2, h: 0.4, type: 'horizontal', color: lightGrey },
      { x: 12, z: 8, w: 0.4, h: 2, type: 'vertical', color: lightGrey },
      
      // Central maze-like structures
      { x: 0, z: 8, w: 4, h: 0.4, type: 'horizontal', color: stoneColor },
      { x: 0, z: -8, w: 4, h: 0.4, type: 'horizontal', color: stoneColor },
      { x: 8, z: 0, w: 0.4, h: 4, type: 'vertical', color: stoneColor },
      { x: -8, z: 0, w: 0.4, h: 4, type: 'vertical', color: stoneColor },
      
      // Elevated platforms
      { x: -12, z: -12, w: 1.5, h: 0.4, type: 'horizontal', color: mossColor, height: 2.4 },
      { x: 12, z: 12, w: 1.5, h: 0.4, type: 'horizontal', color: mossColor, height: 2.4 },
      { x: -12, z: 12, w: 1.5, h: 0.4, type: 'horizontal', color: mossColor, height: 2.4 },
      { x: 12, z: -12, w: 1.5, h: 0.4, type: 'horizontal', color: mossColor, height: 2.4 },
      
      // Scattered pillars and blocks
      { x: -6, z: -6, w: 1, h: 1, type: 'square', color: stoneColor },
      { x: 6, z: 6, w: 1, h: 1, type: 'square', color: stoneColor },
      { x: -6, z: 6, w: 1, h: 1, type: 'square', color: stoneColor },
      { x: 6, z: -6, w: 1, h: 1, type: 'square', color: stoneColor },
      
      // Platforms in corner areas
      { x: -15, z: -15, w: 0.4, h: 2, type: 'vertical', color: mossColor },
      { x: 15, z: -15, w: 0.4, h: 2, type: 'vertical', color: mossColor },
      { x: 0, z: -16, w: 6, h: 0.4, type: 'horizontal', color: mossColor },
      
      // Side platforms
      { x: 15, z: 0, w: 0.4, h: 3, type: 'vertical', color: stoneColor },
      { x: -15, z: 0, w: 0.4, h: 3, type: 'vertical', color: stoneColor },
      
      // Bridge-like structures
      { x: -4, z: -4, w: 4, h: 0.6, type: 'bridge', color: lightGrey },
      { x: 4, z: 4, w: 4, h: 0.6, type: 'bridge', color: lightGrey },
      
      // Narrow passage areas (creating fun run challenges)
      { x: 0, z: -16, w: 0.6, h: 0.6, type: 'pillar', color: stoneColor },
      { x: 0, z: 16, w: 0.6, h: 0.6, type: 'pillar', color: stoneColor },
      { x: -16, z: 0, w: 0.6, h: 0.6, type: 'pillar', color: stoneColor },
      { x: 16, z: 0, w: 0.6, h: 0.6, type: 'pillar', color: stoneColor }
    ];
    
    // Check if we should create inner obstacles
    const shouldCreateInnerWalls = !this.gameModeManager || this.gameModeManager.getMode() !== 'survival';
    
    if (shouldCreateInnerWalls) {
      for (const obstacle of this.obstacleData) {
        const wall = this.addObstacle(obstacle);
        this.innerWalls.push(wall);
      }
    }
  }

  _updateInnerWalls() {
    // Remove existing inner walls
    for (const wall of this.innerWalls) {
      this.scene.remove(wall);
      const index = this.walls.indexOf(wall);
      if (index > -1) {
        this.walls.splice(index, 1);
      }
    }
    this.innerWalls = [];

    // Recreate inner walls based on current mode
    this._createInnerWalls();
  }

  _createInnerWalls() {
    const shouldCreateInnerWalls = !this.gameModeManager || this.gameModeManager.getMode() !== 'survival';

    if (shouldCreateInnerWalls && this.obstacleData) {
      for (const obstacle of this.obstacleData) {
        const wall = this.addObstacle(obstacle);
        this.innerWalls.push(wall);
      }
    }
  }

  addObstacle(obstacle) {
    const { x, z, w, h, type, color, height } = obstacle;
    const defaultHeight = height || 1.2;
    
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
        wall = this.addWall(x, z, w, h, color, defaultHeight);
        return wall;
    }
    
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);
    this.walls.push(wall);
    return wall;
  }

  addWall(x, z, w, h, color = 0xe57474, height = 1.2) {
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

  getAABBFor(mesh) {
    const box = new THREE.Box3().setFromObject(mesh);
    return box;
  }

  willCollide(nextPos, playerSize) {
    const half = playerSize / 2;
    const playerBox = new THREE.Box3(
      new THREE.Vector3(nextPos.x - half, nextPos.y, nextPos.z - half),
      new THREE.Vector3(nextPos.x + half, nextPos.y + playerSize, nextPos.z + half)
    );
    
    for (const wall of this.walls) {
      const wallBox = this.getAABBFor(wall);
      if (playerBox.intersectsBox(wallBox)) return true;
    }
    
    return false;
  }

  // Check if a 2D point (x, z) would collide with any obstacle (for gem spawning)
  pointCollidesWithObstacle(x, z, clearance = 1.5) {
    const half = clearance / 2;
    const testBox = new THREE.Box3(
      new THREE.Vector3(x - half, 0, z - half),
      new THREE.Vector3(x + half, 5, z + half) // Check up to reasonable height
    );
    
    for (const wall of this.walls) {
      const wallBox = this.getAABBFor(wall);
      if (testBox.intersectsBox(wallBox)) return true;
    }
    
    return false;
  }

  getGroundHeight(x, z, playerSize) {
    const half = playerSize / 2;
    
    const halfArena = this.arenaSize / 2;
    const isWithinArena = Math.abs(x) < halfArena && Math.abs(z) < halfArena;
    
    if (!isWithinArena) {
      return -Infinity;
    }
    
    let highestPlatform = 0;
    
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

  isOnGround(x, z, y, playerSize, tolerance = 0.1) {
    const groundHeight = this.getGroundHeight(x, z, playerSize);
    return Math.abs(y - groundHeight) <= tolerance;
  }

  updateRespawnSystem(x, z, y, playerSize, dt) {
    const halfArena = this.arenaSize / 2;
    const isWithinArena = Math.abs(x) < halfArena && Math.abs(z) < halfArena;
    
    if (!isWithinArena && y < 0) {
      if (!this.isFallingOutside) {
        this.isFallingOutside = true;
        this.respawnCountdown = this.respawnTime;
        console.log(`Falling outside arena! Respawning in ${this.respawnTime} seconds...`);
        
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
      console.log("Back in arena! Respawn cancelled.");
      
      if (this.respawnOverlay) {
        this.respawnOverlay.hide();
      }
    }
    
    return false;
  }

  getRespawnCountdown() {
    return this.respawnCountdown;
  }

  isRespawnPending() {
    return this.isFallingOutside && this.respawnCountdown > 0;
  }

  resetRespawn() {
    this.isFallingOutside = false;
    this.respawnCountdown = 0;
    
    if (this.respawnOverlay) {
      this.respawnOverlay.immediateReset();
    }
  }

  constrainToArena(position, playerSize) {
    const halfArena = this.arenaSize / 2 - 0.6;
    position.x = Math.max(-halfArena, Math.min(halfArena, position.x));
    position.z = Math.max(-halfArena, Math.min(halfArena, position.z));
    return position;
  }
}

