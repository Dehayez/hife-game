import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

export class CollisionManager {
  constructor(scene, arenaSize) {
    this.scene = scene;
    this.arenaSize = arenaSize;
    this.walls = [];
    
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
      new THREE.Vector3(nextPos.x - half, 0, nextPos.z - half),
      new THREE.Vector3(nextPos.x + half, playerSize, nextPos.z + half)
    );
    
    for (const wall of this.walls) {
      const wallBox = this.getAABBFor(wall);
      if (playerBox.intersectsBox(wallBox)) return true;
    }
    
    return false;
  }

  constrainToArena(position, playerSize) {
    const halfArena = this.arenaSize / 2 - 0.6; // keep small offset from perimeter walls
    position.x = Math.max(-halfArena, Math.min(halfArena, position.x));
    position.z = Math.max(-halfArena, Math.min(halfArena, position.z));
    return position;
  }
}
