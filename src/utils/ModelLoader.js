/**
 * ModelLoader.js
 * 
 * Utility for loading 3D models (GLB/GLTF files) with caching.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

// Lazy load GLTFLoader - we'll create it manually to avoid import issues
let loader = null;
let loaderPromise = null;
let skeletonUtilsPromise = null;

async function getSkeletonUtils() {
  if (skeletonUtilsPromise) return skeletonUtilsPromise;
  skeletonUtilsPromise = (async () => {
    try {
      const dynamicImport = new Function('p', 'return import(p)');
      const mod = await dynamicImport('three/addons/utils/SkeletonUtils.js');
      return mod;
    } catch (err) {
      console.warn('[ModelLoader] SkeletonUtils unavailable, falling back to scene.clone():', err?.message);
      return null;
    }
  })();
  return skeletonUtilsPromise;
}

async function getGLTFLoader() {
  if (loader) return loader;
  if (loaderPromise) return loaderPromise;
  
  loaderPromise = (async () => {
    try {
      const importPath = 'three/addons/loaders/GLTFLoader.js';
      const dynamicImport = new Function('path', 'return import(path)');
      const loaderModule = await dynamicImport(importPath);

      if (!loaderModule || !loaderModule.GLTFLoader) {
        throw new Error('GLTFLoader not found in loaded module');
      }

      loader = new loaderModule.GLTFLoader();
      return loader;
    } catch (error) {
      console.error(`[ModelLoader] Failed to load GLTFLoader via import map:`, error);

      try {
        const cdnUrl = 'https://unpkg.com/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';
        const dynamicImport = new Function('url', 'return import(url)');
        const loaderModule = await dynamicImport(cdnUrl);

        if (!loaderModule || !loaderModule.GLTFLoader) {
          throw new Error('GLTFLoader not found');
        }

        loader = new loaderModule.GLTFLoader();
        return loader;
      } catch (fallbackError) {
        console.error(`[ModelLoader] Fallback also failed:`, fallbackError);
        throw new Error(`Failed to load GLTFLoader. Import map error: ${error.message}. CDN error: ${fallbackError.message}`);
      }
    }
  })();
  
  return loaderPromise;
}
// Model cache to prevent reloading the same models
const modelCache = new Map();

/**
 * Load a GLB/GLTF model
 * @param {string} path - Path to the GLB/GLTF file
 * @returns {Promise<THREE.Group>} Promise that resolves to the loaded model group
 */
function cloneSceneWithAnimations(cachedScene, animations, skeletonUtils = null) {
  const cloned = skeletonUtils?.clone
    ? skeletonUtils.clone(cachedScene)
    : cachedScene.clone();
  cloned.animations = animations || [];
  return cloned;
}

export async function loadModel(path) {
  const skeletonUtils = await getSkeletonUtils();

  if (modelCache.has(path)) {
    const cached = modelCache.get(path);
    return cloneSceneWithAnimations(cached.scene, cached.animations, skeletonUtils);
  }

  const gltfLoader = await getGLTFLoader();

  return new Promise((resolve, reject) => {
    gltfLoader.load(
      path,
      (gltf) => {
        const animations = gltf.animations || [];
        gltf.scene.animations = animations;
        modelCache.set(path, { scene: gltf.scene, animations });
        resolve(cloneSceneWithAnimations(gltf.scene, animations, skeletonUtils));
      },
      undefined,
      (err) => {
        console.error(`[ModelLoader] Error loading model from ${path}:`, err);
        reject(err);
      }
    );
  });
}

/**
 * Get a cached model synchronously (returns null if not cached)
 * @param {string} path - Path to the GLB/GLTF file
 * @returns {THREE.Group|null} Cloned model if cached, null otherwise
 */
export function getCachedModel(path) {
  if (modelCache.has(path)) {
    const cached = modelCache.get(path);
    // Synchronous getter: skeletonUtils may not be loaded yet — fall back to plain clone.
    return cloneSceneWithAnimations(cached.scene, cached.animations);
  }
  return null;
}

/**
 * Check if a model is cached
 * @param {string} path - Path to the GLB/GLTF file
 * @returns {boolean} True if model is cached
 */
export function isModelCached(path) {
  return modelCache.has(path);
}

/**
 * Preload a model (useful for preloading assets)
 * @param {string} path - Path to the GLB/GLTF file
 * @returns {Promise<void>} Promise that resolves when model is loaded
 */
export async function preloadModel(path) {
  if (modelCache.has(path)) {
    return Promise.resolve();
  }

  const gltfLoader = await getGLTFLoader();

  return new Promise((resolve, reject) => {
    gltfLoader.load(
      path,
      (gltf) => {
        const animations = gltf.animations || [];
        gltf.scene.animations = animations;
        modelCache.set(path, { scene: gltf.scene, animations });
        resolve();
      },
      undefined,
      (err) => reject(err)
    );
  });
}

/**
 * Clear the model cache (useful for memory management)
 */
export function clearModelCache() {
  modelCache.clear();
}

