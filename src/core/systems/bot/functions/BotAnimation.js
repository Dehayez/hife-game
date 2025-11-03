/**
 * BotAnimation.js
 * 
 * Handles bot animation updates and changes based on movement state.
 */

import { loadAnimationSmart } from '../../../../utils/TextureLoader.js';

/**
 * Load bot animations for a character
 * @param {string} characterName - Character name ('lucy' or 'herald')
 * @returns {Promise<Object>} Loaded animations object
 */
export async function loadBotAnimations(characterName) {
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
 * Set bot animation
 * @param {THREE.Mesh} bot - Bot mesh
 * @param {string} key - Animation key
 * @param {boolean} force - Force animation change even if already playing
 */
export function setBotAnimation(bot, key, force = false) {
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

/**
 * Update bot animation frame
 * @param {THREE.Mesh} bot - Bot mesh
 * @param {number} dt - Delta time in seconds
 */
export function updateBotAnimation(bot, dt) {
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

/**
 * Update bot animation based on movement state
 * @param {THREE.Mesh} bot - Bot mesh
 * @param {number} moveX - Movement in X direction
 * @param {number} moveZ - Movement in Z direction
 */
export function updateBotAnimationFromMovement(bot, moveX, moveZ) {
  const userData = bot.userData;
  
  // Update animation based on movement
  if (Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01) {
    userData.lastFacing = moveZ < 0 ? 'back' : 'front';
    const animKey = userData.lastFacing === 'back' ? 'walk_back' : 'walk_front';
    setBotAnimation(bot, animKey);
  } else {
    const animKey = userData.lastFacing === 'back' ? 'idle_back' : 'idle_front';
    setBotAnimation(bot, animKey);
  }
}

/**
 * Billboard bot to camera
 * @param {THREE.Mesh} bot - Bot mesh
 * @param {THREE.Camera} camera - Camera reference
 */
export function billboardBotToCamera(bot, camera) {
  if (camera) {
    const camYaw = camera.rotation.y;
    bot.rotation.set(0, camYaw, 0);
  }
}

