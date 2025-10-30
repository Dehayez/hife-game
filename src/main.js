// Minimal dependencies via CDN ESM
import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { initCharacterSwitcher } from './ui/CharacterSwitcher.js';

const canvas = document.getElementById('app-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10141c);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
scene.add(camera);

// Lighting
const hemi = new THREE.HemisphereLight(0xffffff, 0x202030, 0.8);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(5, 10, 5);
scene.add(dir);

// Ground (arena)
const arenaSize = 20; // square arena
const groundGeo = new THREE.PlaneGeometry(arenaSize, arenaSize, 1, 1);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2c3240, roughness: 0.9, metalness: 0.0 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Grid helper for orientation
const grid = new THREE.GridHelper(arenaSize, arenaSize, 0x3c8ce7, 0x2a3a56);
grid.position.y = 0.01;
scene.add(grid);

// Player (sprite billboard with PNG sprite-sheets, adjustable FPS)
const playerSize = 0.8;
const playerHeight = 1.2; // visual height of the sprite
const loader = new THREE.TextureLoader();

function getParam(name, fallback) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name) || fallback;
}

// Character selection via URL param ?char=lucy (defaults to 'lucy')
let characterName = getParam('char', 'lucy');

function loadSpriteSheet(basePathPng) {
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

async function tryLoadJson(path) {
  try {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

function loadTexture(path) {
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

// Load animation either as numbered frames (<name>_0.png.._N.png) or as a sprite sheet (<name>.png + optional JSON)
async function loadAnimationSmart(basePathNoExt, fallbackFps = 8, defaultFrameCount = 1) {
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

// Runtime-loadable character animations
let animations = null;
const spriteGeo = new THREE.PlaneGeometry(playerHeight * 0.7, playerHeight);
const spriteMat = new THREE.MeshBasicMaterial({ transparent: true });
const player = new THREE.Mesh(spriteGeo, spriteMat);
player.position.set(0, playerHeight * 0.5, 0);
scene.add(player);

let lastFacing = 'front'; // 'front' or 'back'
let currentAnimKey = 'idle_front';

function setCurrentAnim(key, force = false) {
  if (!animations) return;
  if (!force && currentAnimKey === key) return;
  currentAnimKey = key;
  const anim = animations[key];
  if (!anim) return;
  // Reset timing so first frame shows immediately
  anim.frameIndex = 0;
  anim.timeAcc = 0;
  spriteMat.map = anim.mode === 'frames' ? anim.textures[0] : anim.texture;
  if (anim.mode === 'sheet') {
    anim.texture.offset.x = 0;
  }
  spriteMat.needsUpdate = true;
}

function updateAnimation(dt) {
  if (!animations) return;
  const anim = animations[currentAnimKey];
  if (!anim || anim.frameCount <= 1) return; // single-frame, nothing to do
  anim.timeAcc += dt;
  const frameDuration = 1 / anim.fps;
  while (anim.timeAcc >= frameDuration) {
    anim.timeAcc -= frameDuration;
    anim.frameIndex = (anim.frameIndex + 1) % anim.frameCount;
    if (anim.mode === 'sheet') {
      const u = anim.frameIndex / anim.frameCount;
      anim.texture.offset.x = u;
    } else if (anim.mode === 'frames') {
      const nextTex = anim.textures[anim.frameIndex];
      if (spriteMat.map !== nextTex) {
        spriteMat.map = nextTex;
        spriteMat.needsUpdate = true;
      }
    }
  }
}

async function loadCharacter(name) {
  characterName = name;
  const baseSpritePath = `/assets/characters/${characterName}/`;
  const loaded = {
    idle_front: await loadAnimationSmart(baseSpritePath + 'idle_front', 4, 1),
    idle_back: await loadAnimationSmart(baseSpritePath + 'idle_back', 4, 1),
    walk_front: await loadAnimationSmart(baseSpritePath + 'walk_front', 8, 4),
    walk_back: await loadAnimationSmart(baseSpritePath + 'walk_back', 8, 4)
  };
  animations = loaded;
  currentAnimKey = 'idle_front';
  lastFacing = 'front';
  // Force refresh so sprite updates immediately on character change
  setCurrentAnim(currentAnimKey, true);
}

// Simple walls (obstacles)
const walls = [];
function addWall(x, z, w, h) {
  const height = 1.2;
  const wallGeo = new THREE.BoxGeometry(w, height, h);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe57474 });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(x, height / 2, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
  walls.push(wall);
}

// Perimeter walls (slightly inside arena bounds)
const margin = 0.2;
addWall(0, -(arenaSize / 2) + margin, arenaSize - margin * 2, 0.4);
addWall(0, (arenaSize / 2) - margin, arenaSize - margin * 2, 0.4);
addWall(-(arenaSize / 2) + margin, 0, 0.4, arenaSize - margin * 2);
addWall((arenaSize / 2) - margin, 0, 0.4, arenaSize - margin * 2);

// Inner obstacles
addWall(-4, -2, 6, 0.4);
addWall(3, 3, 0.4, 6);
addWall(-2, 5, 4, 0.4);

// Keyboard input (supports Arrow keys, WASD and ZQSD via .code)
const inputState = { up: false, down: false, left: false, right: false };
function setKeyState(e, pressed) {
  // Arrow keys by value
  switch (e.key) {
    case 'ArrowUp': inputState.up = pressed; break;
    case 'ArrowDown': inputState.down = pressed; break;
    case 'ArrowLeft': inputState.left = pressed; break;
    case 'ArrowRight': inputState.right = pressed; break;
  }
  // Layout-agnostic WASD using physical key codes (works for ZQSD on AZERTY)
  switch (e.code) {
    case 'KeyW': inputState.up = pressed; break;
    case 'KeyS': inputState.down = pressed; break;
    case 'KeyA': inputState.left = pressed; break;
    case 'KeyD': inputState.right = pressed; break;
  }
  // Fallback for browsers emitting localized letters via e.key
  switch (e.key) {
    case 'w': case 'W': case 'z': case 'Z': inputState.up = pressed; break; // Z on AZERTY
    case 's': case 'S': inputState.down = pressed; break;
    case 'a': case 'A': case 'q': case 'Q': inputState.left = pressed; break; // Q on AZERTY
    case 'd': case 'D': inputState.right = pressed; break;
  }
}
window.addEventListener('keydown', (e) => { setKeyState(e, true); });
window.addEventListener('keyup', (e) => { setKeyState(e, false); });

// Movement parameters
const moveSpeed = 4; // units per second
const turnLerp = 0.18; // smooth facing rotation

// Simple AABB collision helper
function getAABBFor(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  return box;
}

function willCollide(nextPos) {
  // Construct a temporary AABB for player at next position
  const half = playerSize / 2;
  const playerBox = new THREE.Box3(
    new THREE.Vector3(nextPos.x - half, 0, nextPos.z - half),
    new THREE.Vector3(nextPos.x + half, playerSize, nextPos.z + half)
  );
  for (const w of walls) {
    const wallBox = getAABBFor(w);
    if (playerBox.intersectsBox(wallBox)) return true;
  }
  return false;
}

// Camera follow offset
const cameraOffset = new THREE.Vector3(0, 6, 8);

// Resize handling
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
onResize();

// Main loop
let lastTime = performance.now();
function tick(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;

  // Input vector
  const input = new THREE.Vector2(
    (inputState.right ? 1 : 0) - (inputState.left ? 1 : 0),
    (inputState.up ? 1 : 0) - (inputState.down ? 1 : 0)
  );
  if (input.lengthSq() > 1) input.normalize();

  // Calculate intended next position on XZ plane
  const velocity = new THREE.Vector3(input.x, 0, -input.y).multiplyScalar(moveSpeed * dt);
  const nextPos = player.position.clone().add(velocity);

  // Collision check against walls and boundaries
  const halfArena = arenaSize / 2 - 0.6; // keep small offset from perimeter walls
  nextPos.x = Math.max(-halfArena, Math.min(halfArena, nextPos.x));
  nextPos.z = Math.max(-halfArena, Math.min(halfArena, nextPos.z));

  if (!willCollide(nextPos)) {
    player.position.copy(nextPos);
  }

  // Smooth facing direction
  // Billboard the sprite to camera around Y only
  const camYaw = camera.rotation.y;
  player.rotation.set(0, camYaw, 0);

  // Choose animation based on movement and last facing (front/back)
  if (input.lengthSq() > 0.0001) {
    lastFacing = velocity.z < 0 ? 'back' : 'front';
    setCurrentAnim(lastFacing === 'back' ? 'walk_back' : 'walk_front');
  } else {
    setCurrentAnim(lastFacing === 'back' ? 'idle_back' : 'idle_front');
  }
  updateAnimation(dt);

  // Camera follows player
  const desiredCamPos = player.position.clone().add(cameraOffset);
  camera.position.lerp(desiredCamPos, 0.08);
  camera.lookAt(player.position.x, player.position.y + 0.4, player.position.z);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// Initialize character switcher UI
const AVAILABLE_CHARACTERS = ['lucy', 'herald'];
const switcherMount = document.getElementById('char-switcher') || document.body;
const initialChar = characterName;
initCharacterSwitcher({
  mount: switcherMount,
  options: AVAILABLE_CHARACTERS,
  value: initialChar,
  onChange: (val) => { loadCharacter(val); }
});

// First character load
await loadCharacter(initialChar);


