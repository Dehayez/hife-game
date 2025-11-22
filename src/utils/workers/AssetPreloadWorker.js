/**
 * AssetPreloadWorker.js
 * 
 * Web Worker for preloading and processing assets in parallel.
 * Handles JSON loading, file existence checks, and data processing.
 */

// Worker message handler
self.onmessage = async function(e) {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case 'CHECK_FILE_EXISTS':
        await handleCheckFileExists(payload);
        break;
      
      case 'LOAD_JSON':
        await handleLoadJson(payload);
        break;
      
      case 'PREFETCH_ASSETS':
        await handlePrefetchAssets(payload);
        break;
      
      case 'PROCESS_ANIMATION_METADATA':
        await handleProcessAnimationMetadata(payload);
        break;
      
      default:
        self.postMessage({
          type: 'ERROR',
          payload: { error: `Unknown message type: ${type}` }
        });
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      payload: { error: error.message, originalType: type }
    });
  }
};

/**
 * Check if a file exists using HEAD request
 */
async function handleCheckFileExists(payload) {
  const { paths, requestId } = payload;
  const results = {};

  const checkPromises = paths.map(async (path) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(path, {
        method: 'HEAD',
        cache: 'default',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      results[path] = response.ok;
    } catch (error) {
      results[path] = false;
    }
  });

  await Promise.all(checkPromises);

  self.postMessage({
    type: 'FILE_EXISTS_RESULT',
    payload: { results, requestId }
  });
}

/**
 * Load JSON files in parallel
 */
async function handleLoadJson(payload) {
  const { paths, requestId } = payload;
  const results = {};

  const loadPromises = paths.map(async (path) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(path, {
        cache: 'default',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        results[path] = { success: true, data };
      } else {
        results[path] = { success: false, error: 'Not found' };
      }
    } catch (error) {
      results[path] = { success: false, error: error.message };
    }
  });

  await Promise.all(loadPromises);

  self.postMessage({
    type: 'JSON_LOAD_RESULT',
    payload: { results, requestId }
  });
}

/**
 * Prefetch assets to warm browser cache
 */
async function handlePrefetchAssets(payload) {
  const { paths, requestId } = payload;
  const results = {};

  const prefetchPromises = paths.map(async (path) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(path, {
        method: 'GET',
        cache: 'default',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      results[path] = response.ok;
    } catch (error) {
      results[path] = false;
    }
  });

  await Promise.all(prefetchPromises);

  self.postMessage({
    type: 'PREFETCH_RESULT',
    payload: { results, requestId }
  });
}

/**
 * Process animation metadata
 */
async function handleProcessAnimationMetadata(payload) {
  const { basePaths, requestId } = payload;
  const results = {};

  const processPromises = basePaths.map(async (basePath) => {
    const metaPath = `${basePath}.json`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(metaPath, {
        cache: 'default',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
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
    } catch (error) {
      results[basePath] = {
        success: false,
        frameCount: 1,
        fps: 8
      };
    }
  });

  await Promise.all(processPromises);

  self.postMessage({
    type: 'METADATA_RESULT',
    payload: { results, requestId }
  });
}

