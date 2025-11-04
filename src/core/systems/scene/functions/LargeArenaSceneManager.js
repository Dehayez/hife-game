import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

export class LargeArenaSceneManager {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.arenaSize = 40; // Much larger arena (was 20)
    this.cameraOffset = new THREE.Vector3(0, 8, 10); // Adjust camera for larger arena
    this.currentYOffset = 8;
    this.magicalParticles = null;
    this.particleSpeeds = [];
    this.time = 0;
    this.blinkingEyes = [];
    this.eyeBlinkTimers = [];
    this.mushrooms = [];
    this.screenShakeManager = null; // Screen shake manager reference
  }
  
  /**
   * Set screen shake manager
   * @param {Object} screenShakeManager - Screen shake manager instance
   */
  setScreenShakeManager(screenShakeManager) {
    this.screenShakeManager = screenShakeManager;
  }

  init(canvas) {
    this._setupRenderer(canvas);
    this._setupScene();
    this._setupCamera();
    this._setupLighting();
    this._setupMoon();
    this._setupGround();
    this._setupGrid();
    this._setupForestElements();
    this._setupResizeHandler();
  }

  _setupRenderer(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1a1f);
    this.scene.fog = new THREE.FogExp2(0x0a1a1f, 0.03); // Slightly less fog for larger space
  }

  _setupCamera() {
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.scene.add(this.camera);
  }

  _setupLighting() {
    // Magical forest ambient light
    const hemi = new THREE.HemisphereLight(0x4a8a5f, 0x1a1428, 0.6);
    this.scene.add(hemi);
    
    // Moonlight directional light
    const moonLight = new THREE.DirectionalLight(0xaaccff, 2);
    moonLight.position.set(-50, 20, -60);
    moonLight.target.position.set(0, 0, 0);
    moonLight.castShadow = true;
    
    // Shadow settings for larger arena
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.near = 0.1;
    moonLight.shadow.camera.far = 150;
    moonLight.shadow.camera.left = -50;
    moonLight.shadow.camera.right = 50;
    moonLight.shadow.camera.top = 50;
    moonLight.shadow.camera.bottom = -50;
    moonLight.shadow.bias = -0.0001;
    moonLight.shadow.normalBias = 0.02;
    moonLight.shadow.radius = 4;
    
    this.scene.add(moonLight);
    this.scene.add(moonLight.target);
    this.moonLight = moonLight;
    
    // Main directional light
    const dir = new THREE.DirectionalLight(0x7ab8a0, 0.4);
    dir.position.set(10, 15, 10);
    dir.castShadow = false;
    this.scene.add(dir);
    
    // Magical point lights
    const magicLight1 = new THREE.PointLight(0x8a4fa8, 0.5, 20);
    magicLight1.position.set(-15, 3, -15);
    this.scene.add(magicLight1);
    
    const magicLight2 = new THREE.PointLight(0x4fa88a, 0.5, 20);
    magicLight2.position.set(15, 3, 15);
    this.scene.add(magicLight2);
    
    const centerLight = new THREE.PointLight(0xffcc44, 0.3, 15);
    centerLight.position.set(0, 2, 0);
    this.scene.add(centerLight);
  }

  _setupMoon() {
    const moonGeo = new THREE.SphereGeometry(2, 32, 32);
    const moonMat = new THREE.MeshBasicMaterial({ 
      color: 0xaaccff,
      fog: false
    });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(-50, 2, -60);
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
    glow.position.set(-52, 2, -64);
    glow.scale.set(12, 12, 1);
    
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
    
    // Ensure canvas is fully drawn before creating texture
    // CanvasTexture automatically handles updates, no need to set needsUpdate manually
    const texture = new THREE.CanvasTexture(canvas);
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

  _setupForestElements() {
    this._addMagicalTrees();
    this._addGlowingMushrooms();
    this._addMagicalParticles();
    this._addBlinkingEyes();
  }
  
  _addMagicalTrees() {
    // More trees around the larger perimeter
    const treePositions = [
      { x: -18, z: -18 }, { x: 18, z: -18 }, { x: -18, z: 18 }, { x: 18, z: 18 },
      { x: 0, z: -18 }, { x: -18, z: 0 }, { x: 18, z: 0 }, { x: 0, z: 18 },
      { x: -12, z: -18 }, { x: 12, z: -18 }, { x: -18, z: -12 }, { x: 18, z: -12 },
      { x: -12, z: 18 }, { x: 12, z: 18 }, { x: -18, z: 12 }, { x: 18, z: 12 }
    ];
    
    treePositions.forEach(pos => {
      const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 3, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ 
        color: 0x3a2a1a,
        roughness: 0.9 
      });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(pos.x, 1.5, pos.z);
      trunk.castShadow = true;
      this.scene.add(trunk);
      
      const leavesGeo = new THREE.ConeGeometry(1.5, 2.5, 8);
      const leavesMat = new THREE.MeshStandardMaterial({ 
        color: 0x4a8a6a,
        emissive: 0x2a5a4a,
        emissiveIntensity: 0.3,
        roughness: 0.8 
      });
      const leaves = new THREE.Mesh(leavesGeo, leavesMat);
      leaves.position.set(pos.x, 3.5, pos.z);
      leaves.castShadow = true;
      leaves.receiveShadow = true;
      this.scene.add(leaves);
    });
  }
  
  _addGlowingMushrooms() {
    // More mushrooms scattered throughout
    const mushroomPositions = [
      { x: -12, z: -12, size: 0.4 }, { x: 12, z: 12, size: 0.5 },
      { x: -14, z: 6, size: 0.35 }, { x: 14, z: -6, size: 0.4 },
      { x: 6, z: 14, size: 0.45 }, { x: -6, z: -14, size: 0.4 },
      { x: -9, z: 9, size: 0.35 }, { x: 9, z: -9, size: 0.4 },
      { x: 0, z: 12, size: 0.45 }
    ];
    
    mushroomPositions.forEach((pos, index) => {
      const stemGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.3, 6);
      const stemMat = new THREE.MeshStandardMaterial({ 
        color: 0x4a6a5a,
        roughness: 0.9 
      });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(pos.x, 0.15, pos.z);
      stem.castShadow = true;
      stem.receiveShadow = true;
      this.scene.add(stem);
      
      const capGeo = new THREE.SphereGeometry(pos.size * 0.6, 8, 8);
      capGeo.scale(1, 0.4, 1);
      const capMat = new THREE.MeshStandardMaterial({ 
        color: 0x8a4fa8,
        emissive: 0x8a4fa8,
        emissiveIntensity: 1.2,
        roughness: 0.6 
      });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(pos.x, 0.4, pos.z);
      cap.castShadow = true;
      cap.receiveShadow = true;
      this.scene.add(cap);
      
      const glowLight = new THREE.PointLight(0x8a4fa8, 1.2, 4);
      glowLight.position.set(pos.x, 0.5, pos.z);
      this.scene.add(glowLight);
      
      const softGlow = new THREE.PointLight(0x9a5fb8, 0.6, 6);
      softGlow.position.set(pos.x, 0.5, pos.z);
      this.scene.add(softGlow);
      
      this.mushrooms.push({ stem, cap, glowLight, softGlow });
    });
  }
  
  _addMagicalParticles() {
    const particleCount = 60; // More particles for larger arena
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    this.particleInitialPositions = new Float32Array(particleCount * 3);
    this.particleBaseColors = new Float32Array(particleCount * 3);
    this.particleSpeeds = [];
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const x = (Math.random() - 0.5) * this.arenaSize;
      const y = Math.random() * 3 + 0.5;
      const z = (Math.random() - 0.5) * this.arenaSize;
      
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
      
      this.particleInitialPositions[i3] = x;
      this.particleInitialPositions[i3 + 1] = y;
      this.particleInitialPositions[i3 + 2] = z;
      
      this.particleSpeeds.push({
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.03,
        z: (Math.random() - 0.5) * 0.02,
        phase: Math.random() * Math.PI * 2,
        blinkPhase: Math.random() * Math.PI * 2
      });
      
      const isYellow = Math.random() > 0.3;
      let baseR, baseG, baseB;
      if (isYellow) {
        baseR = 1.0;
        baseG = 0.85 + Math.random() * 0.15;
        baseB = 0.3 + Math.random() * 0.2;
      } else {
        baseR = 0.4 + Math.random() * 0.2;
        baseG = 1.0;
        baseB = 0.3 + Math.random() * 0.2;
      }
      
      this.particleBaseColors[i3] = baseR;
      this.particleBaseColors[i3 + 1] = baseG;
      this.particleBaseColors[i3 + 2] = baseB;
      
      colors[i3] = baseR;
      colors[i3 + 1] = baseG;
      colors[i3 + 2] = baseB;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);
    
    const material = new THREE.PointsMaterial({
      size: 0.11,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      map: texture,
      sizeAttenuation: true
    });
    
    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
    this.magicalParticles = particles;
  }
  
  updateParticles(dt) {
    if (!this.magicalParticles || !this.particleSpeeds) return;
    
    this.time += dt;
    const positions = this.magicalParticles.geometry.attributes.position.array;
    const colors = this.magicalParticles.geometry.attributes.color.array;
    
    for (let i = 0; i < this.particleSpeeds.length; i++) {
      const i3 = i * 3;
      const speed = this.particleSpeeds[i];
      const phase = this.time + speed.phase;
      const blinkPhase = this.time * 2 + speed.blinkPhase;
      
      const x = this.particleInitialPositions[i3] + Math.sin(phase * 0.5) * 1.5;
      const y = this.particleInitialPositions[i3 + 1] + Math.sin(phase * 0.8) * 0.8;
      const z = this.particleInitialPositions[i3 + 2] + Math.cos(phase * 0.5) * 1.5;
      
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
      
      const blinkIntensity = (Math.sin(blinkPhase) + 1) * 0.5;
      const minBrightness = 0.4;
      const brightness = minBrightness + blinkIntensity * 0.6;
      
      colors[i3] = this.particleBaseColors[i3] * brightness;
      colors[i3 + 1] = this.particleBaseColors[i3 + 1] * brightness;
      colors[i3 + 2] = this.particleBaseColors[i3 + 2] * brightness;
    }
    
    this.magicalParticles.geometry.attributes.position.needsUpdate = true;
    this.magicalParticles.geometry.attributes.color.needsUpdate = true;
  }
  
  _addBlinkingEyes() {
    const basePos = { x: 10, y: 2, z: -45 };
    const centerEyeSpacing = 1.0;
    const sideEyeOffset = 1.3;
    const sideEyeHeight = 0.2;
    const sideEyeSize = 0.2;
    const centerEyeSize = 0.3;
    
    const eyeConfigs = [
      { x: basePos.x - sideEyeOffset, y: basePos.y + sideEyeHeight, z: basePos.z, size: sideEyeSize },
      { x: basePos.x - centerEyeSpacing * 0.5, y: basePos.y, z: basePos.z, size: centerEyeSize },
      { x: basePos.x + centerEyeSpacing * 0.5, y: basePos.y, z: basePos.z, size: centerEyeSize },
      { x: basePos.x + sideEyeOffset, y: basePos.y + sideEyeHeight, z: basePos.z, size: sideEyeSize },
    ];
    
    eyeConfigs.forEach((eyeConfig, index) => {
      const eyeGeo = new THREE.SphereGeometry(eyeConfig.size, 16, 16);
      const eyeMat = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.8,
        roughness: 0.1,
        metalness: 0.3,
        transparent: true,
        opacity: 0
      });
      const eyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
      eyeMesh.position.set(eyeConfig.x, eyeConfig.y, eyeConfig.z);
      eyeMesh.castShadow = false;
      eyeMesh.receiveShadow = false;
      this.scene.add(eyeMesh);
      
      this.blinkingEyes.push(eyeMesh);
    });
    
    this.eyeBlinkTimers.push({
      state: 'closed',
      timeInState: Math.random() * 8,
      nextStateTime: 5 + Math.random() * 10,
      blinkTime: 0.15,
      timeBetweenBlinks: 2 + Math.random() * 3,
      blinkCount: 0,
      maxBlinks: 3 + Math.floor(Math.random() * 3)
    });
  }
  
  updateBlinkingEyes(dt) {
    if (!this.blinkingEyes || this.blinkingEyes.length === 0) return;
    
    for (let i = 0; i < this.eyeBlinkTimers.length; i++) {
      const timer = this.eyeBlinkTimers[i];
      
      timer.timeInState += dt;
      
      if (timer.state === 'closed') {
        this.blinkingEyes.forEach(eye => {
          eye.scale.set(1, 1, 1);
          eye.material.opacity = 0;
          eye.material.emissiveIntensity = 0;
        });
        
        if (timer.timeInState >= timer.nextStateTime) {
          timer.state = 'opening';
          timer.timeInState = 0;
          timer.blinkCount = 0;
          timer.maxBlinks = 3 + Math.floor(Math.random() * 3);
        }
      } else if (timer.state === 'opening') {
        const openTime = 0.15;
        const openProgress = Math.min(timer.timeInState / openTime, 1);
        const openScale = openProgress < 0.5 
          ? openProgress * 2 
          : 1;
        const opacity = openProgress;
        
        this.blinkingEyes.forEach(eye => {
          eye.scale.set(1, 0.01 + openScale * 0.99, 1);
          eye.material.opacity = opacity;
          eye.material.emissiveIntensity = opacity * 0.8;
        });
        
        if (timer.timeInState >= openTime) {
          timer.state = 'open';
          timer.timeInState = 0;
          timer.timeBetweenBlinks = 2 + Math.random() * 3;
        }
      } else if (timer.state === 'open') {
        this.blinkingEyes.forEach(eye => {
          eye.scale.set(1, 1, 1);
          eye.material.opacity = 1;
          eye.material.emissiveIntensity = 0.8;
        });
        
        if (timer.timeInState >= timer.timeBetweenBlinks) {
          timer.state = 'blinking';
          timer.timeInState = 0;
          timer.blinkTime = 0.1 + Math.random() * 0.1;
        }
      } else if (timer.state === 'blinking') {
        const blinkProgress = Math.min(timer.timeInState / timer.blinkTime, 1);
        const blinkScale = blinkProgress < 0.5 
          ? 1 - blinkProgress * 2 
          : (blinkProgress - 0.5) * 2;
        
        this.blinkingEyes.forEach(eye => {
          eye.scale.set(1, 0.01 + blinkScale * 0.99, 1);
        });
        
        if (timer.timeInState >= timer.blinkTime) {
          timer.blinkCount++;
          
          if (timer.blinkCount >= timer.maxBlinks) {
            timer.state = 'closing';
            timer.timeInState = 0;
          } else {
            timer.state = 'open';
            timer.timeInState = 0;
            timer.timeBetweenBlinks = 1.5 + Math.random() * 2;
          }
        }
      } else if (timer.state === 'closing') {
        const closeTime = 0.15;
        const closeProgress = Math.min(timer.timeInState / closeTime, 1);
        const closeScale = closeProgress < 0.5 
          ? 1 - closeProgress * 2 
          : 0;
        const opacity = 1 - closeProgress;
        
        this.blinkingEyes.forEach(eye => {
          eye.scale.set(1, 0.01 + closeScale * 0.99, 1);
          eye.material.opacity = opacity;
          eye.material.emissiveIntensity = opacity * 0.8;
        });
        
        if (timer.timeInState >= closeTime) {
          timer.state = 'closed';
          timer.timeInState = 0;
          timer.nextStateTime = 3 + Math.random() * 7;
        }
      }
    }
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
    
    // Lerp camera to desired position first
    this.camera.position.lerp(desiredCamPos, 0.08);
    
    // Apply screen shake directly to camera position (after lerp, so it's not smoothed out)
    if (this.screenShakeManager) {
      const shakeOffset = this.screenShakeManager.getOffset();
      this.camera.position.add(shakeOffset);
    }
    
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

