import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

const loader = new THREE.TextureLoader();
// Texture cache to prevent reloading the same textures
const textureCache = new Map();

export function loadTexture(path, silent = false) {
  // Check cache first
  if (textureCache.has(path)) {
    return Promise.resolve(textureCache.get(path));
  }

  return new Promise((resolve, reject) => {
    const tex = loader.load(
      path,
      () => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.alphaTest = 0.1;
        // Cache the texture
        textureCache.set(path, tex);
        resolve(tex);
      },
      undefined,
      (err) => {
        reject(err);
      }
    );
  });
}

// Sprite sheet cache to prevent reloading the same sprite sheets
const spriteSheetCache = new Map();

export function loadSpriteSheet(basePathPng) {
  // Check cache first
  if (spriteSheetCache.has(basePathPng)) {
    return spriteSheetCache.get(basePathPng);
  }

  // Try to load metadata JSON next to the PNG (same name .json)
  const metaPath = basePathPng.replace(/\.png$/i, '.json');
  
  // Check if texture is already cached
  let tex;
  if (textureCache.has(basePathPng)) {
    tex = textureCache.get(basePathPng);
  } else {
    // Load texture using the loader - this returns a texture object immediately
    // but the image may not be loaded yet
    tex = loader.load(basePathPng);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.alphaTest = 0.1;
    textureCache.set(basePathPng, tex);
  }

  const anim = { texture: tex, frameCount: 1, fps: 6, frameIndex: 0, timeAcc: 0 };
  
  // Load metadata if present (best-effort) - use browser cache
  fetch(metaPath, { cache: 'default' }).then(async (res) => {
    if (res.ok) {
      const data = await res.json();
      const fc = Number(data.frameCount) || 1;
      const fps = Number(data.fps) || 6;
      anim.frameCount = Math.max(1, fc);
      anim.fps = Math.max(1, fps);
      tex.repeat.set(1 / anim.frameCount, 1);
      tex.offset.x = 0;
    } else {
      // No metadata; treat as single frame
      anim.frameCount = 1;
      anim.fps = 6;
      tex.repeat.set(1, 1);
    }
  }).catch((error) => {
    // No metadata; single frame (expected in some cases)
    anim.frameCount = 1;
    anim.fps = 6;
    tex.repeat.set(1, 1);
  });
  
  // Cache the sprite sheet animation object
  spriteSheetCache.set(basePathPng, anim);
  
  return anim;
}

// JSON cache to prevent reloading the same JSON files
const jsonCache = new Map();

export async function tryLoadJson(path) {
  // Check cache first
  if (jsonCache.has(path)) {
    return jsonCache.get(path);
  }

  try {
    // Use browser cache instead of forcing reload
    const res = await fetch(path, { cache: 'default' });
    if (!res.ok) return null;
    const data = await res.json();
    // Cache the JSON data
    jsonCache.set(path, data);
    return data;
  } catch (error) {
    return null;
  }
}

// Load animation either as numbered frames (<name>_0.png.._N.png) or as a sprite sheet (<name>.png + optional JSON)
export async function loadAnimationSmart(basePathNoExt, fallbackFps = 8, defaultFrameCount = 1) {
  // 1) Try numbered frames first using metadata if available to know frameCount
  const meta = (await tryLoadJson(basePathNoExt + '.json')) || {};
  const frames = Number(meta.frameCount) || undefined;
  const fps = Number(meta.fps) || fallbackFps;

  const frameCountToTry = frames || 4; // assume 4 if not specified
  const textures = [];
  let firstFrameFailed = false;
  
  for (let i = 0; i < frameCountToTry; i++) {
    try {
      // e.g., walk_front_0.png
      // Note: if any frame fails, we bail to spritesheet approach
      // to avoid partial animations
      // Use silent=true for all frames to avoid error spam when falling back to sprite sheet
      // The sprite sheet load will log success/failure
      // eslint-disable-next-line no-await-in-loop
      const t = await loadTexture(`${basePathNoExt}_${i}.png`, true); // Silent - sprite sheet fallback will log
      textures.push(t);
    } catch (error) {
      // If first frame fails, we'll fallback to spritesheet
      if (i === 0) {
        firstFrameFailed = true;
        textures.length = 0;
        // Don't log error here - we'll try sprite sheet next
      } else {
        // Some frames missing; invalidate sequence
        textures.length = 0;
      }
      break;
    }
  }

  if (textures.length > 0) {
    return {
      mode: 'frames',
      textures,
      frameCount: textures.length,
      fps,
      frameIndex: 0,
      timeAcc: 0
    };
  }

  // 2) Fallback to spritesheet (<name>.png)
  const sheet = loadSpriteSheet(basePathNoExt + '.png');
  sheet.mode = 'sheet';
  sheet.fps = Number(sheet.fps) || fallbackFps;
  sheet.frameCount = Number(sheet.frameCount) || defaultFrameCount;
  return sheet;
}

/**
 * Clear all caches (useful for development or memory management)
 */
export function clearTextureCaches() {
  textureCache.clear();
  spriteSheetCache.clear();
  jsonCache.clear();
}

/**
 * Get cache statistics (useful for debugging)
 */
export function getCacheStats() {
  return {
    textures: textureCache.size,
    spriteSheets: spriteSheetCache.size,
    jsonFiles: jsonCache.size
  };
}

/**
 * Wait for a single texture to be fully loaded
 * @param {THREE.Texture} texture - Texture to wait for
 * @returns {Promise<void>} Resolves when texture is loaded
 */
export function waitForTextureLoaded(texture) {
  if (!texture) return Promise.resolve();
  
  return new Promise(resolve => {
    if (!texture.image) {
      // Texture doesn't have image yet, wait a bit
      let attempts = 0;
      const maxAttempts = 40; // 2 seconds max (40 * 50ms)
      const checkInterval = setInterval(() => {
        attempts++;
        if (texture.image) {
          clearInterval(checkInterval);
          if (texture.image.complete && texture.image.naturalWidth > 0) {
            resolve();
          } else {
            texture.image.addEventListener('load', () => resolve(), { once: true });
            texture.image.addEventListener('error', () => resolve(), { once: true });
          }
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          resolve(); // Timeout, resolve anyway
        }
      }, 50);
      return;
    }
    
    // Texture has image
    if (texture.image.complete && texture.image.naturalWidth > 0) {
      resolve();
    } else {
      texture.image.addEventListener('load', () => resolve(), { once: true });
      texture.image.addEventListener('error', () => resolve(), { once: true });
    }
  });
}

/**
 * Wait for all textures in an animation object to be fully loaded
 * @param {Object} animation - Animation object with textures
 * @returns {Promise<void>} Resolves when all textures are loaded
 */
export async function waitForTexturesLoaded(animation) {
  if (!animation) return Promise.resolve();
  
  if (animation.mode === 'frames' && animation.textures) {
    // Wait for all frame textures
    await Promise.all(animation.textures.map(texture => waitForTextureLoaded(texture)));
  } else if (animation.texture) {
    // Wait for sprite sheet texture
    await waitForTextureLoaded(animation.texture);
  }
}

/**
 * Wait for all textures in an animations object to be fully loaded
 * @param {Object} animations - Animations object with multiple animation objects
 * @returns {Promise<void>} Resolves when all textures are loaded
 */
export async function waitForAllAnimationsLoaded(animations) {
  if (!animations) return Promise.resolve();
  
  const promises = [];
  for (const key in animations) {
    if (animations.hasOwnProperty(key)) {
      promises.push(waitForTexturesLoaded(animations[key]));
    }
  }
  
  await Promise.all(promises);
}
