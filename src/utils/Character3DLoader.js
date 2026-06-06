/**
 * Character3DLoader.js
 * 
 * Utility for loading and managing 3D character models.
 * Handles model loading, animation setup, and mesh configuration.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { loadModel, preloadModel } from './ModelLoader.js';
import { getCharacterModelPath } from '../config/character/CharacterRenderMode.js';
import { getCharacterMovementStats } from '../config/character/CharacterStats.js';

/**
 * Diagnostic watcher: snapshots the visibility + transform + animation state
 * of a 3D character every second and logs any change. Stops automatically
 * when the wrapper is removed from its scene (becomes orphaned).
 *
 * Enable/disable with `window.__hifeDisable3DWatcher = true`.
 */
function startCharacter3DWatcher(wrapper, inner, characterName) {
  if (typeof window === 'undefined') return;
  if (window.__hifeDisable3DWatcher) return;

  let lastSnapshot = null;
  let frameCount = 0;

  const snapshot = () => {
    const meshVis = [];
    let skinnedCount = 0;
    let visibleMeshCount = 0;
    let hiddenMeshCount = 0;
    inner.traverse(obj => {
      if (obj.isMesh) {
        if (obj.isSkinnedMesh) skinnedCount++;
        if (obj.visible) visibleMeshCount++; else hiddenMeshCount++;
        meshVis.push(`${obj.name || obj.type}:${obj.visible ? 'V' : 'H'}:fc=${obj.frustumCulled}`);
      }
    });

    const mixer = wrapper.userData.animationMixer;
    const currentAction = wrapper.userData.currentAction;
    const oneShot = wrapper.userData.oneShot;

    return {
      wrapperVisible: wrapper.visible,
      wrapperParent: wrapper.parent ? wrapper.parent.type : 'NONE',
      wrapperParentInScene: !!(wrapper.parent && wrapper.parent.parent !== null || wrapper.parent?.type === 'Scene'),
      wrapperPos: `${wrapper.position.x.toFixed(2)},${wrapper.position.y.toFixed(2)},${wrapper.position.z.toFixed(2)}`,
      wrapperScale: `${wrapper.scale.x.toFixed(2)},${wrapper.scale.y.toFixed(2)},${wrapper.scale.z.toFixed(2)}`,
      innerVisible: inner.visible,
      innerScale: `${inner.scale.x.toFixed(2)},${inner.scale.y.toFixed(2)},${inner.scale.z.toFixed(2)}`,
      visibleMeshCount,
      hiddenMeshCount,
      skinnedCount,
      meshVis: meshVis.join(' | '),
      mixerTime: mixer ? mixer.time.toFixed(2) : 'no-mixer',
      currentClip: currentAction?.getClip?.()?.name || 'none',
      currentActionWeight: currentAction ? currentAction.getEffectiveWeight().toFixed(2) : 'none',
      currentActionEnabled: currentAction ? currentAction.enabled : 'none',
      oneShotClip: oneShot?.getClip?.()?.name || 'none',
    };
  };

  const tick = () => {
    // Stop watching if the wrapper has been disposed / detached from any scene.
    if (!wrapper.parent && frameCount > 2) {
      console.log(`[Watcher:${characterName}] wrapper detached, stopping`);
      return;
    }

    const next = snapshot();
    frameCount++;

    if (!lastSnapshot) {
      console.log(`[Watcher:${characterName}] initial`, next);
    } else {
      const diff = {};
      for (const key of Object.keys(next)) {
        if (next[key] !== lastSnapshot[key]) {
          diff[key] = `${lastSnapshot[key]}  →  ${next[key]}`;
        }
      }
      if (Object.keys(diff).length > 0) {
        console.log(`[Watcher:${characterName}] t=${frameCount}s changed`, diff);
      }
    }

    // ALWAYS log if anything is hidden — that's the bug we're hunting.
    if (next.wrapperVisible === false || next.innerVisible === false || next.hiddenMeshCount > 0) {
      console.warn(`[Watcher:${characterName}] HIDDEN at t=${frameCount}s`, next);
    }

    lastSnapshot = next;
    setTimeout(tick, 1000);
  };

  setTimeout(tick, 1000);
}

/**
 * Character 3D model configuration
 */
