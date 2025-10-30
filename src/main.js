// Minimal dependencies via CDN ESM
import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

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

// Player (simple cube)
const playerSize = 0.8;
const playerGeo = new THREE.BoxGeometry(playerSize, playerSize, playerSize);
const playerMat = new THREE.MeshStandardMaterial({ color: 0x7bd88f });
const player = new THREE.Mesh(playerGeo, playerMat);
player.castShadow = true;
player.position.set(0, playerSize / 2, 0);
scene.add(player);

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
  if (input.lengthSq() > 0.0001) {
    const targetYaw = Math.atan2(velocity.x, velocity.z);
    const currentYaw = player.rotation.y;
    let delta = targetYaw - currentYaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    player.rotation.y = currentYaw + delta * turnLerp;
  }

  // Camera follows player
  const desiredCamPos = player.position.clone().add(cameraOffset);
  camera.position.lerp(desiredCamPos, 0.08);
  camera.lookAt(player.position.x, player.position.y + 0.4, player.position.z);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);


