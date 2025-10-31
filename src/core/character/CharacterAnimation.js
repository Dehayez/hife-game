/**
 * CharacterAnimation.js
 * 
 * Handles character animation loading, updating, and frame management.
 */

import { loadAnimationSmart } from '../../utils/TextureLoader.js';
import { getCharacterParticleStats } from './CharacterStats.js';

/**
 * Load character animations
 * @param {string} characterName - Character name ('lucy' or 'herald')
 * @returns {Promise<Object>} Loaded animations object
 */
export async function loadCharacterAnimations(characterName) {
  const baseSpritePath = `/assets/characters/${characterName}/`;
  
  const loaded = {
    idle_front: await loadAnimationSmart(baseSpritePath + 'idle_front', 4, 1),
    idle_back: await loadAnimationSmart(baseSpritePath + 'idle_back', 4, 1),
    walk_front: await loadAnimationSmart(baseSpritePath + 'walk_front', 8, 4),
    walk_back: await loadAnimationSmart(baseSpritePath + 'walk_back', 8, 4)
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
 * @returns {string} New animation key
 */
export function setCharacterAnimation(player, key, animations, currentAnimKey, force = false) {
  if (!animations) return currentAnimKey;
  if (!force && currentAnimKey === key) return currentAnimKey;
  
  const anim = animations[key];
  if (!anim) return currentAnimKey;
  
  // Reset timing so first frame shows immediately
  anim.frameIndex = 0;
  anim.timeAcc = 0;
  
  const spriteMat = player.material;
  spriteMat.map = anim.mode === 'frames' ? anim.textures[0] : anim.texture;
  
  if (anim.mode === 'sheet') {
    anim.texture.offset.x = 0;
  }
  spriteMat.needsUpdate = true;
  
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
  if (!anim || anim.frameCount <= 1) return;
  
  const isWalkAnim = currentAnimKey === 'walk_front' || currentAnimKey === 'walk_back';
  
  anim.timeAcc += dt;
  
  // Use higher FPS when running (shift held) for walk animations
  const currentFps = isRunning && isWalkAnim ? anim.fps * 1.4 : anim.fps;
  
  const frameDuration = 1 / currentFps;
  while (anim.timeAcc >= frameDuration) {
    anim.timeAcc -= frameDuration;
    anim.frameIndex = (anim.frameIndex + 1) % anim.frameCount;
    
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
    } else if (anim.mode === 'frames') {
      const nextTex = anim.textures[anim.frameIndex];
      const spriteMat = player.material;
      if (spriteMat.map !== nextTex) {
        spriteMat.map = nextTex;
        spriteMat.needsUpdate = true;
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
  isRunning = false
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

  // Choose animation based on movement, jumping state, and last facing (front/back)
  if (isJumping) {
    // Use idle animation when jumping
    newCurrentAnimKey = setCharacterAnimation(
      player,
      newLastFacing === 'back' ? 'idle_back' : 'idle_front',
      animations,
      currentAnimKey
    );
  } else if (input.lengthSq() > 0.0001) {
    // Only change facing when moving along Z (forward/back)
    if (Math.abs(velocity.z) > 1e-4) {
      newLastFacing = velocity.z < 0 ? 'back' : 'front';
    }
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
    
    // Spawn smoke particles when running and grounded
    const particleStats = getCharacterParticleStats();
    if (isRunning && isGrounded && particleManager) {
      if (smokeSpawnTimer <= 0) {
        particleManager.spawnSmokeParticle(player.position);
        newSmokeSpawnTimer = particleStats.smokeSpawnInterval;
      }
    }
  } else {
    newCurrentAnimKey = setCharacterAnimation(
      player,
      newLastFacing === 'back' ? 'idle_back' : 'idle_front',
      animations,
      currentAnimKey
    );
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