const MODEL_CONFIG = {
  // Scale factor to match sprite size
  defaultScale: 1.0,
  // Animation mixer settings
  animationSpeed: 1.0,
  // Shadow settings
  castShadow: true,
  receiveShadow: true
};

/**
 * Character-specific model configurations
 * Override default settings per character
 */
const CHARACTER_MODEL_CONFIGS = {
  lucy: {
    scale: 1.0,
    animationSpeed: 1.0,
    baseRotationY: Math.PI / 2
  },
  herald: {
    scale: 1.0,
    animationSpeed: 1.0,
    baseRotationY: Math.PI / 2
  },
  draco: {
    scale: 0.35,
    // Small frame reads faster — bump mixer speed so the walk/jump/attack
    // clips feel twitchy and toddler-quick instead of papa-pace.
    animationSpeed: 1.35,
    // Model already stands upright in source. Only a Y rotation is needed to
    // orient its gaze along the game's forward axis.
    baseRotationY: Math.PI
  }
};

export function getCharacter3DBaseRotationY(characterName) {
  const cfg = CHARACTER_MODEL_CONFIGS[characterName];
  if (cfg && typeof cfg.baseRotationY === 'number') return cfg.baseRotationY;
  return Math.PI / 2;
}

/**
 * Per-character mapping from the in-game logical animation key
 * (lowercase: walk, run, idle, jump, hit, death, spawn) to the actual
 * GLB clip name. A value of `null` means "no clip — keep the mixer paused".
 * Falls back to the logical key when no override is set.
 */
const CHARACTER_ANIMATION_NAME_MAPS = {
  draco: {
    idle: null,
    walk: 'Walk',
    run: 'Walk',
    jump: 'Jump',
    hit: 'Heal',
    death: 'Heal',
    spawn: 'Walk',
    attack: 'Attack',
    fly: 'Fly'
  }
};

/**
 * Resolve a logical animation key (e.g. 'walk') to the actual clip name
 * for the given character's GLB.
 * @param {string} characterName
 * @param {string} logicalKey
 * @returns {string}
 */
export function resolveCharacter3DAnimationName(characterName, logicalKey) {
  const map = CHARACTER_ANIMATION_NAME_MAPS[characterName];
  if (map && Object.prototype.hasOwnProperty.call(map, logicalKey)) {
    return map[logicalKey];
  }
  return logicalKey;
}

/**
 * Load a 3D character model
 * @param {string} characterName - Character name ('lucy' or 'herald')
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<THREE.Group>} Loaded model group
 */
export async function loadCharacterModel(characterName, onProgress = null) {
  const modelPath = getCharacterModelPath(characterName);

  if (onProgress) {
    onProgress(0.5, 1, `Loading ${characterName} 3D model...`);
  }

  try {
    const inner = await loadModel(modelPath);

    const config = CHARACTER_MODEL_CONFIGS[characterName] || {};
    const scale = config.scale || MODEL_CONFIG.defaultScale;

    inner.scale.set(scale, scale, scale);

    inner.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = MODEL_CONFIG.castShadow;
        child.receiveShadow = MODEL_CONFIG.receiveShadow;
        child.visible = true;
        // Any mesh inside a rigged character can drift outside its bind-pose
        // bounding sphere once bones deform it (skinned) or its parent bone
        // translates it (mesh-on-bone). Disable frustum culling outright so
        // animated transforms never make the model vanish.
        child.frustumCulled = false;
      }
    });

    // Apply per-character pre-rotations to the inner mesh so the outer wrapper
    // can rotate around Y freely without clobbering an X/Z tilt the model needs.
    if (typeof config.baseRotationX === 'number') {
      inner.rotation.x = config.baseRotationX;
    }
    if (typeof config.baseRotationZ === 'number') {
      inner.rotation.z = config.baseRotationZ;
    }

    // The mixer must be bound to the actual animated root (the cloned scene),
    // not to a wrapper Group that has no bones.
    const animations = inner.animations || [];
    const mixer = animations.length > 0 ? new THREE.AnimationMixer(inner) : null;
    if (mixer) {
      const animationSpeed =
        typeof config.animationSpeed === 'number'
          ? config.animationSpeed
          : MODEL_CONFIG.animationSpeed;
      mixer.timeScale = animationSpeed;
    }
    console.log(
      `[Character3DLoader] ${characterName} clips:`,
      animations.map(a => a.name),
    );

    // Wrap the inner model so we can rotate the wrapper around Y for facing
    // without touching the inner's X/Z tilt.
    const wrapper = new THREE.Group();
    wrapper.add(inner);
    wrapper.userData.animationMixer = mixer;
    wrapper.userData.animations = animations;
    wrapper.userData.characterName = characterName;
    wrapper.userData.inner = inner;
    wrapper.visible = true;

    // Diagnostic watcher: every second, snapshot the wrapper + inner + mesh
    // visibility state and log any change. When the model "disappears mid-game"
    // the very next tick after the failure will show exactly which property
    // flipped (and the stack of the call site can be found by searching for
    // that property name).
    startCharacter3DWatcher(wrapper, inner, characterName);

    if (onProgress) {
      onProgress(1, 1, `${characterName} 3D model loaded`);
    }

    return wrapper;
  } catch (error) {
    console.error(`[Character3DLoader] Failed to load 3D model for ${characterName} from ${modelPath}:`, error);
    throw error;
  }
}

