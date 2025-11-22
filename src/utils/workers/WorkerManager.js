/**
 * WorkerManager.js
 * 
 * Manages Web Workers for parallel asset loading and processing.
 * Provides a clean API for using workers without blocking the main thread.
 */

let assetWorker = null;
let requestIdCounter = 0;
const pendingRequests = new Map();

/**
 * Initialize the asset preload worker
 */
export function initWorker() {
  if (assetWorker) {
    return assetWorker;
  }

  try {
    // Create worker from the worker file
    // Use Vite-compatible worker import
    const workerUrl = new URL('./AssetPreloadWorker.js', import.meta.url);
    assetWorker = new Worker(workerUrl, { type: 'module' });

    assetWorker.onmessage = handleWorkerMessage;
    assetWorker.onerror = handleWorkerError;

    return assetWorker;
  } catch (error) {
    console.warn('Failed to initialize Web Worker:', error);
    // Worker initialization failed, but we can still use fallback methods
    return null;
  }
}

/**
 * Handle messages from worker
 */
function handleWorkerMessage(e) {
  const { type, payload } = e.data;
  const { requestId } = payload || {};

  if (requestId && pendingRequests.has(requestId)) {
    const { resolve, reject } = pendingRequests.get(requestId);
    pendingRequests.delete(requestId);

    if (type === 'ERROR') {
      reject(new Error(payload.error || 'Worker error'));
    } else {
      resolve(payload);
    }
  }
}

/**
 * Handle worker errors
 */
function handleWorkerError(error) {
  console.error('Worker error:', error);
  // Reject all pending requests
  for (const [requestId, { reject }] of pendingRequests.entries()) {
    reject(new Error('Worker error occurred'));
  }
  pendingRequests.clear();
}

/**
 * Check if multiple files exist in parallel
 * @param {string[]} paths - Array of file paths to check
 * @returns {Promise<Object>} Object mapping paths to boolean existence
 */
export async function checkFilesExist(paths) {
  if (!paths || paths.length === 0) {
    return {};
  }

  const worker = initWorker();
  if (!worker) {
    // Fallback: check files sequentially on main thread
    return checkFilesExistFallback(paths);
  }

  const requestId = ++requestIdCounter;
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error('File existence check timeout'));
    }, 10000);

    pendingRequests.set(requestId, {
      resolve: (payload) => {
        clearTimeout(timeout);
        resolve(payload.results);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    });

    worker.postMessage({
      type: 'CHECK_FILE_EXISTS',
      payload: { paths, requestId }
    });
  });
}

/**
 * Load multiple JSON files in parallel
 * @param {string[]} paths - Array of JSON file paths
 * @returns {Promise<Object>} Object mapping paths to loaded data or error
 */
export async function loadJsonFiles(paths) {
  if (!paths || paths.length === 0) {
    return {};
  }

  const worker = initWorker();
  if (!worker) {
    // Fallback: load JSON files sequentially on main thread
    return loadJsonFilesFallback(paths);
  }

  const requestId = ++requestIdCounter;
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error('JSON load timeout'));
    }, 15000);

    pendingRequests.set(requestId, {
      resolve: (payload) => {
        clearTimeout(timeout);
        resolve(payload.results);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    });

    worker.postMessage({
      type: 'LOAD_JSON',
      payload: { paths, requestId }
    });
  });
}

/**
 * Prefetch assets to warm browser cache
 * @param {string[]} paths - Array of asset paths to prefetch
 * @returns {Promise<Object>} Object mapping paths to success status
 */
export async function prefetchAssets(paths) {
  if (!paths || paths.length === 0) {
    return {};
  }

  const worker = initWorker();
  if (!worker) {
    // Fallback: prefetch sequentially on main thread
    return prefetchAssetsFallback(paths);
  }

  const requestId = ++requestIdCounter;
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      // Don't reject on timeout for prefetch - it's best effort
      resolve({});
    }, 30000);

    pendingRequests.set(requestId, {
      resolve: (payload) => {
        clearTimeout(timeout);
        resolve(payload.results);
      },
      reject: (error) => {
        clearTimeout(timeout);
        // Don't reject prefetch errors - it's best effort
        resolve({});
      }
    });

    worker.postMessage({
      type: 'PREFETCH_ASSETS',
      payload: { paths, requestId }
    });
  });
}

/**
 * Process animation metadata in parallel
 * @param {string[]} basePaths - Array of base paths (without extension)
 * @returns {Promise<Object>} Object mapping base paths to metadata
 */
export async function processAnimationMetadata(basePaths) {
  if (!basePaths || basePaths.length === 0) {
    return {};
  }

  const worker = initWorker();
  if (!worker) {
    // Fallback: process sequentially on main thread
    return processAnimationMetadataFallback(basePaths);
  }

  const requestId = ++requestIdCounter;
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error('Metadata processing timeout'));
    }, 10000);

    pendingRequests.set(requestId, {
      resolve: (payload) => {
        clearTimeout(timeout);
        resolve(payload.results);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    });

    worker.postMessage({
      type: 'PROCESS_ANIMATION_METADATA',
      payload: { basePaths, requestId }
    });
  });
}

/**
 * Terminate the worker (cleanup)
 */
export function terminateWorker() {
  if (assetWorker) {
    assetWorker.terminate();
    assetWorker = null;
    pendingRequests.clear();
  }
}

// Fallback implementations for when workers aren't available

async function checkFilesExistFallback(paths) {
  const results = {};
  for (const path of paths) {
    try {
      const response = await fetch(path, { method: 'HEAD', cache: 'default' });
      results[path] = response.ok;
    } catch {
      results[path] = false;
    }
  }
  return results;
}

async function loadJsonFilesFallback(paths) {
  const results = {};
  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: 'default' });
      if (response.ok) {
        const data = await response.json();
        results[path] = { success: true, data };
      } else {
        results[path] = { success: false, error: 'Not found' };
      }
    } catch (error) {
      results[path] = { success: false, error: error.message };
    }
  }
  return results;
}

async function prefetchAssetsFallback(paths) {
  const results = {};
  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: 'default' });
      results[path] = response.ok;
    } catch {
      results[path] = false;
    }
  }
  return results;
}

async function processAnimationMetadataFallback(basePaths) {
  const results = {};
  for (const basePath of basePaths) {
    const metaPath = `${basePath}.json`;
    try {
      const response = await fetch(metaPath, { cache: 'default' });
      if (response.ok) {
        const data = await response.json();
        results[basePath] = {
          success: true,
          frameCount: Number(data.frameCount) || 1,
          fps: Number(data.fps) || 8
        };
      } else {
        results[basePath] = {
          success: false,
          frameCount: 1,
          fps: 8
        };
      }
    } catch {
      results[basePath] = {
        success: false,
        frameCount: 1,
        fps: 8
      };
    }
  }
  return results;
}

