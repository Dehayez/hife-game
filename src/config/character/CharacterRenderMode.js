/**
 * CharacterRenderMode.js
 * 
 * Configuration for character rendering mode (2D sprites vs 3D models).
 * Allows switching between sprite-based and 3D model rendering.
 */

/**
 * Character render modes
 */
export const RENDER_MODE = {
  SPRITE: 'sprite',  // 2D sprite sheets (PNG)
  MODEL_3D: '3d'     // 3D models (GLB/GLTF)
};

/**
 * Default render mode
 * Can be changed per character or globally
 */
export const DEFAULT_RENDER_MODE = RENDER_MODE.SPRITE;

/**
 * Character-specific render mode overrides
 * Set to RENDER_MODE.MODEL_3D to use 3D models for specific characters
 * @type {Object<string, string>}
 */
export const CHARACTER_RENDER_MODES = {
  lucy: DEFAULT_RENDER_MODE,
  herald: RENDER_MODE.MODEL_3D,  // Enable 3D mode for Herald
  draco: RENDER_MODE.MODEL_3D
};

/**
 * Per-character GLB path overrides. When absent, falls back to
 * `/assets/characters/<name>/<name>.glb`.
 */
const CHARACTER_MODEL_PATH_OVERRIDES = {
  draco: '/assets/characters/herald/Draco.glb'
};

/**
 * Get render mode for a specific character
 * @param {string} characterName - Character name ('lucy' or 'herald')
 * @returns {string} Render mode (RENDER_MODE.SPRITE or RENDER_MODE.MODEL_3D)
 */
export function getCharacterRenderMode(characterName) {
  return CHARACTER_RENDER_MODES[characterName] || DEFAULT_RENDER_MODE;
}

/**
 * Set render mode for a specific character
 * @param {string} characterName - Character name
 * @param {string} mode - Render mode (RENDER_MODE.SPRITE or RENDER_MODE.MODEL_3D)
 */
export function setCharacterRenderMode(characterName, mode) {
  if (mode !== RENDER_MODE.SPRITE && mode !== RENDER_MODE.MODEL_3D) {
    console.warn(`Invalid render mode: ${mode}. Using default.`);
    return;
  }
  CHARACTER_RENDER_MODES[characterName] = mode;
}

/**
 * Check if character should use 3D models
 * @param {string} characterName - Character name
 * @returns {boolean} True if using 3D models
 */
export function isUsing3DModels(characterName) {
  return getCharacterRenderMode(characterName) === RENDER_MODE.MODEL_3D;
}

/**
 * Get 3D model path for a character
 * @param {string} characterName - Character name
 * @returns {string} Path to GLB file
 */
export function getCharacterModelPath(characterName) {
  return (
    CHARACTER_MODEL_PATH_OVERRIDES[characterName] ||
    `/assets/characters/${characterName}/${characterName}.glb`
  );
}

