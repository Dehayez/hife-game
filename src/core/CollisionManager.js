import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

export class CollisionManager {
  constructor(scene, arenaSize, respawnOverlay = null) {
    this.scene = scene;
    this.arenaSize = arenaSize;
    this.walls = [];
    
    // Respawn system
    this.isFallingOutside = false;
    this.respawnCountdown = 0;
    this.respawnTime = 3; // 3 seconds countdown
    this.respawnOverlay = respawnOverlay;
    
    this._createWalls();
  }

  _createWalls() {
    // Perimeter walls (slightly inside arena bounds)
    const margin = 0.2;
    this.addWall(0, -(this.arenaSize / 2) + margin, this.arenaSize - margin * 2, 0.4);
    this.addWall(0, (this.arenaSize / 2) - margin, this.arenaSize - margin * 2, 0.4);
    this.addWall(-(this.arenaSize / 2) + margin, 0, 0.4, this.arenaSize - margin * 2);
    this.addWall((this.arenaSize / 2) - margin, 0, 0.4, this.arenaSize - margin * 2);

    // Inner obstacles
    this.addWall(-4, -2, 6, 0.4);
    this.addWall(3, 3, 0.4, 6);
    this.addWall(-2, 5, 4, 0.4);
  }

  addWall(x, z, w, h) {
    const height = 1.2;
    const wallGeo = new THREE.BoxGeometry(w, height, h);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe57474 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(x, height / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);
    this.walls.push(wall);
  }

  getAABBFor(mesh) {
    const box = new THREE.Box3().setFromObject(mesh);
    return box;
  }

  willCollide(nextPos, playerSize) {
    // Construct a temporary AABB for player at next position
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

  getGroundHeight(x, z, playerSize) {
    // Check if player is standing on top of any platform
    const half = playerSize / 2;
    
    // Check if player is within arena bounds
    const halfArena = this.arenaSize / 2;
    const isWithinArena = Math.abs(x) < halfArena && Math.abs(z) < halfArena;
    
    // If outside arena, return negative infinity for endless fall
    if (!isWithinArena) {
      return -Infinity; // Endless fall outside arena
    }
    
    let highestPlatform = 0; // Default ground level within arena
    
    for (const wall of this.walls) {
      const wallBox = this.getAABBFor(wall);
      
      // Check if player is horizontally overlapping with this wall/platform
      const horizontalOverlap = (x - half) < wallBox.max.x && 
                               (x + half) > wallBox.min.x &&
                               (z - half) < wallBox.max.z && 
                               (z + half) > wallBox.min.z;
      
      if (horizontalOverlap) {
        // Player is over this platform, check if it's the highest one
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
    
    // Check if player is falling outside arena
    if (!isWithinArena && y < 0) {
      if (!this.isFallingOutside) {
        // Just started falling outside
        this.isFallingOutside = true;
        this.respawnCountdown = this.respawnTime;
        console.log(`Falling outside arena! Respawning in ${this.respawnTime} seconds...`);
        
        // Show respawn overlay
        if (this.respawnOverlay) {
          this.respawnOverlay.show(this.respawnCountdown);
        }
      } else {
        // Continue countdown
        this.respawnCountdown -= dt;
        
        // Update overlay countdown
        if (this.respawnOverlay) {
          this.respawnOverlay.updateCountdown(this.respawnCountdown);
        }
        
        if (this.respawnCountdown <= 0) {
          this.respawnCountdown = 0;
          return true; // Signal to respawn
        }
      }
    } else if (isWithinArena && this.isFallingOutside) {
      // Player is back in arena, cancel respawn
      this.isFallingOutside = false;
      this.respawnCountdown = 0;
      console.log("Back in arena! Respawn cancelled.");
      
      // Hide respawn overlay
      if (this.respawnOverlay) {
        this.respawnOverlay.hide();
      }
    }
    
    return false; // No respawn needed
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
    
    // Reset the overlay
    if (this.respawnOverlay) {
      this.respawnOverlay.reset();
    }
  }

  constrainToArena(position, playerSize) {
    const halfArena = this.arenaSize / 2 - 0.6; // keep small offset from perimeter walls
    position.x = Math.max(-halfArena, Math.min(halfArena, position.x));
    position.z = Math.max(-halfArena, Math.min(halfArena, position.z));
    return position;
  }
}
