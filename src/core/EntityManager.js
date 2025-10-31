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
    this.confettiEffects = []; // Store active confetti bursts
    this.totalCollectiblesCount = 0; // Track initial total count for display
  }

  setCollisionManager(collisionManager) {
    this.collisionManager = collisionManager;
  }

  createCollectible(x, z, id) {
    // Create magical crystal gem - faceted crystal shape with red color
    const geo = new THREE.OctahedronGeometry(0.18, 0);
    const color = 0xcc4444; // Red gem color
    
    const mat = new THREE.MeshStandardMaterial({ 
      color: color, 
      emissive: color,
      emissiveIntensity: 0.7,
      metalness: 0.6,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 1.2, z);
    mesh.castShadow = true;
    mesh.userData = { type: 'collectible', id, collected: false, originalColor: color };
    
    // Add magical glow effect with point light - increased range for better ground reflection
    const glowLight = new THREE.PointLight(color, 0.8, 5);
    glowLight.position.set(x, 1.2, z);
    glowLight.decay = 1; // Linear decay for better spread
    mesh.userData.glowLight = glowLight;
    this.scene.add(glowLight);
    
    this.scene.add(mesh);
    this.collectibles.push(mesh);
    return mesh;
  }

  createHazard(x, z, id, size = 0.5) {
    // Create cursed thorn cluster - dark mystical thorn formation
    const group = new THREE.Group();
    
    // Main thorn body - dark purple/black with spikes
    const mainGeo = new THREE.ConeGeometry(size * 0.6, 0.5, 6);
    const mainMat = new THREE.MeshStandardMaterial({ 
      color: 0x2a1a3a,
      emissive: 0x4a1a5a,
      emissiveIntensity: 0.4,
      metalness: 0.1,
      roughness: 0.9
    });
    const mainMesh = new THREE.Mesh(mainGeo, mainMat);
    mainMesh.position.y = 0.25;
    mainMesh.rotation.z = Math.random() * Math.PI * 2;
    group.add(mainMesh);
    
    // Add spike thorns around the base
    const spikeCount = 6;
    for (let i = 0; i < spikeCount; i++) {
      const spikeGeo = new THREE.ConeGeometry(size * 0.15, 0.3, 4);
      const spikeMat = new THREE.MeshStandardMaterial({ 
        color: 0x3a1a4a,
        emissive: 0x5a1a6a,
        emissiveIntensity: 0.3,
        metalness: 0.1,
        roughness: 0.9
      });
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      const angle = (i / spikeCount) * Math.PI * 2;
      spike.position.set(
        Math.cos(angle) * size * 0.4,
        0.15,
        Math.sin(angle) * size * 0.4
      );
      spike.rotation.x = -0.5;
      spike.rotation.z = angle;
      group.add(spike);
    }
    
    group.position.set(x, 0.15, z);
    group.castShadow = true;
    group.receiveShadow = true;
    
    // Add dark magical glow
    const darkGlow = new THREE.PointLight(0x5a1a6a, 0.3, 2);
    darkGlow.position.set(x, 0.3, z);
    this.scene.add(darkGlow);
    
    // Add movement properties for random movement
    const speed = 2 + Math.random() * 2; // Random speed between 2-4 units/sec (harder)
    const direction = Math.random() * Math.PI * 2; // Random initial direction
    group.userData = { 
      type: 'hazard', 
      id, 
      active: true,
      speed: speed,
      direction: direction,
      changeDirectionTimer: 0,
      changeDirectionInterval: 1 + Math.random() * 2, // Change direction every 1-3 seconds
      glowLight: darkGlow
    };
    
    this.scene.add(group);
    this.hazards.push(group);
    return group;
  }

  createCheckpoint(x, z, id) {
    // Create magical crystal shrine - mystical pillar with crystal top
    const group = new THREE.Group();
    
    // Base pillar - stone with mystical runes
    const pillarGeo = new THREE.CylinderGeometry(0.25, 0.3, 1.5, 8);
    const pillarMat = new THREE.MeshStandardMaterial({ 
      color: 0x3a4a4a,
      emissive: 0x2a3a3a,
      emissiveIntensity: 0.2,
      metalness: 0.3,
      roughness: 0.8
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.y = 0.75;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);
    
    // Crystal top - glowing magical crystal
    const crystalGeo = new THREE.OctahedronGeometry(0.35, 1);
    const crystalMat = new THREE.MeshStandardMaterial({ 
      color: 0x6ab89a,
      emissive: 0x4a8a7a,
      emissiveIntensity: 0.6,
      metalness: 0.7,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.y = 2.1;
    crystal.castShadow = true;
    crystal.receiveShadow = true;
    group.add(crystal);
    
    // Magical energy ring around crystal
    const ringGeo = new THREE.TorusGeometry(0.4, 0.05, 8, 16);
    const ringMat = new THREE.MeshStandardMaterial({ 
      color: 0x6ab89a,
      emissive: 0x4a8a7a,
      emissiveIntensity: 0.5,
      metalness: 0.6,
      roughness: 0.3
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 1.8;
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = true;
    ring.receiveShadow = true;
    group.add(ring);
    
    group.position.set(x, 0, z);
    group.castShadow = true;
    group.receiveShadow = true;
    
    // Add mystical glow light
    const shrineLight = new THREE.PointLight(0x6ab89a, 0.6, 3);
    shrineLight.position.set(x, 2, z);
    this.scene.add(shrineLight);
    group.userData = { type: 'checkpoint', id, activated: false, glowLight: shrineLight, crystal: crystal, ring: ring };
    
    this.scene.add(group);
    this.checkpoints.push(group);
    return group;
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
      // Skip items that are collected or fading out
      if (item.userData.collected || item.userData.fadingOut) continue;
      
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
    
    // Remove glow light immediately
    if (item.userData.glowLight) {
      this.scene.remove(item.userData.glowLight);
      item.userData.glowLight = null;
    }
    
    // Create red confetti burst effect
    this._createConfettiBurst(item.position.x, item.position.y, item.position.z);
    
    // Mark as fading out - will be handled in updateAnims for performance
    item.userData.fadingOut = true;
    item.material.transparent = true;
    
    return true;
  }

  activateCheckpoint(checkpoint) {
    if (checkpoint.userData.activated) return false;
    
    checkpoint.userData.activated = true;
    
    // Activate shrine - brighten crystal and ring
    if (checkpoint.userData.crystal) {
      checkpoint.userData.crystal.material.color.setHex(0x8aefcf);
      checkpoint.userData.crystal.material.emissive.setHex(0x6ab89a);
      checkpoint.userData.crystal.material.emissiveIntensity = 1.0;
    }
    
    if (checkpoint.userData.ring) {
      checkpoint.userData.ring.material.color.setHex(0x8aefcf);
      checkpoint.userData.ring.material.emissive.setHex(0x6ab89a);
      checkpoint.userData.ring.material.emissiveIntensity = 0.8;
    }
    
    // Brighten glow light
    if (checkpoint.userData.glowLight) {
      checkpoint.userData.glowLight.color.setHex(0x8aefcf);
      checkpoint.userData.glowLight.intensity = 1.0;
    }
    
    return true;
  }

  spawnCollectiblesForCollection(count = 8) {
    this.clearAll();
    
    // Increase count for large arena (40x40)
    const adjustedCount = this.arenaSize >= 35 ? count * 3 : count; // Triple gems for large arena
    
    const positions = this._generateRandomPositions(adjustedCount, 1.5);
    positions.forEach((pos, index) => {
      this.createCollectible(pos.x, pos.z, `collectible_${index}`);
    });
    
    // Store the total count for display purposes (won't change as gems are removed)
    this.totalCollectiblesCount = adjustedCount;
  }

  spawnHazardsForSurvival(count = 10) {
    this.clearAll();
    
    // Triple hazards for large arena (40x40)
    const adjustedCount = this.arenaSize >= 35 ? count * 3 : count;
    
    const positions = this._generateRandomPositions(adjustedCount, 1.5);
    positions.forEach((pos, index) => {
      const size = 0.5 + Math.random() * 0.3;
      const hazard = this.createHazard(pos.x, pos.z, `hazard_${index}`, size);
      hazard.userData.size = size; // Store size for collision detection
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
    const maxAttempts = 200; // Increased attempts for large arenas
    
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

  _createConfettiBurst(x, y, z) {
    // Create red confetti particles bursting outward from gem position
    const particleCount = 8; // Fewer particles for subtle effect
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = [];
    const lifetimes = [];
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Start at gem position
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
      
      // Reduced velocity for tighter, less spread out effect
      const angle = Math.random() * Math.PI * 2;
      const verticalAngle = (Math.random() - 0.3) * Math.PI * 0.3; // Less vertical spread
      const speed = 1.5 + Math.random() * 1; // Slower speed for less spread
      
      velocities.push({
        x: Math.cos(angle) * Math.cos(verticalAngle) * speed,
        y: Math.sin(verticalAngle) * speed + 1, // Reduced upward bias
        z: Math.sin(angle) * Math.cos(verticalAngle) * speed
      });
      
      // Red confetti colors matching gem color (0xcc4444)
      // Convert gem color (0xcc4444) to normalized RGB: (204/255, 68/255, 68/255)
      const redVariation = Math.random() * 0.1; // Small variation
      colors[i3] = 0.8 + redVariation; // R - gem red (~0.8)
      colors[i3 + 1] = 0.27 + Math.random() * 0.05; // G - gem red (~0.27)
      colors[i3 + 2] = 0.27 + Math.random() * 0.05; // B - gem red (~0.27)
      
      lifetimes.push(0); // Start at 0, fade out over time
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Create confetti texture (small square/rectangle shape)
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const context = canvas.getContext('2d');
    context.fillStyle = 'rgba(255,255,255,1)';
    context.fillRect(4, 2, 8, 12); // Small rectangle for confetti shape
    
    const texture = new THREE.CanvasTexture(canvas);
    
    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.NormalBlending,
      map: texture,
      sizeAttenuation: true
    });
    
    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
    
    // Store confetti effect data with initial colors preserved for proper fade
    this.confettiEffects.push({
      particles,
      geometry,
      velocities,
      lifetimes,
      initialColors: new Float32Array(colors), // Store original colors
      maxLifetime: 1.0 // Duration of effect in seconds
    });
  }

  updateAnims(dt, canMove = true) {
    // Update confetti effects
    const confettiToRemove = [];
    for (let i = 0; i < this.confettiEffects.length; i++) {
      const effect = this.confettiEffects[i];
      const positions = effect.geometry.attributes.position.array;
      const colors = effect.geometry.attributes.color.array;
      
      let maxLifetime = 0;
      for (let j = 0; j < effect.velocities.length; j++) {
        const j3 = j * 3;
        const vel = effect.velocities[j];
        const lifetime = effect.lifetimes[j];
        
        // Update position with velocity and gravity
        positions[j3] += vel.x * dt;
        positions[j3 + 1] += vel.y * dt;
        positions[j3 + 2] += vel.z * dt;
        
        // Apply gravity
        vel.y -= 9.8 * dt; // Gravity
        
        // Update lifetime
        effect.lifetimes[j] = lifetime + dt;
        maxLifetime = Math.max(maxLifetime, effect.lifetimes[j]);
        
        // Keep original gem red color constant (no color fading, only opacity)
        colors[j3] = effect.initialColors[j3]; // Keep original red
        colors[j3 + 1] = effect.initialColors[j3 + 1]; // Keep original green
        colors[j3 + 2] = effect.initialColors[j3 + 2]; // Keep original blue
      }
      
      // Fade out opacity while keeping color constant (fade from gem red to transparent)
      const alpha = Math.max(0, 1 - (maxLifetime / effect.maxLifetime));
      effect.particles.material.opacity = alpha;
      
      effect.geometry.attributes.position.needsUpdate = true;
      effect.geometry.attributes.color.needsUpdate = true;
      
      // Remove if all particles are dead (using maxLifetime calculated above)
      if (maxLifetime >= effect.maxLifetime) {
        confettiToRemove.push(i);
      }
    }
    
    // Remove finished confetti effects (in reverse to preserve indices)
    for (let i = confettiToRemove.length - 1; i >= 0; i--) {
      const index = confettiToRemove[i];
      const effect = this.confettiEffects[index];
      this.scene.remove(effect.particles);
      effect.geometry.dispose();
      effect.particles.material.dispose();
      this.confettiEffects.splice(index, 1);
    }
    
    // Process collected items that are fading out
    const itemsToRemove = [];
    for (const item of this.collectibles) {
      if (item.userData.fadingOut) {
        // Fade out animation using delta time (much faster than recursive requestAnimationFrame)
        const fadeSpeed = 3.0; // fade out over ~0.33 seconds
        item.material.opacity = Math.max(0, item.material.opacity - dt * fadeSpeed);
        item.scale.multiplyScalar(1 - dt * 2.7); // shrink faster
        
        if (item.material.opacity <= 0) {
          itemsToRemove.push(item);
        }
        continue;
      }
      
      if (item.userData.collected) continue;
      
      // Rotate and float with magical animation
      item.rotation.y += dt * 3;
      item.rotation.x += dt * 1.5;
      item.position.y = 1.2 + Math.sin(performance.now() * 0.003 + item.position.x) * 0.15;
      
      // Update glow light position
      if (item.userData.glowLight) {
        item.userData.glowLight.position.set(
          item.position.x,
          item.position.y,
          item.position.z
        );
        // Pulse the glow (base intensity 0.8)
        const pulse = Math.sin(performance.now() * 0.005 + item.position.x) * 0.3 + 0.7;
        item.userData.glowLight.intensity = 0.8 * pulse;
      }
      
      // Pulse emissive intensity
      const pulse = Math.sin(performance.now() * 0.005 + item.position.x) * 0.3 + 0.7;
      item.material.emissiveIntensity = 0.7 * pulse;
    }
    
    // Remove faded out items
    for (const item of itemsToRemove) {
      this.scene.remove(item);
      const index = this.collectibles.indexOf(item);
      if (index > -1) {
        this.collectibles.splice(index, 1);
      }
    }

    for (const hazard of this.hazards) {
      if (!hazard.userData.active) continue;
      
      // Rotation animation for cursed thorn
      hazard.rotation.y += dt * 1.5;
      
      // Keep emissive intensity constant (no blinking)
      hazard.children.forEach(child => {
        if (child.material && child.material.emissiveIntensity !== undefined) {
          child.material.emissiveIntensity = 0.4; // Constant value
        }
      });
      
      // Update glow light position (keep intensity constant)
      if (hazard.userData.glowLight) {
        hazard.userData.glowLight.position.set(
          hazard.position.x,
          hazard.position.y + 0.3,
          hazard.position.z
        );
        hazard.userData.glowLight.intensity = 0.3; // Constant intensity
      }
      
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
        const hazardSize = userData.size || 0.5;
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
      checkpoint.rotation.y += dt * 0.8;
      
      const pulse = checkpoint.userData.activated ? 1.0 : 0.6;
      const variation = Math.sin(performance.now() * 0.003 + checkpoint.position.x) * 0.3;
      
      // Animate crystal and ring
      if (checkpoint.userData.crystal) {
        checkpoint.userData.crystal.rotation.y += dt * 1.5;
        checkpoint.userData.crystal.material.emissiveIntensity = pulse + variation;
      }
      
      if (checkpoint.userData.ring) {
        checkpoint.userData.ring.rotation.z += dt * 0.5;
        checkpoint.userData.ring.material.emissiveIntensity = (checkpoint.userData.activated ? 0.8 : 0.5) + variation * 0.3;
      }
      
      // Pulse glow light
      if (checkpoint.userData.glowLight) {
        const lightPulse = Math.sin(performance.now() * 0.004 + checkpoint.position.x) * 0.2 + 0.8;
        checkpoint.userData.glowLight.intensity = (checkpoint.userData.activated ? 1.0 : 0.6) * lightPulse;
      }
    }
  }

  clearAll() {
    for (const item of this.collectibles) {
      // Remove glow lights
      if (item.userData.glowLight) {
        this.scene.remove(item.userData.glowLight);
      }
      this.scene.remove(item);
    }
    for (const hazard of this.hazards) {
      // Remove glow lights
      if (hazard.userData.glowLight) {
        this.scene.remove(hazard.userData.glowLight);
      }
      this.scene.remove(hazard);
    }
    for (const checkpoint of this.checkpoints) {
      // Remove glow lights
      if (checkpoint.userData.glowLight) {
        this.scene.remove(checkpoint.userData.glowLight);
      }
      this.scene.remove(checkpoint);
    }
    
    // Clean up confetti effects
    for (const effect of this.confettiEffects) {
      this.scene.remove(effect.particles);
      effect.geometry.dispose();
      effect.particles.material.dispose();
    }
    
    this.collectibles = [];
    this.hazards = [];
    this.checkpoints = [];
    this.collectedIds.clear();
    this.confettiEffects = [];
    this.totalCollectiblesCount = 0;
  }

  getRemainingCollectibles() {
    return this.collectibles.filter(item => !item.userData.collected).length;
  }

  getAllCollectibles() {
    // Return the stored total count if available (for display), otherwise current length
    // This ensures the count doesn't decrease as collected items are removed
    return this.totalCollectiblesCount > 0 ? this.totalCollectiblesCount : this.collectibles.length;
  }

  getActivatedCheckpoints() {
    return this.checkpoints.filter(cp => cp.userData.activated).length;
  }

  getAllCheckpoints() {
    return this.checkpoints.length;
  }
}

