/**
 * CharacterAnimation.js
 * 
 * Handles character animation loading, updating, and frame management.
 */

import { loadAnimationSmart } from '../../../utils/TextureLoader.js';
import { getRunningSmokeConfig } from '../../../config/abilities/base/SmokeParticleConfig.js';
import { getLoadingProgressManager } from '../../../utils/LoadingProgressManager.js';

/**
 * Load character animations
 * @param {string} characterName - Character name ('lucy' or 'herald')
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Object>} Loaded animations object
 */
export async function loadCharacterAnimations(characterName, onProgress = null) {
  const baseSpritePath = `/assets/characters/${characterName}/`;
  const progressManager = getLoadingProgressManager();
  
  // Total animations to load
  const totalAnimations = 10;
  let loadedCount = 0;
  
  const updateProgress = (animationName) => {
    loadedCount++;
    const task = `Loading ${characterName} animation: ${animationName}...`;
    if (onProgress) {
      onProgress(loadedCount, totalAnimations, task);
    } else {
      progressManager.increment(task);
    }
  };
  
  // Load base animations first
  const idle_front = await loadAnimationSmart(baseSpritePath + 'idle_front', 4, 1);
  updateProgress('idle_front');
  
  const idle_back = await loadAnimationSmart(baseSpritePath + 'idle_back', 4, 1);
  updateProgress('idle_back');
  
  const walk_front = await loadAnimationSmart(baseSpritePath + 'walk_front', 8, 4);
  updateProgress('walk_front');
  
  const walk_back = await loadAnimationSmart(baseSpritePath + 'walk_back', 8, 4);
  updateProgress('walk_back');
  
  // Try to load new animations, fallback to idle if not found
  const hit_front = await loadAnimationSmart(baseSpritePath + 'hit_front', 12, 1).catch(() => idle_front);
  updateProgress('hit_front');
  
  const hit_back = await loadAnimationSmart(baseSpritePath + 'hit_back', 12, 1).catch(() => idle_back);
  updateProgress('hit_back');
  
  const death_front = await loadAnimationSmart(baseSpritePath + 'death_front', 8, 1).catch(() => idle_front);
  updateProgress('death_front');
  
  const death_back = await loadAnimationSmart(baseSpritePath + 'death_back', 8, 1).catch(() => idle_back);
  updateProgress('death_back');
  
  const spawn_front = await loadAnimationSmart(baseSpritePath + 'spawn_front', 8, 1).catch(() => idle_front);
  updateProgress('spawn_front');
  
  const spawn_back = await loadAnimationSmart(baseSpritePath + 'spawn_back', 8, 1).catch(() => idle_back);
  updateProgress('spawn_back');
  
  const loaded = {
    idle_front,
    idle_back,
    walk_front,
    walk_back,
    hit_front,
    hit_back,
    death_front,
    death_back,
    spawn_front,
    spawn_back
  };
  
  return loaded;
}

/**
 * Set character animation
 * @param {THREE.Mesh} player - Player mesh
 * @param {string} key - Animation key
 * @param {Object} animations - Animations object
 * @param {string} currentAnimKey - Current animation key (will be updated)
 * @param {boolean} force - Force animation change even if already playing
 * @param {Function} onComplete - Optional callback when animation completes (for one-shot animations)
 * @returns {string} New animation key
 */
export function setCharacterAnimation(player, key, animations, currentAnimKey, force = false, onComplete = null) {
  if (!animations || !player || !player.material) return currentAnimKey;
  if (!force && currentAnimKey === key) return currentAnimKey;
  
  const anim = animations[key];
  if (!anim) return currentAnimKey;
  
  // Reset timing so first frame shows immediately
  anim.frameIndex = 0;
  anim.timeAcc = 0;
  anim.onComplete = onComplete; // Store callback for one-shot animations
  
  const spriteMat = player.material;
  const texture = anim.mode === 'frames' ? (anim.textures && anim.textures[0]) : anim.texture;
  
  // Ensure texture exists and is ready before setting
  if (texture) {
    // Check if texture image is loaded
    const isTextureReady = texture.image && 
                           texture.image.complete && 
                           texture.image.naturalWidth > 0;
    
    // Set texture even if not fully loaded (it will display when ready)
    spriteMat.map = texture;
    
    if (anim.mode === 'sheet' && anim.texture) {
      anim.texture.offset.x = 0;
      anim.texture.needsUpdate = true;
    }
    
    // Ensure material properties are set correctly
    spriteMat.transparent = true;
    spriteMat.alphaTest = 0.1;
    
    // Force immediate updates
    spriteMat.needsUpdate = true;
    texture.needsUpdate = true;
    
    // If texture isn't ready yet, wait for it to load
    if (!isTextureReady && texture.image) {
      const onImageLoad = () => {
        texture.needsUpdate = true;
        spriteMat.needsUpdate = true;
      };
      
      // Add load listener if image exists but isn't complete
      if (texture.image.addEventListener) {
        texture.image.addEventListener('load', onImageLoad, { once: true });
        texture.image.addEventListener('error', onImageLoad, { once: true });
      }
    }
    
    // Note: Don't force visibility here - let the caller control visibility
    // (e.g., Herald sprite should be hidden when sprinting)
  }
  
  return key;
}

