import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

export class ProjectileManager {
  constructor(scene, collisionManager = null) {
    this.scene = scene;
    this.collisionManager = collisionManager;
    this.projectiles = [];
    this.projectileSpeed = 8; // units per second (slower for firebolt)
    this.projectileLifetime = 3; // seconds
    
    // Character-specific stats
    this.characterStats = {
      lucy: {
        damage: 20, // Lower damage
        cooldown: 0.6, // Slower shooting (higher cooldown for firebolt)
        color: 0xff6b9d, // Pink/magenta color
        size: 0.08, // Smaller projectile
        projectileSpeed: 8, // Character-specific projectile speed
        mortarDamage: 35, // Lower mortar damage (direct hit)
        mortarAreaDamage: 10, // Area damage per tick
        mortarCooldown: 2.5, // Increased mortar cooldown
        mortarArcHeight: 3.0, // Lower arc
        mortarSplashRadius: 0.8, // Smaller fire splash
        mortarFireDuration: 1.5, // Fire persists shorter
        mortarShrinkDelay: 0.8, // Wait time before shrinking starts (increased)
        name: 'Lucy'
      },
      herald: {
        damage: 35, // Higher damage
        cooldown: .8, // Slower shooting (higher cooldown for firebolt)
        color: 0xff8c42, // Orange color
        size: 0.18, // Bigger projectile
        projectileSpeed: 9, // Character-specific projectile speed
        mortarDamage: 50, // Higher mortar damage (direct hit)
        mortarAreaDamage: 15, // Area damage per tick
        mortarCooldown: 3.5, // Slower mortar shooting - increased cooldown
        mortarArcHeight: 4.0, // Moderate arc for fireball effect
        mortarSplashRadius: 1.0, // Smaller fire splash
        mortarFireDuration: 2.0, // Fire persists longer
        mortarShrinkDelay: 1.0, // Wait time before shrinking starts (increased)
        name: 'Herald'
      }
    };
    
    // Default stats
    this.projectileDamage = 25;
    this.shootCooldown = 0.3;
    
    // Per-character cooldown tracking
    this.characterCooldowns = new Map();
    
    // Mortar/bomb stats
    this.mortars = [];
    this.mortarLifetime = 5; // seconds
    this.mortarGravity = -20; // Gravity for arc
    this.mortarCharacterCooldowns = new Map(); // Separate cooldown for mortars
    this.fireAreas = []; // Fire splash areas after impact
  }

  setCollisionManager(collisionManager) {
    this.collisionManager = collisionManager;
  }

