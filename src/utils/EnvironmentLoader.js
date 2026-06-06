import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { RGBELoader } from 'https://unpkg.com/three@0.160.1/examples/jsm/loaders/RGBELoader.js';
import { EXRLoader } from 'https://unpkg.com/three@0.160.1/examples/jsm/loaders/EXRLoader.js';

/**
 * EnvironmentLoader.js
 * 
 * Utility for loading HDRI backgrounds and environment maps (similar to Blender).
 * Supports .hdr (RGBE) and .exr formats for realistic lighting and reflections.
 */

// Cache for loaded environments
const environmentCache = new Map();

/**
 * Load an HDRI environment map
 * @param {string} path - Path to HDRI file (.hdr or .exr)
 * @param {THREE.WebGLRenderer} renderer - WebGL renderer instance
 * @param {Object} options - Configuration options
 * @param {boolean} options.useAsBackground - Set as scene background (default: true)
 * @param {boolean} options.useAsEnvironment - Set as scene environment for reflections (default: true)
 * @param {number} options.pmremSize - PMREM texture size (default: 256)
 * @returns {Promise<Object>} Object with texture, envMap, and pmremGenerator
 */
export async function loadEnvironmentMap(path, renderer, options = {}) {
  const {
    useAsBackground = true,
    useAsEnvironment = true,
    pmremSize = 256
  } = options;

  // Check cache first
  if (environmentCache.has(path)) {
    const cached = environmentCache.get(path);
    return {
      texture: cached.texture.clone(),
      envMap: cached.envMap.clone(),
      pmremGenerator: cached.pmremGenerator
    };
  }

  return new Promise((resolve, reject) => {
    const fileExtension = path.toLowerCase().split('.').pop();
    let loader;

    // Choose appropriate loader based on file extension
    if (fileExtension === 'hdr') {
      loader = new RGBELoader();
    } else if (fileExtension === 'exr') {
      loader = new EXRLoader();
    } else {
      reject(new Error(`Unsupported environment format: ${fileExtension}. Use .hdr or .exr`));
      return;
    }

    loader.load(
      path,
      (texture) => {
        // Configure texture settings
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.LinearSRGBColorSpace;

        // Create PMREM generator for prefiltered environment map
        // PMREMGenerator is available from THREE core in version 0.160.1+
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();

        // Generate environment map for reflections and lighting
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        envMap.mapping = THREE.EquirectangularReflectionMapping;

        // Cache the result
        const cached = {
          texture,
          envMap,
          pmremGenerator
        };
        environmentCache.set(path, cached);

        resolve({
          texture: useAsBackground ? texture : null,
          envMap: useAsEnvironment ? envMap : null,
          pmremGenerator
        });
      },
      undefined,
      (error) => {
        reject(new Error(`Failed to load environment map: ${error.message}`));
      }
    );
  });
}

/**
 * Set environment map on a scene
 * @param {THREE.Scene} scene - Three.js scene
 * @param {THREE.Texture} backgroundTexture - Background texture (optional)
 * @param {THREE.Texture} environmentMap - Environment map for reflections (optional)
 */
export function setSceneEnvironment(scene, backgroundTexture = null, environmentMap = null) {
  if (backgroundTexture) {
    scene.background = backgroundTexture;
  }

  if (environmentMap) {
    scene.environment = environmentMap;
  }
}

/**
 * Load and apply environment map to scene
 * @param {THREE.Scene} scene - Three.js scene
 * @param {THREE.WebGLRenderer} renderer - WebGL renderer instance
 * @param {string} path - Path to HDRI file
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Loaded environment data
 */
export async function loadAndApplyEnvironment(scene, renderer, path, options = {}) {
  const envData = await loadEnvironmentMap(path, renderer, options);
  
  setSceneEnvironment(
    scene,
    envData.texture,
    envData.envMap
  );

  return envData;
}

/**
 * Clear environment cache (useful for memory management)
 */
export function clearEnvironmentCache() {
  environmentCache.forEach((cached) => {
    if (cached.texture) cached.texture.dispose();
    if (cached.envMap) cached.envMap.dispose();
    if (cached.pmremGenerator) cached.pmremGenerator.dispose();
  });
  environmentCache.clear();
}

/**
 * Get cache statistics
 */
export function getEnvironmentCacheStats() {
  return {
    cachedEnvironments: environmentCache.size
  };
}