/**
 * Update character animation frame
 * @param {THREE.Mesh} player - Player mesh
 * @param {Object} animations - Animations object
 * @param {string} currentAnimKey - Current animation key
 * @param {boolean} isGrounded - Whether character is grounded
 * @param {Function} isOnBaseGround - Function to check if on base ground
 * @param {Object} soundManager - Sound manager for footstep sounds
 * @param {number} dt - Delta time in seconds
 * @param {boolean} isRunning - Whether character is running
 */
export function updateCharacterAnimation(
  player,
  animations,
  currentAnimKey,
  isGrounded,
  isOnBaseGround,
  soundManager,
  dt,
  isRunning = false
) {
  if (!animations) return;
  
  const anim = animations[currentAnimKey];
  if (!anim) return;
  
  // Early return if animation is invalid - don't process single frame animations as one-shot
  // This prevents issues when fallback animations (idle) are used for hit/death/spawn
  const isOneShotAnim = currentAnimKey.includes('hit') || 
                        currentAnimKey.includes('death') || 
                        currentAnimKey.includes('spawn');
  
  // For one-shot animations, verify they're not fallbacks
  if (isOneShotAnim) {
    const expectedFallback = currentAnimKey.includes('front') ? 'idle_front' : 'idle_back';
    const fallbackAnim = animations[expectedFallback];
    
    // If this one-shot animation is actually the fallback (idle), treat it as normal animation
    if (anim === fallbackAnim) {
      // This is a fallback, don't treat as one-shot - just return without processing
      // This prevents the animation from stopping at last frame incorrectly
      return;
    }
  }
  
  if (anim.frameCount <= 1) {
    // Single frame animation - call callback immediately if it's a one-shot
    if (isOneShotAnim && anim.onComplete) {
      anim.onComplete();
      anim.onComplete = null;
    }
    return;
  }
  
  const isWalkAnim = currentAnimKey === 'walk_front' || currentAnimKey === 'walk_back';
  
  anim.timeAcc += dt;
  
  // Use higher FPS when running (shift held) for walk animations
  const currentFps = isRunning && isWalkAnim ? anim.fps * 1.4 : anim.fps;
  
  const frameDuration = 1 / currentFps;
  
  while (anim.timeAcc >= frameDuration) {
    anim.timeAcc -= frameDuration;
    
    // For one-shot animations, don't loop - stop at last frame
    if (isOneShotAnim && anim.frameIndex >= anim.frameCount - 1) {
      // Animation complete - call callback if provided
      if (anim.onComplete) {
        anim.onComplete();
        anim.onComplete = null;
      }
      break; // Don't advance frame, stay on last frame
    } else {
      anim.frameIndex = (anim.frameIndex + 1) % anim.frameCount;
    }
    
    // Play footstep sound when walking and grounded
    if (isWalkAnim && isGrounded && soundManager) {
      // Play footsteps on specific frames (typically when feet hit ground)
      // For 4-frame walk cycle: play on frames 0 and 2
      const footstepFrames = anim.frameCount >= 4 ? [0, 2] : [0];
      
      // Play when we transition to a footstep frame
      if (footstepFrames.includes(anim.frameIndex)) {
        // Check if on obstacle/platform (not base ground) to play appropriate sound
        const isObstacle = !isOnBaseGround();
        soundManager.playFootstep(isObstacle);
      }
    }
    
    if (anim.mode === 'sheet') {
      const u = anim.frameIndex / anim.frameCount;
      anim.texture.offset.x = u;
      anim.texture.needsUpdate = true;
    } else if (anim.mode === 'frames') {
      const nextTex = anim.textures[anim.frameIndex];
      const spriteMat = player.material;
      if (spriteMat.map !== nextTex) {
        spriteMat.map = nextTex;
        spriteMat.needsUpdate = true;
        if (nextTex) {
          nextTex.needsUpdate = true;
        }
      }
    }
  }
}

/**
 * Update character movement and animation state
 * @param {THREE.Mesh} player - Player mesh
 * @param {THREE.Camera} camera - Camera for billboarding
 * @param {THREE.Vector3} input - Input vector
 * @param {THREE.Vector3} velocity - Velocity vector
 * @param {boolean} isJumping - Whether character is jumping
 * @param {boolean} isGrounded - Whether character is grounded
 * @param {Function} isOnBaseGround - Function to check if on base ground
 * @param {Object} animations - Animations object
 * @param {string} currentAnimKey - Current animation key (will be updated)
 * @param {string} lastFacing - Last facing direction ('front' or 'back')
 * @param {Object} soundManager - Sound manager for footstep sounds
 * @param {Object} particleManager - Particle manager for smoke effects
 * @param {number} smokeSpawnTimer - Current smoke spawn timer
 * @param {boolean} isRunning - Whether character is running
 * @param {string} characterName - Character name ('lucy' or 'herald')
 * @returns {Object} Updated state with currentAnimKey, lastFacing, smokeSpawnTimer, shouldPlayFootstep
 */