/**
 * Preload a character 3D model
 * @param {string} characterName - Character name
 * @returns {Promise<void>}
 */
export async function preloadCharacterModel(characterName) {
  const modelPath = getCharacterModelPath(characterName);
  return preloadModel(modelPath);
}

/**
 * Create a 3D character mesh positioned at ground level
 * @param {string} characterName - Character name
 * @param {number} x - X position
 * @param {number} z - Z position
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<THREE.Group>} Positioned character model
 */
export async function createCharacter3DAtPosition(characterName, x, z, onProgress = null) {
  const model = await loadCharacterModel(characterName, onProgress);
  
  // Get character stats for positioning
  const movementStats = getCharacterMovementStats();
  const playerHeight = movementStats.playerHeight;
  
  // Position model at ground level (center Y at half height)
  model.position.set(x, playerHeight * 0.5, z);
  
  return model;
}

/**
 * Update 3D character animation
 * @param {THREE.Group} model - Character model
 * @param {string} animationName - Animation name to play
 * @param {number} dt - Delta time in seconds
 * @param {boolean} loop - Whether to loop the animation
 */
/**
 * Find an AnimationClip on this model whose name matches `targetName`
 * case-insensitively. Returns null and warns when nothing matches.
 */
function findClipCaseInsensitive(animations, targetName) {
  if (!targetName) return null;
  const lower = String(targetName).toLowerCase();
  const clip = animations.find(a => a.name && a.name.toLowerCase() === lower);
  if (!clip) {
    console.warn(
      `[Character3DLoader] Clip "${targetName}" not found. Available:`,
      animations.map(a => a.name),
    );
    return null;
  }
  return clip;
}

const ONE_SHOT_CROSSFADE = 0.2;