  createProjectile(startX, startY, startZ, directionX, directionZ, playerId = 'local', characterName = 'lucy') {
    // Get character-specific stats
    const stats = this.characterStats[characterName] || this.characterStats.lucy;
    const characterCooldown = stats.cooldown;
    const characterDamage = stats.damage;
    const characterColor = stats.color;
    const characterSize = stats.size || 0.1;
    const characterSpeed = stats.projectileSpeed || this.projectileSpeed; // Use character-specific speed or fallback to global
    
    // Check cooldown for this specific character
    const currentCooldown = this.characterCooldowns.get(playerId) || 0;
    if (currentCooldown > 0) return null;

    // Normalize direction
    const dirLength = Math.sqrt(directionX * directionX + directionZ * directionZ);
    if (dirLength < 0.001) return null;
    
    const normX = directionX / dirLength;
    const normZ = directionZ / dirLength;

    // Create magical projectile - glowing sphere with character-specific color and size
    const geo = new THREE.SphereGeometry(characterSize, 8, 8);
    const color = characterColor;
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.9,
      metalness: 0.7,
      roughness: 0.2
    });
    
    const projectile = new THREE.Mesh(geo, mat);
    // Use the provided Y position (character's height)
    projectile.position.set(startX, startY, startZ);
    projectile.castShadow = true;
    
    // Add trail effect - point light with character color
    const trailLight = new THREE.PointLight(color, 1.0, 3);
    trailLight.position.set(startX, startY, startZ);
    this.scene.add(trailLight);
    
    // Store projectile data with character-specific damage, size, and speed
    projectile.userData = {
      type: 'projectile',
      playerId: playerId,
      characterName: characterName,
      velocityX: normX * characterSpeed,
      velocityZ: normZ * characterSpeed,
      lifetime: 0,
      trailLight: trailLight,
      damage: characterDamage,
      size: characterSize
    };
    
    this.scene.add(projectile);
    this.projectiles.push(projectile);
    
    // Set cooldown for this specific character/player
    this.characterCooldowns.set(playerId, characterCooldown);
    
    return projectile;
  }
  
  setCharacter(characterName) {
    // Reset all cooldowns when character changes
    this.characterCooldowns.clear();
  }
  
  getCharacterStats(characterName) {
    return this.characterStats[characterName] || this.characterStats.lucy;
  }

  update(dt) {
    // Update cooldowns for all characters
    for (const [playerId, cooldown] of this.characterCooldowns.entries()) {
      const newCooldown = Math.max(0, cooldown - dt);
      if (newCooldown > 0) {
        this.characterCooldowns.set(playerId, newCooldown);
      } else {
        this.characterCooldowns.delete(playerId);
      }
    }
    
    // Update mortar cooldowns
    for (const [playerId, cooldown] of this.mortarCharacterCooldowns.entries()) {
      const newCooldown = Math.max(0, cooldown - dt);
      if (newCooldown > 0) {
        this.mortarCharacterCooldowns.set(playerId, newCooldown);
      } else {
        this.mortarCharacterCooldowns.delete(playerId);
      }
    }
    
    // Update mortars (arc physics)
    const mortarsToRemove = [];
    for (const mortar of this.mortars) {
      // Update lifetime
      mortar.userData.lifetime += dt;
      
      // Remove if lifetime exceeded
      if (mortar.userData.lifetime >= this.mortarLifetime) {
        mortarsToRemove.push(mortar);
        continue;
      }
      
      // Update velocity (apply gravity)
      mortar.userData.velocityY += this.mortarGravity * dt;
      
      // Update position
      const newX = mortar.position.x + mortar.userData.velocityX * dt;
      const newY = mortar.position.y + mortar.userData.velocityY * dt;
      const newZ = mortar.position.z + mortar.userData.velocityZ * dt;
      
      // Check ground collision - use target position for accurate landing
      const targetX = mortar.userData.targetX;
      const targetZ = mortar.userData.targetZ;
      
      // Get ground height at the mortar's current position (not just target)
      const currentGroundHeight = this.collisionManager 
        ? this.collisionManager.getGroundHeight(mortar.position.x, mortar.position.z, mortar.userData.size)
        : 0.6;
      
      // Calculate the bottom of the mortar sphere
      const mortarBottom = newY - mortar.userData.size;
      
      // Check if mortar has actually hit the ground (bottom of sphere touches ground)
      // Also check if we're close to target and moving downward
      const distanceToTarget = Math.sqrt(
        (newX - targetX) ** 2 + 
        (newZ - targetZ) ** 2
      );
      const isMovingDownward = mortar.userData.velocityY < 0;
      const isNearTarget = distanceToTarget < 1.0; // Close to target horizontally
      
      // Only explode if:
      // 1. The bottom of the mortar has actually reached or passed the ground surface
      // 2. AND we're moving downward (not still ascending)
      // 3. AND we're close to the target position
      if (mortarBottom <= currentGroundHeight && isMovingDownward && isNearTarget) {
        // Hit ground - create fire splash at actual impact location
        const impactGroundHeight = this.collisionManager 
          ? this.collisionManager.getGroundHeight(targetX, targetZ, mortar.userData.size)
          : 0.6;
        this.createFireSplash(targetX, impactGroundHeight, targetZ, mortar.userData);
        mortarsToRemove.push(mortar);
        mortar.userData.hasExploded = true;
      } else {
        mortar.position.set(newX, newY, newZ);
      }
      
      // Update trail light position
      if (mortar.userData.trailLight) {
        mortar.userData.trailLight.position.set(newX, newY, newZ);
      }
      
      // Rotate mortar for visual effect
      mortar.rotation.x += dt * 3;
      mortar.rotation.y += dt * 3;
    }
    
    // Remove exploded or expired mortars
    for (const mortar of mortarsToRemove) {
      this.removeMortar(mortar);
    }
    
    // Update fire splash areas
    this.updateFireAreas(dt);
    
    // Update regular projectiles
    const projectilesToRemove = [];
    
    for (const projectile of this.projectiles) {
      // Update lifetime
      projectile.userData.lifetime += dt;
      
      // Remove if lifetime exceeded
      if (projectile.userData.lifetime >= this.projectileLifetime) {
        projectilesToRemove.push(projectile);
        continue;
      }
      
      // Update position
      const newX = projectile.position.x + projectile.userData.velocityX * dt;
      const newZ = projectile.position.z + projectile.userData.velocityZ * dt;
      
      // Check collision with walls
      let shouldRemove = false;
      if (this.collisionManager) {
        // Use character-specific size from projectile userData
        const projectileSize = projectile.userData.size || 0.1;
        const nextPos = new THREE.Vector3(newX, projectile.position.y, newZ);
        
        if (this.collisionManager.willCollide(nextPos, projectileSize)) {
          shouldRemove = true;
        } else {
          projectile.position.x = newX;
          projectile.position.z = newZ;
        }
      } else {
        // Simple arena bounds check
        const halfArena = 15; // Default arena size / 2
        if (Math.abs(newX) > halfArena || Math.abs(newZ) > halfArena) {
          shouldRemove = true;
        } else {
          projectile.position.x = newX;
          projectile.position.z = newZ;
        }
      }
      
      // Update trail light position
      if (projectile.userData.trailLight) {
        projectile.userData.trailLight.position.set(
          projectile.position.x,
          projectile.position.y,
          projectile.position.z
        );
      }
      
      // Rotate projectile for visual effect
      projectile.rotation.x += dt * 5;
      projectile.rotation.y += dt * 5;
      
      if (shouldRemove) {
        projectilesToRemove.push(projectile);
      }
    }
    
    // Remove expired or collided projectiles
    for (const projectile of projectilesToRemove) {
      this.removeProjectile(projectile);
    }
  }

  checkPlayerCollision(playerPos, playerSize, playerId = 'local') {
    const halfSize = playerSize / 2;
    const playerBox = new THREE.Box3(
      new THREE.Vector3(playerPos.x - halfSize, playerPos.y - 0.5, playerPos.z - halfSize),
      new THREE.Vector3(playerPos.x + halfSize, playerPos.y + 1.5, playerPos.z + halfSize)
    );

    // Check regular projectiles
    for (const projectile of this.projectiles) {
      // Don't hit yourself
      if (projectile.userData.playerId === playerId) continue;
      
      const projectileBox = new THREE.Box3().setFromObject(projectile);
      if (playerBox.intersectsBox(projectileBox)) {
        const damage = projectile.userData.damage;
        this.removeProjectile(projectile);
        return { hit: true, damage: damage, projectile: projectile };
      }
    }
    
    // Check mortars (explosion radius)
    for (const mortar of this.mortars) {
      if (mortar.userData.playerId === playerId) continue;
      
      // Check if mortar is near player (explosion radius)
      const dx = playerPos.x - mortar.position.x;
      const dy = playerPos.y - mortar.position.y;
      const dz = playerPos.z - mortar.position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const explosionRadius = 2.0; // Radius of explosion
      
      if (distance < explosionRadius) {
        const damage = mortar.userData.damage;
        // Don't remove mortar here - let it hit ground first
        return { hit: true, damage: damage, projectile: mortar, isMortar: true };
      }
    }
    
    return { hit: false };
  }

  checkMortarGroundCollision(playerPos, playerSize, playerId = 'local') {
    // Check mortars that hit ground - direct hit damage
    for (const mortar of this.mortars) {
      if (mortar.userData.hasExploded || mortar.userData.playerId === playerId) continue;
      
      // Check if player is at exact impact point (direct hit)
      const targetX = mortar.userData.targetX;
      const targetZ = mortar.userData.targetZ;
      const dx = playerPos.x - targetX;
      const dz = playerPos.z - targetZ;
      const distance = Math.sqrt(dx * dx + dz * dz);
      const directHitRadius = 0.8; // Small radius for direct hit
      
      if (distance < directHitRadius) {
        // Direct hit - full damage
        const damage = mortar.userData.damage;
        mortar.userData.hasExploded = true;
        return { hit: true, damage: damage, projectile: mortar, isMortar: true, isDirectHit: true };
      }
    }
    
    // Check fire areas for area damage
    const fireCollision = this.checkFireAreaCollision(playerPos, playerSize, playerId);
    if (fireCollision.hit) {
      return fireCollision;
    }
    
    return { hit: false };
  }

  removeProjectile(projectile) {
    // Remove trail light
    if (projectile.userData.trailLight) {
      this.scene.remove(projectile.userData.trailLight);
    }
    
    // Remove from scene
    this.scene.remove(projectile);
    
    // Clean up geometry and material
    projectile.geometry.dispose();
    projectile.material.dispose();
    
    // Remove from array
    const index = this.projectiles.indexOf(projectile);
    if (index > -1) {
      this.projectiles.splice(index, 1);
    }
  }

  removeMortar(mortar) {
    // Remove trail light
    if (mortar.userData.trailLight) {
      this.scene.remove(mortar.userData.trailLight);
    }
    
    // Remove from scene
    this.scene.remove(mortar);
    
    // Clean up geometry and material
    mortar.geometry.dispose();
    mortar.material.dispose();
    
    // Remove from array
    const index = this.mortars.indexOf(mortar);
    if (index > -1) {
      this.mortars.splice(index, 1);
    }
  }

  clearAll() {
    for (const projectile of [...this.projectiles]) {
      this.removeProjectile(projectile);
    }
    for (const mortar of [...this.mortars]) {
      this.removeMortar(mortar);
    }
    for (const fireArea of [...this.fireAreas]) {
      this.removeFireArea(fireArea);
    }
    this.projectiles = [];
    this.mortars = [];
    this.fireAreas = [];
  }

  getProjectiles() {
    return this.projectiles;
  }

  canShoot(playerId = null) {
    // If player ID provided, check cooldown for that specific player/character
    if (playerId) {
      const cooldown = this.characterCooldowns.get(playerId) || 0;
      return cooldown <= 0;
    }
    // Otherwise, check if any character can shoot (for general checks)
    // Return true if any cooldown is ready or if no cooldowns are active
    return this.characterCooldowns.size === 0 || 
           Array.from(this.characterCooldowns.values()).some(cd => cd <= 0);
  }

  createMortar(startX, startY, startZ, targetX, targetZ, playerId = 'local', characterName = 'lucy') {
    // Get character-specific stats
    const stats = this.characterStats[characterName] || this.characterStats.lucy;
    const mortarCooldown = stats.mortarCooldown || 1.5;
    const mortarDamage = stats.mortarDamage || 35;
    const mortarAreaDamage = stats.mortarAreaDamage || 10;
    const mortarArcHeight = stats.mortarArcHeight || 5.0;
    const mortarSplashRadius = stats.mortarSplashRadius || 2.0;
    const mortarFireDuration = stats.mortarFireDuration || 1.5;
    const characterColor = stats.color;
    
    // Check mortar cooldown for this specific character
    const currentCooldown = this.mortarCharacterCooldowns.get(playerId) || 0;
    if (currentCooldown > 0) return null;

    // Calculate arc trajectory - improved targeting to hit exact target
    const dx = targetX - startX;
    const dz = targetZ - startZ;
    const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
    
    if (horizontalDistance < 0.1) return null;
    
    // Calculate trajectory to hit exact target with specified arc height
    // Use physics: v_y^2 = 2 * g * h_max, where h_max is mortarArcHeight
    const gravity = Math.abs(this.mortarGravity);
    const timeToPeak = Math.sqrt(2 * mortarArcHeight / gravity);
    const totalTime = timeToPeak * 2; // Time to go up and down
    const horizontalSpeed = horizontalDistance / totalTime;
    const verticalSpeed = gravity * timeToPeak; // Initial vertical velocity
    
    const launchVelocityX = (dx / horizontalDistance) * horizontalSpeed;
    const launchVelocityZ = (dz / horizontalDistance) * horizontalSpeed;
    const launchVelocityY = verticalSpeed;

    // Create mortar/bomb - fireball effect for Herald
    const isHerald = characterName === 'herald';
    const size = isHerald ? 0.25 : 0.12; // Bigger fireball for Herald
    const geo = new THREE.SphereGeometry(size, 12, 12);
    
    // Fireball effect for Herald - more intense
    const baseColor = characterColor;
    const mat = new THREE.MeshStandardMaterial({
      color: baseColor,
      emissive: baseColor,
      emissiveIntensity: isHerald ? 1.2 : 0.8,
      metalness: 0.3,
      roughness: 0.2
    });
    
    const mortar = new THREE.Mesh(geo, mat);
    mortar.position.set(startX, startY, startZ);
    mortar.castShadow = true;
    
    // Enhanced trail effect - brighter for Herald fireball
    const lightIntensity = isHerald ? 5 : 1.2; // Higher intensity for Herald
    const lightRange = isHerald ? 10 : 4; // Larger range for Herald
    const trailLight = new THREE.PointLight(baseColor, lightIntensity, lightRange);
    trailLight.position.set(startX, startY, startZ);
    this.scene.add(trailLight);
    
    // Store mortar data with target position for exact landing
    mortar.userData = {
      type: 'mortar',
      playerId: playerId,
      characterName: characterName,
      velocityX: launchVelocityX,
      velocityY: launchVelocityY,
      velocityZ: launchVelocityZ,
      lifetime: 0,
      trailLight: trailLight,
      damage: mortarDamage, // Direct hit damage
      areaDamage: mortarAreaDamage, // Area damage per tick
      size: size,
      hasExploded: false,
      targetX: targetX, // Exact target position
      targetZ: targetZ,
      splashRadius: mortarSplashRadius,
      fireDuration: mortarFireDuration
    };
    
    this.scene.add(mortar);
    this.mortars.push(mortar);
    
    // Set mortar cooldown for this specific character/player
    this.mortarCharacterCooldowns.set(playerId, mortarCooldown);
    
    return mortar;
  }

  canShootMortar(playerId = null) {
    // If player ID provided, check mortar cooldown for that specific player/character
    if (playerId) {
      const cooldown = this.mortarCharacterCooldowns.get(playerId) || 0;
      return cooldown <= 0;
    }
    return true;
  }

  createFireSplash(x, y, z, mortarData) {
    const splashRadius = mortarData.splashRadius || 1.0;
    const fireDuration = mortarData.fireDuration || 1.5;
    const shrinkDelay = mortarData.mortarShrinkDelay || 0.5;
    const areaDamage = mortarData.areaDamage || 10;
    const characterColor = mortarData.characterName === 'herald' ? 0xff4500 : 0xff6b9d;
    
    // Create fire effect - particle system or glowing planes
    const fireContainer = new THREE.Object3D();
    // Position at exact impact point (y is ground height)
    fireContainer.position.set(x, y + 0.05, z); // Slightly above ground
    
    // Create radial gradient texture for opacity (opaque center, transparent edges)
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Opaque center
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // Transparent edges
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    const opacityTexture = new THREE.CanvasTexture(canvas);
    opacityTexture.needsUpdate = true;
    
    // Create fire base - glowing circle with radial opacity gradient
    const fireGeo = new THREE.CircleGeometry(splashRadius, 32); // More segments for smoother gradient
    const fireMat = new THREE.MeshStandardMaterial({
      color: characterColor,
      emissive: characterColor,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 1.0, // Base opacity (gradient texture handles radial fade)
      alphaMap: opacityTexture, // Radial opacity gradient
      side: THREE.DoubleSide,
      metalness: 0.1,
      roughness: 0.9
    });
    const fireBase = new THREE.Mesh(fireGeo, fireMat);
    fireBase.rotation.x = -Math.PI / 2; // Lay flat on ground
    fireBase.scale.set(0, 0, 0); // Start at impact point (scale 0)
    fireContainer.add(fireBase);
    
    // Create fire particle system
    const particleCount = 20;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    const initialLifetimes = new Float32Array(particleCount);
    
    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // Random position within splash radius - start slightly above fire base
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * splashRadius;
      positions[i3] = radius * Math.cos(angle);
      positions[i3 + 1] = 0.1; // Start above fire base circle (which is at 0.05)
      positions[i3 + 2] = radius * Math.sin(angle);
      
      // Slow upward velocity for fire-like effect with gentle turbulence
      velocities[i3] = (Math.random() - 0.5) * 0.2; // Gentle horizontal drift
      velocities[i3 + 1] = 0.3 + Math.random() * 0.2; // Slow upward velocity
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.2; // Gentle horizontal drift
      
      // Longer lifetime so particles have time to rise and fade
      const lifetime = 0.8 + Math.random() * 0.6;
      lifetimes[i] = 0;
      initialLifetimes[i] = lifetime;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: characterColor,
      size: 0.15,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true // Enable depth testing so particles render correctly relative to other objects
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    fireContainer.add(particles);
    
    // Add point light for fire glow - positioned at exact impact point
    // Higher intensity for Herald's fire
    const isHeraldFire = mortarData.characterName === 'herald';
    const fireLightIntensity = isHeraldFire ? 3.5 : 2.0; // Brighter for Herald
    const fireLightRange = isHeraldFire ? splashRadius * 3 : splashRadius * 2; // Larger range for Herald
    const fireLight = new THREE.PointLight(characterColor, fireLightIntensity, fireLightRange);
    fireLight.position.set(x, y + 0.3, z); // Position at exact impact point, slightly above ground
    fireLight.intensity = 0; // Start at 0, fade in during expansion
    this.scene.add(fireLight); // Add directly to scene at correct position
    
    // Store fire area data with initial radius for shrinking
    fireContainer.userData = {
      type: 'fireSplash',
      damagePerTick: areaDamage,
      initialRadius: splashRadius, // Store initial radius for shrinking
      radius: splashRadius, // Current radius (will shrink)
      lifetime: 0,
      duration: fireDuration,
      shrinkDelay: shrinkDelay, // Wait time before shrinking starts
      shrinkDuration: fireDuration - shrinkDelay, // Time available for shrinking
      expandDuration: 0.2, // Fast expansion animation (0.2 seconds)
      position: new THREE.Vector3(x, y, z), // Exact impact position
      fireLight: fireLight,
      fireLightIntensity: fireLightIntensity, // Store max intensity for animation
      fireLightPosition: new THREE.Vector3(x, y + 0.3, z), // Store light position
      hasDamaged: new Set(), // Track who has been damaged this tick
      particles: particles,
      particleVelocities: velocities,
      particleLifetimes: lifetimes,
      particleInitialLifetimes: initialLifetimes,
      particleGeometry: particleGeometry,
      particleSpawned: false
    };
    
    this.scene.add(fireContainer);
    this.fireAreas.push(fireContainer);
  }

  updateFireAreas(dt) {
    const fireAreasToRemove = [];
    
    for (const fireArea of this.fireAreas) {
      if (!fireArea || !fireArea.userData) {
        fireAreasToRemove.push(fireArea);
        continue;
      }
      
      fireArea.userData.lifetime += dt;
      
      const expandDuration = fireArea.userData.expandDuration || 0.2;
      const shrinkDelay = fireArea.userData.shrinkDelay || 0.5;
      const shrinkDuration = fireArea.userData.shrinkDuration || 1.0;
      
      const fireBase = fireArea.children[0];
      if (!fireBase || !fireBase.material) continue;
      
      // Phase 1: Expansion animation (fast scale up from impact point)
      if (fireArea.userData.lifetime < expandDuration) {
        const expandProgress = Math.min(fireArea.userData.lifetime / expandDuration, 1.0);
        const expandFactor = expandProgress; // Goes from 0 to 1
        
        // Scale from impact point to full size
        fireBase.scale.set(expandFactor, expandFactor, expandFactor);
        
        // Opacity fades in from 0 to 1 during expansion (base opacity, gradient texture handles radial fade)
        fireBase.material.opacity = expandFactor;
        
        // Light intensity increases during expansion and update position
        if (fireArea.userData.fireLight) {
          const maxIntensity = fireArea.userData.fireLightIntensity || 2.0;
          fireArea.userData.fireLight.intensity = maxIntensity * expandFactor;
          // Update light position to exact impact point
          const lightPos = fireArea.userData.fireLightPosition || fireArea.userData.position.clone();
          fireArea.userData.fireLight.position.set(lightPos.x, lightPos.y, lightPos.z);
        }
        
        // Damage radius expands
        fireArea.userData.radius = fireArea.userData.initialRadius * expandFactor;
      }
      // Phase 2: Hold at full size (before shrinking starts)
      else if (fireArea.userData.lifetime < shrinkDelay + expandDuration) {
        // Keep at full size during delay period
        fireBase.scale.set(1.0, 1.0, 1.0);
        fireBase.material.opacity = 1.0; // Full opacity (gradient texture handles radial fade)
        if (fireArea.userData.fireLight) {
          const maxIntensity = fireArea.userData.fireLightIntensity || 2.0;
          fireArea.userData.fireLight.intensity = maxIntensity;
          // Keep light at exact impact point
          const lightPos = fireArea.userData.fireLightPosition || fireArea.userData.position.clone();
          fireArea.userData.fireLight.position.set(lightPos.x, lightPos.y, lightPos.z);
        }
        fireArea.userData.radius = fireArea.userData.initialRadius;
      }
      // Phase 3: Shrinking phase
      else {
        const timeSinceShrinkStart = fireArea.userData.lifetime - (shrinkDelay + expandDuration);
        const shrinkProgress = Math.min(timeSinceShrinkStart / shrinkDuration, 1.0);
        const shrinkFactor = 1.0 - shrinkProgress; // Start at full size, shrink to 0
        
        // Shrink the fire area uniformly - maintain circular shape
        fireBase.scale.set(shrinkFactor, shrinkFactor, shrinkFactor);
        
        // Fade opacity while shrinking (gradient texture handles radial fade)
        fireBase.material.opacity = shrinkFactor;
        
        // Update damage radius to shrink as well
        fireArea.userData.radius = fireArea.userData.initialRadius * shrinkFactor;
        
        // Fade out light and keep at exact position
        if (fireArea.userData.fireLight) {
          const maxIntensity = fireArea.userData.fireLightIntensity || 2.0;
          fireArea.userData.fireLight.intensity = maxIntensity * shrinkFactor;
          // Keep light at exact impact point
          const lightPos = fireArea.userData.fireLightPosition || fireArea.userData.position.clone();
          fireArea.userData.fireLight.position.set(lightPos.x, lightPos.y, lightPos.z);
        }
      }
      
      // Update fire particles
      if (fireArea.userData.particles && fireArea.userData.particleVelocities) {
        const particles = fireArea.userData.particles;
        const velocities = fireArea.userData.particleVelocities;
        const lifetimes = fireArea.userData.particleLifetimes;
        const initialLifetimes = fireArea.userData.particleInitialLifetimes;
        const positions = particles.geometry.attributes.position.array;
        
        // Start emitting particles after expansion phase
        if (!fireArea.userData.particleSpawned && fireArea.userData.lifetime >= expandDuration) {
          fireArea.userData.particleSpawned = true;
        }
        
        // Update particle positions and lifetimes
        for (let i = 0; i < velocities.length / 3; i++) {
          const i3 = i * 3;
          
          // Only update if particles should be visible
          if (fireArea.userData.particleSpawned && lifetimes[i] < initialLifetimes[i]) {
            // Update lifetime
            lifetimes[i] += dt;
            
            // Move particles upward slowly with gentle turbulence (no gravity for fire effect)
            positions[i3] += velocities[i3] * dt;
            positions[i3 + 1] += velocities[i3 + 1] * dt; // Pure upward movement, no gravity
            positions[i3 + 2] += velocities[i3 + 2] * dt;
            
            // Add gentle turbulence/wiggle to horizontal movement (fire-like effect)
            const turbulence = 0.05;
            positions[i3] += (Math.random() - 0.5) * turbulence * dt;
            positions[i3 + 2] += (Math.random() - 0.5) * turbulence * dt;
            
            // Gradually reduce upward velocity as particles rise (simulates air resistance)
            velocities[i3 + 1] *= (1 - dt * 0.3); // Slow down over time
          }
          // Reset particles that have expired (recycle them) - continue during shrinking phase
          else if (fireArea.userData.particleSpawned && lifetimes[i] >= initialLifetimes[i]) {
            // Continue recycling particles during all phases, including shrinking
            // Only stop recycling in the last 0.3 seconds before fire area removal
            const timeUntilRemoval = fireArea.userData.duration - fireArea.userData.lifetime;
            if (timeUntilRemoval > 0.3) {
              // Reset particle to spawn position - use current radius for shrinking phase
              const angle = Math.random() * Math.PI * 2;
              const currentRadius = fireArea.userData.radius || fireArea.userData.initialRadius;
              const radius = Math.random() * currentRadius;
              positions[i3] = radius * Math.cos(angle);
              positions[i3 + 1] = 0.1; // Start above fire base circle (which is at 0.05)
              positions[i3 + 2] = radius * Math.sin(angle);
              
              // Reset velocity - slow upward for fire effect
              velocities[i3] = (Math.random() - 0.5) * 0.2; // Gentle horizontal drift
              velocities[i3 + 1] = 0.3 + Math.random() * 0.2; // Slow upward velocity
              velocities[i3 + 2] = (Math.random() - 0.5) * 0.2; // Gentle horizontal drift
              
              // Reset lifetime - longer lifetime for particles to rise and fade
              const lifetime = 0.8 + Math.random() * 0.6;
              lifetimes[i] = 0;
              initialLifetimes[i] = lifetime;
            }
          }
        }
        
        particles.geometry.attributes.position.needsUpdate = true;
        
        // Calculate average opacity based on individual particle lifetimes and heights
        // This simulates particles fading as they rise and age
        let totalOpacity = 0;
        let activeParticleCount = 0;
        
        if (fireArea.userData.particleSpawned) {
          const positions = particles.geometry.attributes.position.array;
          
          for (let i = 0; i < velocities.length / 3; i++) {
            const i3 = i * 3;
            
            if (lifetimes[i] < initialLifetimes[i]) {
              // Calculate opacity based on lifetime (fade as particle ages)
              const lifetimeProgress = lifetimes[i] / initialLifetimes[i];
              const lifetimeOpacity = Math.max(0, 1.0 - lifetimeProgress);
              
              // Also fade based on height (higher particles are more transparent like real fire)
              const particleHeight = positions[i3 + 1];
              const maxHeight = 1.5; // Maximum expected height
              const heightFade = Math.max(0, Math.min(1.0, 1.0 - (particleHeight / maxHeight)));
              
              // Combine both fade factors
              const particleOpacity = Math.min(lifetimeOpacity, heightFade);
              totalOpacity += particleOpacity;
              activeParticleCount++;
            }
          }
        }
        
        // Set overall particle opacity based on average
        if (activeParticleCount > 0) {
          const averageOpacity = totalOpacity / activeParticleCount;
          
          // Apply fire phase multiplier
          let phaseMultiplier = 1.0;
          if (fireArea.userData.lifetime >= shrinkDelay + expandDuration) {
            // During shrinking phase, apply additional fade
            const timeSinceShrinkStart = fireArea.userData.lifetime - (shrinkDelay + expandDuration);
            const shrinkProgress = Math.min(timeSinceShrinkStart / shrinkDuration, 1.0);
            phaseMultiplier = 1.0 - shrinkProgress * 0.5; // Additional 50% fade during shrinking
          }
          
          // Final fade near end
          const timeUntilRemoval = fireArea.userData.duration - fireArea.userData.lifetime;
          if (timeUntilRemoval <= 0.3) {
            phaseMultiplier *= Math.max(0, timeUntilRemoval / 0.3);
          }
          
          particles.material.opacity = averageOpacity * phaseMultiplier;
        } else {
          particles.material.opacity = 0;
        }
      }
      
      // Remove after duration
      if (fireArea.userData.lifetime >= fireArea.userData.duration) {
        fireAreasToRemove.push(fireArea);
      }
    }
    
    // Remove expired fire areas
    for (const fireArea of fireAreasToRemove) {
      this.removeFireArea(fireArea);
    }
  }

  removeFireArea(fireArea) {
    if (!fireArea) return;
    
    // Remove light
    if (fireArea.userData && fireArea.userData.fireLight) {
      this.scene.remove(fireArea.userData.fireLight);
    }
    
    // Clean up geometry and material
    if (fireArea.children) {
      fireArea.children.forEach(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }
    
    // Remove from scene
    this.scene.remove(fireArea);
    
    // Remove from array
    const index = this.fireAreas.indexOf(fireArea);
    if (index > -1) {
      this.fireAreas.splice(index, 1);
    }
  }

  checkFireAreaCollision(playerPos, playerSize, playerId = 'local') {
    // Check all active fire areas
    for (const fireArea of this.fireAreas) {
      if (!fireArea || !fireArea.userData) continue;
      
      const firePos = fireArea.userData.position;
      const dx = playerPos.x - firePos.x;
      const dz = playerPos.z - firePos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < fireArea.userData.radius) {
        // Player is in fire area - check if already damaged this tick
        // Reset damage tracking every 0.2 seconds (5 damage ticks per second)
        const currentTick = Math.floor(fireArea.userData.lifetime * 5);
        const damageKey = `${playerId}_${currentTick}`;
        
        if (!fireArea.userData.hasDamaged.has(damageKey)) {
          fireArea.userData.hasDamaged.add(damageKey);
          
          // Clean up old damage keys (keep last 2 ticks)
          if (fireArea.userData.hasDamaged.size > 2) {
            const oldTick = currentTick - 2;
            const oldKey = `${playerId}_${oldTick}`;
            fireArea.userData.hasDamaged.delete(oldKey);
          }
          
          return { 
            hit: true, 
            damage: fireArea.userData.damagePerTick, 
            fireArea: fireArea,
            isFireArea: true
          };
        }
      }
    }
    
    return { hit: false };
  }
}