export function updateCharacterMovement(
  player,
  camera,
  input,
  velocity,
  isJumping,
  isGrounded,
  isOnBaseGround,
  animations,
  currentAnimKey,
  lastFacing,
  soundManager,
  particleManager,
  smokeSpawnTimer,
  isRunning = false,
  characterName = 'lucy'
) {
  // Billboard the sprite to camera around Y only
  const camYaw = camera.rotation.y;
  player.rotation.set(0, camYaw, 0);

  // Track previous animation to detect transitions
  const prevAnimKey = currentAnimKey;
  const wasIdle = prevAnimKey === 'idle_front' || prevAnimKey === 'idle_back';
  let newCurrentAnimKey = currentAnimKey;
  let newLastFacing = lastFacing;
  let newSmokeSpawnTimer = smokeSpawnTimer;
  let shouldPlayFootstep = false;

  // Check for special animation states first (hit, death, spawn)
  const isSpecialAnim = currentAnimKey.includes('hit') || 
                         currentAnimKey.includes('death') || 
                         currentAnimKey.includes('spawn');
  
  // Don't override special animations unless they're complete
  if (isSpecialAnim) {
    // Let special animations play out
    return {
      currentAnimKey: currentAnimKey,
      lastFacing: lastFacing,
      smokeSpawnTimer: smokeSpawnTimer,
      shouldPlayFootstep: false
    };
  }
  
  // Choose animation based on movement, jumping state, and last facing (front/back)
  if (input.lengthSq() > 0.0001) {
    // Update facing direction when moving (works for both grounded and levitating)
    // Only change facing when moving along Z (forward/back)
    if (Math.abs(velocity.z) > 1e-4) {
      newLastFacing = velocity.z < 0 ? 'back' : 'front';
    }
    
    if (isJumping) {
      // Use idle animation when jumping/levitating (but still update facing)
      newCurrentAnimKey = setCharacterAnimation(
        player,
        newLastFacing === 'back' ? 'idle_back' : 'idle_front',
        animations,
        currentAnimKey
      );
    } else {
      // For Herald when sprinting, use idle animation instead of walk (sprite is hidden, ball is shown)
      // For other characters or when not sprinting, use walk animation
      const shouldUseWalkAnimation = !(characterName === 'herald' && isRunning);
      
      if (shouldUseWalkAnimation) {
        // Use walk animation when grounded and moving
        const newAnimKey = newLastFacing === 'back' ? 'walk_back' : 'walk_front';
        newCurrentAnimKey = setCharacterAnimation(player, newAnimKey, animations, currentAnimKey);
        
        // Play footstep sound immediately when starting to move
        const nowWalking = newCurrentAnimKey === 'walk_front' || newCurrentAnimKey === 'walk_back';
        if (wasIdle && nowWalking && isGrounded) {
          const isObstacle = !isOnBaseGround();
          shouldPlayFootstep = true;
          if (soundManager) {
            soundManager.playFootstep(isObstacle);
          }
        }
      } else {
        // Herald sprinting: use idle animation (sprite hidden, ball visible)
        newCurrentAnimKey = setCharacterAnimation(
          player,
          newLastFacing === 'back' ? 'idle_back' : 'idle_front',
          animations,
          currentAnimKey
        );
      }
      
      // Spawn smoke particles when running and grounded
      const smokeConfig = getRunningSmokeConfig();
      const smokeSpawnInterval = smokeConfig.spawnInterval;
      if (isRunning && isGrounded && particleManager) {
        if (smokeSpawnTimer <= 0) {
          particleManager.spawnSmokeParticle(player.position);
          newSmokeSpawnTimer = smokeSpawnInterval;
        }
      }
    }
  } else {
    // No movement input - use idle animation
    if (isJumping) {
      // Use idle animation when jumping/levitating (keep current facing)
      newCurrentAnimKey = setCharacterAnimation(
        player,
        newLastFacing === 'back' ? 'idle_back' : 'idle_front',
        animations,
        currentAnimKey
      );
    } else {
      newCurrentAnimKey = setCharacterAnimation(
        player,
        newLastFacing === 'back' ? 'idle_back' : 'idle_front',
        animations,
        currentAnimKey
      );
    }
    // Reset smoke timer when not moving
    newSmokeSpawnTimer = 0;
  }

  return {
    currentAnimKey: newCurrentAnimKey,
    lastFacing: newLastFacing,
    smokeSpawnTimer: newSmokeSpawnTimer,
    shouldPlayFootstep
  };
}

