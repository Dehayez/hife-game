import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

export class ProjectileManager {
  constructor(scene, collisionManager = null) {
    this.scene = scene;
    this.collisionManager = collisionManager;
    this.projectiles = [];
    this.projectileSpeed = 15; // units per second
    this.projectileLifetime = 3; // seconds
    
    // Character-specific stats
    this.characterStats = {
      lucy: {
        damage: 20, // Lower damage
        cooldown: 0.2, // Faster shooting (5 shots per second)
        color: 0xff6b9d, // Pink/magenta color
        name: 'Lucy'
      },
      herald: {
        damage: 35, // Higher damage
        cooldown: 0.5, // Slower shooting (2 shots per second)
        color: 0xff8c42, // Orange color
        name: 'Herald'
      }
    };
    
    // Default stats
    this.projectileDamage = 25;
    this.shootCooldown = 0.3;
    
    // Per-character cooldown tracking
    this.characterCooldowns = new Map();
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
    
    // Check cooldown for this specific character
    const currentCooldown = this.characterCooldowns.get(playerId) || 0;
    if (currentCooldown > 0) return null;

    // Normalize direction
    const dirLength = Math.sqrt(directionX * directionX + directionZ * directionZ);
    if (dirLength < 0.001) return null;
    
    const normX = directionX / dirLength;
    const normZ = directionZ / dirLength;

    // Create magical projectile - glowing sphere with character-specific color
    const geo = new THREE.SphereGeometry(0.1, 8, 8);
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
    
    // Store projectile data with character-specific damage
    projectile.userData = {
      type: 'projectile',
      playerId: playerId,
      characterName: characterName,
      velocityX: normX * this.projectileSpeed,
      velocityZ: normZ * this.projectileSpeed,
      lifetime: 0,
      trailLight: trailLight,
      damage: characterDamage
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
        const projectileSize = 0.1;
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

  clearAll() {
    for (const projectile of [...this.projectiles]) {
      this.removeProjectile(projectile);
    }
    this.projectiles = [];
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
}

