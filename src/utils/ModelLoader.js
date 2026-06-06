/**
 * ModelLoader.js
 * 
 * Utility for loading 3D models (GLB/GLTF files) with caching.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

// Lazy load GLTFLoader - we'll create it manually to avoid import issues
let loader = null;
let loaderPromise = null;

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
export async function loadModel(path) {
  if (modelCache.has(path)) {
    return Promise.resolve(modelCache.get(path).clone());
  }

  const gltfLoader = await getGLTFLoader();

  return new Promise((resolve, reject) => {
    gltfLoader.load(
      path,
      (gltf) => {
        modelCache.set(path, gltf.scene);
        resolve(gltf.scene.clone());
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

