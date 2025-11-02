import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

/**
 * BaseSceneManager.js
 * 
 * Base class for scene managers to reduce code duplication.
 * Contains shared scene setup logic for both standard and large arenas.
 */
export class BaseSceneManager {
  constructor(arenaSize, cameraOffset) {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.arenaSize = arenaSize;
    this.cameraOffset = cameraOffset || new THREE.Vector3(0, 6, 8);
    this.currentYOffset = cameraOffset ? cameraOffset.y : 6;
    this.magicalParticles = null;
    this.particleSpeeds = [];
    this.time = 0;
    this.blinkingEyes = [];
    this.eyeBlinkTimers = [];
    this.mushrooms = [];
  }

  _setupRenderer(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  _setupScene(fogDensity = 0.045) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1a1f);
    this.scene.fog = new THREE.FogExp2(0x0a1a1f, fogDensity);
  }

  _setupCamera() {
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.scene.add(this.camera);
  }

  _setupLighting(moonlightConfig = { position: [-27, 16, -40], shadowBounds: { left: -30, right: 30, top: 30, bottom: -30 }, far: 100 }) {
    const hemi = new THREE.HemisphereLight(0x4a8a5f, 0x1a1428, 0.6);
    this.scene.add(hemi);
    
    const moonLight = new THREE.DirectionalLight(0xaaccff, 2);
    moonLight.position.set(...moonlightConfig.position);
    moonLight.target.position.set(0, 0, 0);
    moonLight.castShadow = true;
    
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.near = 0.1;
    moonLight.shadow.camera.far = moonlightConfig.far;
    moonLight.shadow.camera.left = moonlightConfig.shadowBounds.left;
    moonLight.shadow.camera.right = moonlightConfig.shadowBounds.right;
    moonLight.shadow.camera.top = moonlightConfig.shadowBounds.top;
    moonLight.shadow.camera.bottom = moonlightConfig.shadowBounds.bottom;
    moonLight.shadow.bias = -0.0001;
    moonLight.shadow.normalBias = 0.02;
    moonLight.shadow.radius = 4;
    
    this.scene.add(moonLight);
    this.scene.add(moonLight.target);
    this.moonLight = moonLight;
    
    const dir = new THREE.DirectionalLight(0x7ab8a0, 0.4);
    dir.position.set(5, 10, 5);
    dir.castShadow = false;
    this.scene.add(dir);
    
    const magicLight1 = new THREE.PointLight(0x8a4fa8, 0.5, 15);
    magicLight1.position.set(-8, 3, -8);
    this.scene.add(magicLight1);
    
    const magicLight2 = new THREE.PointLight(0x4fa88a, 0.5, 15);
    magicLight2.position.set(8, 3, 8);
    this.scene.add(magicLight2);
    
    const centerLight = new THREE.PointLight(0xffcc44, 0.3, 12);
    centerLight.position.set(0, 2, 0);
    this.scene.add(centerLight);
  }

  _setupMoon(moonConfig = { position: [-27, 2, -40], glowOffset: [-28, 2, -42] }) {
    const moonGeo = new THREE.SphereGeometry(1.5, 32, 32);
    const moonMat = new THREE.MeshBasicMaterial({ 
      color: 0xaaccff,
      fog: false
    });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(...moonConfig.position);
    moon.castShadow = false;
    moon.receiveShadow = false;
    
    const glowTexture = this._createRadialGradientTexture(512, 0xaaccff, 1.3, 0);
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      fog: false
    });
    const glow = new THREE.Sprite(glowMaterial);
    glow.position.set(...moonConfig.glowOffset);
    glow.scale.set(8, 8, 1);
    
    this.scene.add(glow);
    this.scene.add(moon);
    this.moon = moon;
    this.moonGlow = glow;
  }

  _createRadialGradientTexture(size = 512, color = 0xaaccff, alphaStart = 0, alphaEnd = 0) {
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;
    
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    
    const gradient = context.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alphaStart})`);
    gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alphaStart * 0.1})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${alphaEnd})`);
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  _setupGround() {
    const groundGeo = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x2a4a3a,
      roughness: 0.85,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    
    const glowGeo = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize, 1, 1);
    const glowMat = new THREE.MeshBasicMaterial({ 
      color: 0x2a4a5a, 
      transparent: true,
      opacity: 0.15
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.01;
    this.scene.add(glow);
  }

  _setupGrid() {
    const grid = new THREE.GridHelper(this.arenaSize, this.arenaSize, 0x4a8a6a, 0x2a4a3a);
    grid.position.y = 0.02;
    
    if (Array.isArray(grid.material)) {
      grid.material.forEach(mat => {
        mat.opacity = 0.3;
        mat.transparent = true;
      });
    } else {
      grid.material.opacity = 0.3;
      grid.material.transparent = true;
    }
    
    this.scene.add(grid);
  }

  _setupResizeHandler() {
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    };
    
    window.addEventListener('resize', onResize);
    onResize();
  }

  updateCamera(playerPosition, isRunning = false) {
    const targetYOffset = isRunning ? this.cameraOffset.y - 0.6 : this.cameraOffset.y;
    this.currentYOffset = THREE.MathUtils.lerp(this.currentYOffset, targetYOffset, 0.05);
    
    const adjustedOffset = new THREE.Vector3(this.cameraOffset.x, this.currentYOffset, this.cameraOffset.z);
    const desiredCamPos = playerPosition.clone().add(adjustedOffset);
    this.camera.position.lerp(desiredCamPos, 0.08);
    this.camera.lookAt(playerPosition.x, playerPosition.y + 0.4, playerPosition.z);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  getArenaSize() {
    return this.arenaSize;
  }

  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }

  setMushroomsVisible(visible) {
    this.mushrooms.forEach(mushroom => {
      mushroom.stem.visible = visible;
      mushroom.cap.visible = visible;
      mushroom.glowLight.visible = visible;
      mushroom.softGlow.visible = visible;
    });
  }
}
