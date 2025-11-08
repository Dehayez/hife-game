/**
 * ModelLoader.js
 * 
 * Utility for loading 3D models (GLB/GLTF files) with caching.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

// Lazy load GLTFLoader to handle import map resolution
let loader = null;
let loaderPromise = null;

async function getGLTFLoader() {
  if (loader) return loader;
  if (loaderPromise) return loaderPromise;
  
  loaderPromise = (async () => {
    try {
      // Try import map path first (works in browser)
      const loaderModule = await import('three/addons/loaders/GLTFLoader.js');
      loader = new loaderModule.GLTFLoader();
      return loader;
    } catch (e) {
      // Fallback: import directly from CDN
      const loaderModule = await import('https://unpkg.com/three@0.160.1/examples/jsm/loaders/GLTFLoader.js');
      loader = new loaderModule.GLTFLoader();
      return loader;
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
export async function loadModel(path) {
  // Check cache first
  if (modelCache.has(path)) {
    return Promise.resolve(modelCache.get(path).clone());
  }

  const gltfLoader = await getGLTFLoader();
  
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      path,
      (gltf) => {
        // Cache the original model
        modelCache.set(path, gltf.scene);
        // Return a clone so multiple instances can use the same model
        resolve(gltf.scene.clone());
      },
      undefined,
      (err) => reject(err)
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
    return modelCache.get(path).clone();
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
        modelCache.set(path, gltf.scene);
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

