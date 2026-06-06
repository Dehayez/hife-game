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
    animationSpeed: 1.0
  },
  herald: {
    scale: 1.0,
    animationSpeed: 1.0
  }
};

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
    const model = await loadModel(modelPath);

    const config = CHARACTER_MODEL_CONFIGS[characterName] || {};
    const scale = config.scale || MODEL_CONFIG.defaultScale;

    model.scale.set(scale, scale, scale);

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = MODEL_CONFIG.castShadow;
        child.receiveShadow = MODEL_CONFIG.receiveShadow;
        child.visible = true;
      }
    });

    const animations = model.animations || [];
    let mixer = null;
    if (animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
    }
    
    // Store mixer and animations in userData for easy access
    model.userData.animationMixer = mixer;
    model.userData.animations = animations;
    model.userData.characterName = characterName;
    
    // Ensure model is visible
    model.visible = true;
    
    if (onProgress) {
      onProgress(1, 1, `${characterName} 3D model loaded`);
    }
    
    return model;
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
export function updateCharacter3DAnimation(model, animationName, dt, loop = true) {
  if (!model.userData.animationMixer) return;
  
  const mixer = model.userData.animationMixer;
  const animations = model.userData.animations || [];
  
  // Find animation clip by name
  const clip = animations.find(anim => anim.name === animationName);
  if (!clip) return;
  
  // Get or create animation action
  let action = mixer.existingAction(clip);
  if (!action) {
    action = mixer.clipAction(clip);
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
    action.play();
  }
  
  // Update mixer
  mixer.update(dt);
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
  const scale = config.scale || MODEL_CONFIG.defaultScale;
  
  model.scale.set(scale, scale, scale);
  
  // Apply base rotation of 90 degrees (π/2 radians) around Y axis
  model.rotation.y = Math.PI / 2;
  
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

