import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { loadTexture, loadAnimationSmart } from '../utils/TextureLoader.js';

export class BotManager {
  constructor(scene, collisionManager = null, projectileManager = null) {
    this.scene = scene;
    this.collisionManager = collisionManager;
    this.projectileManager = projectileManager;
    this.bots = [];
    this.playerHeight = 1.2;
    this.playerSize = 0.5;
    this.moveSpeed = 4;
    this.runSpeedMultiplier = 1.7;
  }

  setCollisionManager(collisionManager) {
    this.collisionManager = collisionManager;
  }

  setProjectileManager(projectileManager) {
    this.projectileManager = projectileManager;
  }

  async createBot(botId, characterName = 'herald', startX = 0, startZ = 0) {
    // Create bot sprite
    const spriteGeo = new THREE.PlaneGeometry(this.playerHeight * 0.7, this.playerHeight);
    const spriteMat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.1 });
    const bot = new THREE.Mesh(spriteGeo, spriteMat);
    bot.position.set(startX, this.playerHeight * 0.5, startZ);
    bot.castShadow = true;
    bot.receiveShadow = false;
    this.scene.add(bot);

    // Load character animations
    const baseSpritePath = `/assets/characters/${characterName}/`;
    const loaded = {
      idle_front: await loadAnimationSmart(baseSpritePath + 'idle_front', 4, 1),
      idle_back: await loadAnimationSmart(baseSpritePath + 'idle_back', 4, 1),
      walk_front: await loadAnimationSmart(baseSpritePath + 'walk_front', 8, 4),
      walk_back: await loadAnimationSmart(baseSpritePath + 'walk_back', 8, 4)
    };

    // Bot state
    bot.userData = {
      id: botId,
      type: 'bot',
      characterName: characterName,
      animations: loaded,
      currentAnimKey: 'idle_front',
      lastFacing: 'front',
      
      // Movement
      velocityY: 0,
      isGrounded: true,
      jumpCooldown: 0,
      
      // Health
      health: 100,
      maxHealth: 100,
      
      // AI
      targetX: startX,
      targetZ: startZ,
      direction: Math.random() * Math.PI * 2,
      changeDirectionTimer: 0,
      changeDirectionInterval: 2 + Math.random() * 3,
      shootCooldown: 0,
      shootInterval: 1 + Math.random() * 1.5,
      avoidanceTimer: 0,
      avoidanceDirection: null,
      
      // Health bar (will be created separately)
      healthBar: null
    };

    // Set initial animation
    this.setBotAnimation(bot, 'idle_front', true);

    this.bots.push(bot);
    return bot;
  }

  setBotAnimation(bot, key, force = false) {
    const userData = bot.userData;
    if (!userData.animations) return;
    if (!force && userData.currentAnimKey === key) return;

    userData.currentAnimKey = key;
    const anim = userData.animations[key];
    if (!anim) return;

    anim.frameIndex = 0;
    anim.timeAcc = 0;

    const spriteMat = bot.material;
    spriteMat.map = anim.mode === 'frames' ? anim.textures[0] : anim.texture;

    if (anim.mode === 'sheet') {
      anim.texture.offset.x = 0;
    }
    spriteMat.needsUpdate = true;
  }

  updateBotAnimation(bot, dt) {
    const userData = bot.userData;
    const anim = userData.animations[userData.currentAnimKey];
    if (!anim || anim.frameCount <= 1) return;

    anim.timeAcc += dt;
    const frameDuration = 1 / anim.fps;

    while (anim.timeAcc >= frameDuration) {
      anim.timeAcc -= frameDuration;
      anim.frameIndex = (anim.frameIndex + 1) % anim.frameCount;

      if (anim.mode === 'sheet') {
        const u = anim.frameIndex / anim.frameCount;
        anim.texture.offset.x = u;
      } else if (anim.mode === 'frames') {
        const nextTex = anim.textures[anim.frameIndex];
        const spriteMat = bot.material;
        if (spriteMat.map !== nextTex) {
          spriteMat.map = nextTex;
          spriteMat.needsUpdate = true;
        }
      }
    }
  }

  update(dt, playerPosition = null, camera = null) {
    for (const bot of this.bots) {
      if (bot.userData.health <= 0) continue; // Skip dead bots

      const userData = bot.userData;

      // Update jump physics
      userData.velocityY += -30 * dt; // gravity
      bot.position.y += userData.velocityY * dt;

      // Ground collision
      const groundHeight = this.collisionManager 
        ? this.collisionManager.getGroundHeight(bot.position.x, bot.position.z, this.playerSize)
        : 0.6;
      
      const botBottom = bot.position.y - this.playerHeight * 0.5;
      if (botBottom <= groundHeight) {
        bot.position.y = groundHeight + this.playerHeight * 0.5;
        userData.velocityY = 0;
        userData.isGrounded = true;
      } else {
        userData.isGrounded = false;
      }

      // AI: Update direction change timer
      userData.changeDirectionTimer += dt;
      if (userData.changeDirectionTimer >= userData.changeDirectionInterval) {
        userData.direction = Math.random() * Math.PI * 2;
        userData.changeDirectionTimer = 0;
        userData.changeDirectionInterval = 2 + Math.random() * 3;
      }

      // AI: If player is visible, move toward player
      let moveX = 0;
      let moveZ = 0;
      const speed = this.moveSpeed;

      if (playerPosition) {
        const dx = playerPosition.x - bot.position.x;
        const dz = playerPosition.z - bot.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 1) {
          // Move toward player
          moveX = (dx / dist) * speed * dt;
          moveZ = (dz / dist) * speed * dt;
          userData.direction = Math.atan2(dz, dx);
        } else {
          // Too close, move away
          moveX = -(dx / dist) * speed * dt;
          moveZ = -(dz / dist) * speed * dt;
          userData.direction = Math.atan2(-dz, -dx);
        }
      } else {
        // Random movement
        moveX = Math.cos(userData.direction) * speed * dt;
        moveZ = Math.sin(userData.direction) * speed * dt;
      }

      // Collision check
      const nextPos = new THREE.Vector3(
        bot.position.x + moveX,
        bot.position.y,
        bot.position.z + moveZ
      );

      if (!this.collisionManager || !this.collisionManager.willCollide(nextPos, this.playerSize)) {
        bot.position.x += moveX;
        bot.position.z += moveZ;
      } else {
        // Bounce off wall
        userData.direction += Math.PI + (Math.random() - 0.5) * 0.5;
      }

      // Update animation based on movement
      if (Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01) {
        userData.lastFacing = moveZ < 0 ? 'back' : 'front';
        const animKey = userData.lastFacing === 'back' ? 'walk_back' : 'walk_front';
        this.setBotAnimation(bot, animKey);
      } else {
        const animKey = userData.lastFacing === 'back' ? 'idle_back' : 'idle_front';
        this.setBotAnimation(bot, animKey);
      }

      this.updateBotAnimation(bot, dt);

      // Billboard to camera
      if (camera) {
        const camYaw = camera.rotation.y;
        bot.rotation.set(0, camYaw, 0);
      }

      // AI: Shooting
      userData.shootCooldown -= dt;
      if (userData.shootCooldown <= 0 && this.projectileManager && playerPosition) {
        const dx = playerPosition.x - bot.position.x;
        const dz = playerPosition.z - bot.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Shoot if player is in range (within 10 units)
        if (dist < 10 && this.projectileManager.canShoot()) {
          this.projectileManager.createProjectile(
            bot.position.x,
            bot.position.y, // Use bot's Y position (height)
            bot.position.z,
            dx,
            dz,
            userData.id
          );
          userData.shootCooldown = userData.shootInterval;
          userData.shootInterval = 1 + Math.random() * 1.5;
        }
      }

      // Update jump cooldown
      userData.jumpCooldown = Math.max(0, userData.jumpCooldown - dt);
    }
  }

  getBots() {
    return this.bots.filter(bot => bot.userData.health > 0);
  }

  getAllBots() {
    return this.bots;
  }

  removeBot(bot) {
    // Remove health bar
    if (bot.userData.healthBar) {
      this.scene.remove(bot.userData.healthBar);
    }
    
    // Remove from scene
    this.scene.remove(bot);
    
    // Clean up
    if (bot.material) bot.material.dispose();
    if (bot.geometry) bot.geometry.dispose();
    
    // Remove from array
    const index = this.bots.indexOf(bot);
    if (index > -1) {
      this.bots.splice(index, 1);
    }
  }

  clearAll() {
    for (const bot of [...this.bots]) {
      this.removeBot(bot);
    }
    this.bots = [];
  }

  damageBot(bot, damage) {
    if (!bot || !bot.userData) return;
    bot.userData.health = Math.max(0, bot.userData.health - damage);
    return bot.userData.health <= 0;
  }

  respawnBot(bot) {
    if (!bot || !bot.userData) return;
    bot.userData.health = bot.userData.maxHealth;
    // Reset position to random spawn
    const halfArena = 7;
    bot.position.set(
      (Math.random() - 0.5) * halfArena * 2,
      this.playerHeight * 0.5,
      (Math.random() - 0.5) * halfArena * 2
    );
    bot.userData.velocityY = 0;
    bot.userData.isGrounded = true;
  }
}

