import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

export class EntityManager {
  constructor(scene, arenaSize, collisionManager = null) {
    this.scene = scene;
    this.arenaSize = arenaSize;
    this.collisionManager = collisionManager;
    this.collectibles = [];
    this.hazards = [];
    this.checkpoints = [];
    this.collectedIds = new Set();
  }

  setCollisionManager(collisionManager) {
    this.collisionManager = collisionManager;
  }

  createCollectible(x, z, id) {
    const geo = new THREE.SphereGeometry(0.15, 8, 8);
    const mat = new THREE.MeshStandardMaterial({ 
      color: 0xf9d71c, 
      emissive: 0xf9d71c,
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.2
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 1.2, z);
    mesh.castShadow = true;
    mesh.userData = { type: 'collectible', id, collected: false };
    
    this.scene.add(mesh);
    this.collectibles.push(mesh);
    return mesh;
  }

  createHazard(x, z, id, size = 0.5) {
    const geo = new THREE.BoxGeometry(size, 0.3, size);
    const mat = new THREE.MeshStandardMaterial({ 
      color: 0xe74c3c,
      emissive: 0xe74c3c,
      emissiveIntensity: 0.3,
      metalness: 0.2,
      roughness: 0.8
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.15, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Add movement properties for random movement
    const speed = 2 + Math.random() * 2; // Random speed between 2-4 units/sec (harder)
    const direction = Math.random() * Math.PI * 2; // Random initial direction
    mesh.userData = { 
      type: 'hazard', 
      id, 
      active: true,
      speed: speed,
      direction: direction,
      changeDirectionTimer: 0,
      changeDirectionInterval: 1 + Math.random() * 2 // Change direction every 1-3 seconds
    };
    
    this.scene.add(mesh);
    this.hazards.push(mesh);
    return mesh;
  }

  createCheckpoint(x, z, id) {
    const geo = new THREE.CylinderGeometry(0.3, 0.3, 2, 16);
    const mat = new THREE.MeshStandardMaterial({ 
      color: 0x3c8ce7,
      emissive: 0x3c8ce7,
      emissiveIntensity: 0.4,
      metalness: 0.5,
      roughness: 0.3
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 1, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { type: 'checkpoint', id, activated: false };
    
    this.scene.add(mesh);
    this.checkpoints.push(mesh);
    return mesh;
  }

  checkPlayerCollision(playerPos, playerSize) {
    const halfSize = playerSize / 2;
    const playerBox = new THREE.Box3(
      new THREE.Vector3(playerPos.x - halfSize, playerPos.y - 0.5, playerPos.z - halfSize),
      new THREE.Vector3(playerPos.x + halfSize, playerPos.y + 1.5, playerPos.z + halfSize)
    );

    const results = {
      collectible: null,
      hazard: null,
      checkpoint: null
    };

    for (const item of this.collectibles) {
      if (item.userData.collected) continue;
      
      const itemBox = new THREE.Box3().setFromObject(item);
      if (playerBox.intersectsBox(itemBox)) {
        results.collectible = item;
        break;
      }
    }

    for (const hazard of this.hazards) {
      if (!hazard.userData.active) continue;
      
      const hazardBox = new THREE.Box3().setFromObject(hazard);
      if (playerBox.intersectsBox(hazardBox)) {
        results.hazard = hazard;
        break;
      }
    }

    for (const checkpoint of this.checkpoints) {
      const checkpointBox = new THREE.Box3().setFromObject(checkpoint);
      if (playerBox.intersectsBox(checkpointBox)) {
        results.checkpoint = checkpoint;
        break;
      }
    }

    return results;
  }

  collectItem(item) {
    if (item.userData.collected) return false;
    
    item.userData.collected = true;
    this.collectedIds.add(item.userData.id);
    
    const fadeOut = () => {
      if (item.material.opacity > 0) {
        item.material.opacity -= 0.1;
        item.material.transparent = true;
        item.scale.multiplyScalar(0.9);
        requestAnimationFrame(fadeOut);
      } else {
        this.scene.remove(item);
      }
    };
    fadeOut();
    
    return true;
  }

  activateCheckpoint(checkpoint) {
    if (checkpoint.userData.activated) return false;
    
    checkpoint.userData.activated = true;
    checkpoint.material.color.setHex(0x2ecc71);
    checkpoint.material.emissive.setHex(0x2ecc71);
    checkpoint.material.emissiveIntensity = 0.6;
    
    return true;
  }

  spawnCollectiblesForCollection(count = 8) {
    this.clearAll();
    
    const positions = this._generateRandomPositions(count, 1.5);
    positions.forEach((pos, index) => {
      this.createCollectible(pos.x, pos.z, `collectible_${index}`);
    });
  }

  spawnHazardsForSurvival(count = 10) {
    this.clearAll();
    
    const positions = this._generateRandomPositions(count, 1.5);
    positions.forEach((pos, index) => {
      const size = 0.5 + Math.random() * 0.3;
      this.createHazard(pos.x, pos.z, `hazard_${index}`, size);
    });
  }

  spawnCheckpointsForTimeTrial(count = 5) {
    this.clearAll();
    
    const positions = this._generateCheckpointPath(count);
    positions.forEach((pos, index) => {
      this.createCheckpoint(pos.x, pos.z, `checkpoint_${index}`);
    });
  }

  _generateRandomPositions(count, minDistance) {
    const positions = [];
    const halfArena = this.arenaSize / 2 - 2;
    const maxAttempts = 100;
    
    for (let i = 0; i < count; i++) {
      let attempts = 0;
      let valid = false;
      let x, z;
      
      while (!valid && attempts < maxAttempts) {
        x = (Math.random() - 0.5) * halfArena * 2;
        z = (Math.random() - 0.5) * halfArena * 2;
        
        valid = true;
        for (const existing of positions) {
          const dx = x - existing.x;
          const dz = z - existing.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < minDistance) {
            valid = false;
            break;
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

  updateAnims(dt, canMove = true) {
    for (const item of this.collectibles) {
      if (item.userData.collected) continue;
      item.rotation.y += dt * 2;
      item.position.y = 1.2 + Math.sin(performance.now() * 0.003 + item.position.x) * 0.1;
    }

    for (const hazard of this.hazards) {
      if (!hazard.userData.active) continue;
      
      // Rotation animation
      hazard.rotation.y += dt * 1;
      
      // Pulse animation
      const pulse = Math.sin(performance.now() * 0.005 + hazard.position.x) * 0.5 + 0.5;
      hazard.material.emissiveIntensity = 0.3 + pulse * 0.4;
      
      // Only move hazards if countdown is complete
      if (!canMove) continue;
      
      // Random movement
      const userData = hazard.userData;
      userData.changeDirectionTimer += dt;
      
      // Change direction periodically
      if (userData.changeDirectionTimer >= userData.changeDirectionInterval) {
        userData.direction = Math.random() * Math.PI * 2;
        userData.changeDirectionTimer = 0;
        userData.changeDirectionInterval = 1 + Math.random() * 2;
      }
      
      // Move hazard
      const moveX = Math.cos(userData.direction) * userData.speed * dt;
      const moveZ = Math.sin(userData.direction) * userData.speed * dt;
      const newX = hazard.position.x + moveX;
      const newZ = hazard.position.z + moveZ;
      
      // Check wall collision for hazards
      if (this.collisionManager) {
        const hazardSize = hazard.geometry.parameters.width;
        const nextPos = new THREE.Vector3(newX, hazard.position.y, newZ);
        
        if (!this.collisionManager.willCollide(nextPos, hazardSize)) {
          hazard.position.x = newX;
          hazard.position.z = newZ;
        } else {
          // Bounce off wall - reverse direction
          userData.direction += Math.PI + (Math.random() - 0.5) * 0.5;
          userData.changeDirectionTimer = 0;
        }
      } else {
        // No collision manager, just move (with arena bounds check)
        const halfArena = this.arenaSize / 2 - 1;
        if (Math.abs(newX) < halfArena && Math.abs(newZ) < halfArena) {
          hazard.position.x = newX;
          hazard.position.z = newZ;
        } else {
          // Bounce off arena edge
          userData.direction += Math.PI + (Math.random() - 0.5) * 0.5;
          userData.changeDirectionTimer = 0;
        }
      }
    }

    for (const checkpoint of this.checkpoints) {
      checkpoint.rotation.y += dt * 0.5;
      const pulse = checkpoint.userData.activated ? 0.6 : 0.4;
      const variation = Math.sin(performance.now() * 0.003 + checkpoint.position.x) * 0.2;
      checkpoint.material.emissiveIntensity = pulse + variation;
    }
  }

  clearAll() {
    for (const item of this.collectibles) {
      this.scene.remove(item);
    }
    for (const hazard of this.hazards) {
      this.scene.remove(hazard);
    }
    for (const checkpoint of this.checkpoints) {
      this.scene.remove(checkpoint);
    }
    
    this.collectibles = [];
    this.hazards = [];
    this.checkpoints = [];
    this.collectedIds.clear();
  }

  getRemainingCollectibles() {
    return this.collectibles.filter(item => !item.userData.collected).length;
  }

  getAllCollectibles() {
    return this.collectibles.length;
  }

  getActivatedCheckpoints() {
    return this.checkpoints.filter(cp => cp.userData.activated).length;
  }

  getAllCheckpoints() {
    return this.checkpoints.length;
  }
}

