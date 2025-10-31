import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { loadTexture, loadAnimationSmart } from '../utils/TextureLoader.js';
import { SoundManager } from '../utils/SoundManager.js';

export class CharacterManager {
  constructor(scene, footstepSoundPath = null) {
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
    this.gravity = -30; // negative gravity pulls down
    this.jumpForce = 8; // upward velocity when jumping
    this.groundY = 0.6; // ground level (half of playerHeight)
    this.isGrounded = true;
    this.jumpCooldown = 0;
    this.jumpCooldownTime = .6; // prevent rapid jumping
    
    // Sound manager for footstep sounds
    // Pass custom footstep sound path if provided
    // Example: '/assets/sounds/footstep.mp3' or '/assets/sounds/footstep.ogg'
    this.soundManager = new SoundManager(footstepSoundPath);
    
    // Only setup player if scene is available
    if (this.scene) {
      this._setupPlayer();
    }
  }

  _setupPlayer() {
    const spriteGeo = new THREE.PlaneGeometry(this.playerHeight * 0.7, this.playerHeight);
    const spriteMat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.1 });
    this.player = new THREE.Mesh(spriteGeo, spriteMat);
    this.player.position.set(0, this.playerHeight * 0.5, 0);
    this.player.castShadow = true;
    this.player.receiveShadow = false;
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
    
    // Load character-specific footstep sound from character folder
    // Tries: /assets/characters/{name}/footstep.mp3, footstep.ogg, footstep.wav
    // Falls back to: /assets/sounds/footstep.mp3, footstep.ogg, footstep.wav
    const soundExtensions = ['mp3', 'ogg', 'wav'];
    const characterSoundPath = `${baseSpritePath}footstep`; // e.g., /assets/characters/lucy/footstep
    const genericSoundPath = '/assets/sounds/footstep';
    
    // Try character folder first (keeps all character assets together)
    let soundPath = null;
    for (const ext of soundExtensions) {
      const testPath = `${characterSoundPath}.${ext}`;
      try {
        const testAudio = new Audio(testPath);
        const canLoad = await new Promise((resolve) => {
          testAudio.addEventListener('canplay', () => resolve(true), { once: true });
          testAudio.addEventListener('error', () => resolve(false), { once: true });
          testAudio.load();
          setTimeout(() => resolve(false), 200);
        });
        if (canLoad) {
          soundPath = testPath;
          break;
        }
      } catch (e) {
        // Try next format
      }
    }
    
    // If no character-specific sound, try generic sounds folder
    if (!soundPath) {
      for (const ext of soundExtensions) {
        const testPath = `${genericSoundPath}.${ext}`;
        try {
          const testAudio = new Audio(testPath);
          const canLoad = await new Promise((resolve) => {
            testAudio.addEventListener('canplay', () => resolve(true), { once: true });
            testAudio.addEventListener('error', () => resolve(false), { once: true });
            testAudio.load();
            setTimeout(() => resolve(false), 200);
          });
          if (canLoad) {
            soundPath = testPath;
            break;
          }
        } catch (e) {
          // Continue
        }
      }
    }
    
    // Load the sound if found
    if (soundPath) {
      this.soundManager.loadFootstepSound(soundPath);
    }
    
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
    
    const isWalkAnim = this.currentAnimKey === 'walk_front' || this.currentAnimKey === 'walk_back';
    
    anim.timeAcc += dt;
    
    // Use higher FPS when running (shift held) for walk animations
    const currentFps = isRunning && isWalkAnim ? anim.fps * 1.4 : anim.fps;
    
    const frameDuration = 1 / currentFps;
    while (anim.timeAcc >= frameDuration) {
      anim.timeAcc -= frameDuration;
      anim.frameIndex = (anim.frameIndex + 1) % anim.frameCount;
      
      // Play footstep sound when walking and grounded
      if (isWalkAnim && this.isGrounded) {
        // Play footsteps on specific frames (typically when feet hit ground)
        // For 4-frame walk cycle: play on frames 0 and 2
        // This creates alternating left/right foot sounds
        const footstepFrames = anim.frameCount >= 4 ? [0, 2] : [0];
        
        // Play when we transition to a footstep frame
        if (footstepFrames.includes(anim.frameIndex)) {
          this.soundManager.playFootstep();
        }
      }
      
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

  respawn() {
    // Reset position to center of arena
    this.player.position.set(0, this.playerHeight * 0.5, 0);
    
    // Reset physics
    this.velocityY = 0;
    this.isGrounded = true;
    this.jumpCooldown = 0;
    
    console.log("Player respawned at center of arena!");
  }
}
