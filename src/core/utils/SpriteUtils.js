/**
 * SpriteUtils.js
 * 
 * Shared utilities for creating sprite meshes.
 * Used by CharacterManager, BotManager, and RemotePlayerManager to avoid duplication.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

/**
 * Sprite creation configuration
 */
export const SPRITE_CONFIG = {
  widthMultiplier: 0.7,      // Width relative to height (0.7 = 70% of height)
  alphaTest: 0.1,            // Alpha test threshold for transparency
  castShadow: true,          // Whether sprite casts shadows
  receiveShadow: false       // Whether sprite receives shadows
};

/**
 * Create a sprite mesh for a character/bot
 * @param {number} height - Sprite height
 * @param {Object} options - Optional configuration
 * @param {number} options.widthMultiplier - Width multiplier (default: 0.7)
 * @param {number} options.alphaTest - Alpha test threshold (default: 0.1)
 * @param {boolean} options.castShadow - Whether to cast shadows (default: true)
 * @param {boolean} options.receiveShadow - Whether to receive shadows (default: false)
 * @returns {THREE.Mesh} Created sprite mesh
 */
export function createSpriteMesh(height, options = {}) {
  const widthMultiplier = options.widthMultiplier ?? SPRITE_CONFIG.widthMultiplier;
  const alphaTest = options.alphaTest ?? SPRITE_CONFIG.alphaTest;
  const castShadow = options.castShadow ?? SPRITE_CONFIG.castShadow;
  const receiveShadow = options.receiveShadow ?? SPRITE_CONFIG.receiveShadow;
  
  const spriteGeo = new THREE.PlaneGeometry(height * widthMultiplier, height);
  const spriteMat = new THREE.MeshBasicMaterial({ 
    transparent: true, 
    alphaTest: alphaTest 
  });
  const sprite = new THREE.Mesh(spriteGeo, spriteMat);
  
  sprite.castShadow = castShadow;
  sprite.receiveShadow = receiveShadow;
  
  return sprite;
}

/**
 * Create a sprite mesh positioned at ground level
 * @param {number} height - Sprite height
 * @param {number} x - X position
 * @param {number} z - Z position
 * @param {Object} options - Optional configuration (see createSpriteMesh)
 * @returns {THREE.Mesh} Created and positioned sprite mesh
 */
export function createSpriteAtPosition(height, x, z, options = {}) {
  const sprite = createSpriteMesh(height, options);
  sprite.position.set(x, height * 0.5, z);
  return sprite;
}

