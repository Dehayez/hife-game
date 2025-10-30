import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { loadTexture, loadAnimationSmart } from '../utils/TextureLoader.js';

export class CharacterManager {
  constructor(scene) {
    this.scene = scene;
    this.player = null;
    this.animations = null;
    this.currentAnimKey = 'idle_front';
    this.lastFacing = 'front';
    this.playerSize = 0.8;
    this.playerHeight = 1.2;
    this.characterName = 'lucy';
    
    // Jump physics properties
    this.velocityY = 0;
    this.gravity = -15; // negative gravity pulls down
    this.jumpForce = 6; // upward velocity when jumping
    this.groundY = 0.6; // ground level (half of playerHeight)
    this.isGrounded = true;
    this.jumpCooldown = 0;
    this.jumpCooldownTime = 0.1; // prevent rapid jumping
    
    // Only setup player if scene is available
    if (this.scene) {
      this._setupPlayer();
    }
  }

  _setupPlayer() {
    const spriteGeo = new THREE.PlaneGeometry(this.playerHeight * 0.7, this.playerHeight);
    const spriteMat = new THREE.MeshBasicMaterial({ transparent: true });
    this.player = new THREE.Mesh(spriteGeo, spriteMat);
    this.player.position.set(0, this.playerHeight * 0.5, 0);
    this.scene.add(this.player);
  }

  initializePlayer(scene) {
    this.scene = scene;
    if (!this.player) {
      this._setupPlayer();
    }
  }

  async loadCharacter(name) {
    this.characterName = name;
    const baseSpritePath = `/assets/characters/${this.characterName}/`;
    
    const loaded = {
      idle_front: await loadAnimationSmart(baseSpritePath + 'idle_front', 4, 1),
      idle_back: await loadAnimationSmart(baseSpritePath + 'idle_back', 4, 1),
      walk_front: await loadAnimationSmart(baseSpritePath + 'walk_front', 8, 4),
      walk_back: await loadAnimationSmart(baseSpritePath + 'walk_back', 8, 4)
    };
    
    this.animations = loaded;
    this.currentAnimKey = 'idle_front';
    this.lastFacing = 'front';
    this.setCurrentAnim(this.currentAnimKey, true);
  }

  setCurrentAnim(key, force = false) {
    if (!this.animations) return;
    if (!force && this.currentAnimKey === key) return;
    
    this.currentAnimKey = key;
    const anim = this.animations[key];
    if (!anim) return;
    
    // Reset timing so first frame shows immediately
    anim.frameIndex = 0;
    anim.timeAcc = 0;
    
    const spriteMat = this.player.material;
    spriteMat.map = anim.mode === 'frames' ? anim.textures[0] : anim.texture;
    
    if (anim.mode === 'sheet') {
      anim.texture.offset.x = 0;
    }
    spriteMat.needsUpdate = true;
  }

  updateAnimation(dt, isRunning = false) {
    if (!this.animations) return;
    
    const anim = this.animations[this.currentAnimKey];
    if (!anim || anim.frameCount <= 1) return;
    
    anim.timeAcc += dt;
    
    // Use higher FPS when running (shift held) for walk animations
    const isWalkAnim = this.currentAnimKey === 'walk_front' || this.currentAnimKey === 'walk_back';
    const currentFps = isRunning && isWalkAnim ? anim.fps * 1.5 : anim.fps;
    
    const frameDuration = 1 / currentFps;
    while (anim.timeAcc >= frameDuration) {
      anim.timeAcc -= frameDuration;
      anim.frameIndex = (anim.frameIndex + 1) % anim.frameCount;
      
      if (anim.mode === 'sheet') {
        const u = anim.frameIndex / anim.frameCount;
        anim.texture.offset.x = u;
      } else if (anim.mode === 'frames') {
        const nextTex = anim.textures[anim.frameIndex];
        const spriteMat = this.player.material;
        if (spriteMat.map !== nextTex) {
          spriteMat.map = nextTex;
          spriteMat.needsUpdate = true;
        }
      }
    }
  }

  updateMovement(input, velocity, camera) {
    // Billboard the sprite to camera around Y only
    const camYaw = camera.rotation.y;
    this.player.rotation.set(0, camYaw, 0);

    // Choose animation based on movement, jumping state, and last facing (front/back)
    if (this.isJumping()) {
      // Use idle animation when jumping (can be replaced with jump animations later)
      this.setCurrentAnim(this.lastFacing === 'back' ? 'idle_back' : 'idle_front');
    } else if (input.lengthSq() > 0.0001) {
      // Only change facing when moving along Z (forward/back). Sideways should not flip facing.
      if (Math.abs(velocity.z) > 1e-4) {
        this.lastFacing = velocity.z < 0 ? 'back' : 'front';
      }
      this.setCurrentAnim(this.lastFacing === 'back' ? 'walk_back' : 'walk_front');
    } else {
      this.setCurrentAnim(this.lastFacing === 'back' ? 'idle_back' : 'idle_front');
    }
  }

  getPlayer() {
    return this.player;
  }

  getPlayerSize() {
    return this.playerSize;
  }

  getCharacterName() {
    return this.characterName;
  }

  jump() {
    if (this.isGrounded && this.jumpCooldown <= 0) {
      this.velocityY = this.jumpForce;
      this.isGrounded = false;
      this.jumpCooldown = this.jumpCooldownTime;
    }
  }

  updateJumpPhysics(dt, collisionManager) {
    // Update jump cooldown
    if (this.jumpCooldown > 0) {
      this.jumpCooldown -= dt;
    }

    // Apply gravity
    this.velocityY += this.gravity * dt;

    // Update vertical position
    this.player.position.y += this.velocityY * dt;

    // Check for ground collision using dynamic ground height
    const groundHeight = collisionManager.getGroundHeight(
      this.player.position.x, 
      this.player.position.z, 
      this.playerSize
    );
    
    // Character's bottom should be at ground level
    const characterBottom = this.player.position.y - this.playerHeight * 0.5;
    
    if (characterBottom <= groundHeight) {
      this.player.position.y = groundHeight + this.playerHeight * 0.5;
      this.velocityY = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }
  }

  isJumping() {
    return !this.isGrounded;
  }
}