export function updateCharacter3DAnimation(model, animationName, dt, loop = true) {
  if (!model.userData.animationMixer) return;

  const mixer = model.userData.animationMixer;
  // While a one-shot is active, only advance the mixer — never switch clips.
  // The 'finished' listener installed by triggerCharacter3DOneShot will hand
  // control back to the movement animation.
  if (model.userData.oneShot) {
    mixer.update(dt);
    return;
  }

  const animations = model.userData.animations || [];
  const characterName = model.userData.characterName;

  const resolvedName = resolveCharacter3DAnimationName(characterName, animationName);
  if (resolvedName === null) {
    mixer.stopAllAction();
    model.userData.currentAction = null;
    return;
  }

  const clip =
    findClipCaseInsensitive(animations, resolvedName) ||
    findClipCaseInsensitive(animations, animationName);
  if (!clip) return;

  let action = mixer.existingAction(clip);
  if (!action) action = mixer.clipAction(clip);

  const desiredLoop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
  const isCurrent = model.userData.currentAction === action;
  if (!isCurrent) {
    mixer.stopAllAction();
    action.reset();
    action.setLoop(desiredLoop, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;
    action.play();
    model.userData.currentAction = action;
  } else if (action.loop !== desiredLoop) {
    action.setLoop(desiredLoop, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;
  }

  mixer.update(dt);
}

/**
 * Play a one-shot clip on the model. Crossfades from the current action,
 * clears the one-shot when the clip finishes, and crossfades back to the
 * movement animation via the supplied callback.
 *
 * @param {THREE.Object3D} model
 * @param {string} logicalKey - e.g. 'attack', 'heal'
 * @param {() => void} [onFinished] - called once the one-shot completes
 * @returns {boolean} true if the one-shot started, false if the clip is missing
 */
export function triggerCharacter3DOneShot(model, logicalKey, onFinished) {
  if (!model || !model.userData) return false;
  const mixer = model.userData.animationMixer;
  if (!mixer) return false;

  const animations = model.userData.animations || [];
  const characterName = model.userData.characterName;
  const resolvedName = resolveCharacter3DAnimationName(characterName, logicalKey);
  if (!resolvedName) return false;

  const clip =
    findClipCaseInsensitive(animations, resolvedName) ||
    findClipCaseInsensitive(animations, logicalKey);
  if (!clip) return false;

  const action = mixer.clipAction(clip);
  action.reset();
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.enabled = true;
  action.setEffectiveTimeScale(1);
  action.setEffectiveWeight(1);

  const previous = model.userData.currentAction;
  if (previous && previous !== action) {
    previous.crossFadeTo(action, ONE_SHOT_CROSSFADE, false);
  }
  action.play();

  // Tear down any previous finished listener before installing a new one,
  // so rapid re-triggers (button mashing) don't stack handlers.
  const existing = model.userData.oneShotFinishedListener;
  if (existing) {
    mixer.removeEventListener('finished', existing);
  }

  const listener = (event) => {
    if (event.action !== action) return;
    mixer.removeEventListener('finished', listener);
    if (model.userData.oneShotFinishedListener === listener) {
      model.userData.oneShotFinishedListener = null;
    }
    model.userData.oneShot = null;
    // Leave currentAction pointing at the one-shot so the next
    // updateCharacter3DAnimation() call sees a stale currentAction and
    // crossfades the resumed movement clip in cleanly.
    if (typeof onFinished === 'function') onFinished();
  };
  mixer.addEventListener('finished', listener);
  model.userData.oneShotFinishedListener = listener;
  model.userData.oneShot = action;
  return true;
}

/**
 * Stop all animations on a 3D character model
 * @param {THREE.Group} model - Character model
 */
export function stopCharacter3DAnimations(model) {
  if (!model.userData.animationMixer) return;
  
  const mixer = model.userData.animationMixer;
  mixer.stopAllAction();
}

/**
 * Set animation speed for a character model
 * @param {THREE.Group} model - Character model
 * @param {number} speed - Animation speed multiplier
 */
export function setCharacter3DAnimationSpeed(model, speed) {
  if (!model.userData.animationMixer) return;
  
  const mixer = model.userData.animationMixer;
  mixer.timeScale = speed;
}

/**
 * Get available animations for a character model
 * @param {THREE.Group} model - Character model
 * @returns {string[]} Array of animation names
 */
export function getCharacter3DAnimations(model) {
  const animations = model.userData.animations || [];
  return animations.map(anim => anim.name);
}

/**
 * Configure model scale and appearance
 * @param {THREE.Group} model - Character model
 * @param {string} characterName - Character name
 */
export function configureCharacter3DModel(model, characterName) {
  const config = CHARACTER_MODEL_CONFIGS[characterName] || {};

  // The outer wrapper handles facing rotation; the inner mesh keeps its
  // per-character X/Z pre-rotations baked in by loadCharacterModel.
  // Wrapper Y-rotation starts at the character's base orientation so the
  // model faces the right way before gameplay rotation lerps in.
  model.rotation.y = getCharacter3DBaseRotationY(characterName);

  // Configure materials for better rendering
  model.traverse((child) => {
    if (child.isMesh) {
      // Ensure materials are properly configured
      if (child.material) {
        // Handle both single materials and arrays
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(mat => {
          if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
            // Ensure proper shadow settings
            mat.shadowSide = THREE.FrontSide;
          }
        });
      }
      
      child.castShadow = MODEL_CONFIG.castShadow;
      child.receiveShadow = MODEL_CONFIG.receiveShadow;
    }
  });
}

