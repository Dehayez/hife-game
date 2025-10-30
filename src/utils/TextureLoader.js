import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

const loader = new THREE.TextureLoader();

export function loadTexture(path) {
  return new Promise((resolve, reject) => {
    const tex = loader.load(
      path,
      () => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        resolve(tex);
      },
      undefined,
      (err) => reject(err)
    );
  });
}

export function loadSpriteSheet(basePathPng) {
  // Try to load metadata JSON next to the PNG (same name .json)
  const metaPath = basePathPng.replace(/\.png$/i, '.json');
  const tex = loader.load(basePathPng);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;

  const anim = { texture: tex, frameCount: 1, fps: 6, frameIndex: 0, timeAcc: 0 };
  
  // Load metadata if present (best-effort)
  fetch(metaPath, { cache: 'no-store' }).then(async (res) => {
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
  }).catch(() => {
    // No metadata; single frame
    anim.frameCount = 1;
    anim.fps = 6;
    tex.repeat.set(1, 1);
  });
  
  return anim;
}

export async function tryLoadJson(path) {
  try {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
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
  
  for (let i = 0; i < frameCountToTry; i++) {
    try {
      // e.g., walk_front_0.png
      // Note: if any frame fails, we bail to spritesheet approach
      // to avoid partial animations
      // eslint-disable-next-line no-await-in-loop
      const t = await loadTexture(`${basePathNoExt}_${i}.png`);
      textures.push(t);
    } catch (_) {
      // If first frame fails, we'll fallback to spritesheet
      if (i === 0) {
        textures.length = 0;
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
