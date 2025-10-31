import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

export class SceneManager {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.arenaSize = 20;
    this.cameraOffset = new THREE.Vector3(0, 6, 8);
    this.magicalParticles = null;
    this.particleSpeeds = [];
    this.time = 0;
  }

  init(canvas) {
    this._setupRenderer(canvas);
    this._setupScene();
    this._setupCamera();
    this._setupLighting();
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
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    // Magical forest sky - dark with mystical purple-green tones
    this.scene.background = new THREE.Color(0x0a1a1f);
    
    // Add fog for mystical atmosphere
    this.scene.fog = new THREE.FogExp2(0x0a1a1f, 0.02);
  }

  _setupCamera() {
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.scene.add(this.camera);
  }

  _setupLighting() {
    // Magical forest ambient light - purple-green mystical glow
    const hemi = new THREE.HemisphereLight(0x4a8a5f, 0x1a1428, 0.9);
    this.scene.add(hemi);
    
    // Main directional light with warm mystical tone
    const dir = new THREE.DirectionalLight(0x7ab8a0, 0.7);
    dir.position.set(5, 10, 5);
    dir.castShadow = true;
    this.scene.add(dir);
    
    // Add magical point lights for mystical atmosphere
    const magicLight1 = new THREE.PointLight(0x8a4fa8, 0.6, 15);
    magicLight1.position.set(-8, 3, -8);
    this.scene.add(magicLight1);
    
    const magicLight2 = new THREE.PointLight(0x4fa88a, 0.6, 15);
    magicLight2.position.set(8, 3, 8);
    this.scene.add(magicLight2);
    
    // Subtle glowing magical light in center
    const centerLight = new THREE.PointLight(0x6ab89a, 0.4, 12);
    centerLight.position.set(0, 2, 0);
    this.scene.add(centerLight);
  }

  _setupGround() {
    const groundGeo = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x2a4a3a, // Forest floor green-brown
      roughness: 0.85, // Slightly less rough for better light reflection
      metalness: 0.1 // Slight metalness to help reflect colored lights
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    
    // Add subtle magical glow to ground
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
    // Subtle mystical grid with forest colors
    const grid = new THREE.GridHelper(this.arenaSize, this.arenaSize, 0x4a8a6a, 0x2a4a3a);
    grid.position.y = 0.02;
    
    // GridHelper uses array of materials
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
    // Add magical trees around the arena
    this._addMagicalTrees();
    
    // Add glowing mushrooms
    this._addGlowingMushrooms();
    
    // Add floating magical particles
    this._addMagicalParticles();
  }
  
  _addMagicalTrees() {
    // Create a few mystical trees around the arena perimeter
    const treePositions = [
      { x: -9, z: -9 },
      { x: 9, z: -9 },
      { x: -9, z: 9 },
      { x: 9, z: 9 },
      { x: 0, z: -10 },
      { x: -10, z: 0 },
      { x: 10, z: 0 }
    ];
    
    treePositions.forEach(pos => {
      // Tree trunk
      const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 3, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ 
        color: 0x3a2a1a,
        roughness: 0.9 
      });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(pos.x, 1.5, pos.z);
      trunk.castShadow = true;
      this.scene.add(trunk);
      
      // Magical glowing leaves
      const leavesGeo = new THREE.ConeGeometry(1.5, 2.5, 8);
      const leavesMat = new THREE.MeshStandardMaterial({ 
        color: 0x4a8a6a,
        emissive: 0x2a5a4a,
        emissiveIntensity: 0.3,
        roughness: 0.8 
      });
      const leaves = new THREE.Mesh(leavesGeo, leavesMat);
      leaves.position.set(pos.x, 3.5, pos.z);
      this.scene.add(leaves);
    });
  }
  
  _addGlowingMushrooms() {
    // Add mystical glowing mushrooms scattered around
    const mushroomPositions = [
      { x: -6, z: -6, size: 0.4 },
      { x: 6, z: 6, size: 0.5 },
      { x: -7, z: 3, size: 0.35 },
      { x: 7, z: -3, size: 0.4 },
      { x: 3, z: 7, size: 0.45 }
    ];
    
    mushroomPositions.forEach(pos => {
      // Mushroom stem
      const stemGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.3, 6);
      const stemMat = new THREE.MeshStandardMaterial({ 
        color: 0x4a6a5a,
        roughness: 0.9 
      });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(pos.x, 0.15, pos.z);
      this.scene.add(stem);
      
      // Glowing cap
      const capGeo = new THREE.SphereGeometry(pos.size * 0.6, 8, 8);
      capGeo.scale(1, 0.4, 1);
      const capMat = new THREE.MeshStandardMaterial({ 
        color: 0x8a4fa8,
        emissive: 0x5a2f68,
        emissiveIntensity: 0.8,
        roughness: 0.6 
      });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(pos.x, 0.4, pos.z);
      this.scene.add(cap);
      
      // Add point light for glow effect
      const glowLight = new THREE.PointLight(0x8a4fa8, 0.3, 2);
      glowLight.position.set(pos.x, 0.5, pos.z);
      this.scene.add(glowLight);
    });
  }
  
  _addMagicalParticles() {
    // Create floating magical particles (smaller and less visible)
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Store initial positions and speeds for animation
    this.particleInitialPositions = new Float32Array(particleCount * 3);
    this.particleSpeeds = [];
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // Random positions within arena bounds
      const x = (Math.random() - 0.5) * this.arenaSize;
      const y = Math.random() * 3 + 0.5; // Height
      const z = (Math.random() - 0.5) * this.arenaSize;
      
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
      
      // Store initial positions
      this.particleInitialPositions[i3] = x;
      this.particleInitialPositions[i3 + 1] = y;
      this.particleInitialPositions[i3 + 2] = z;
      
      // Random movement speeds for floating effect
      this.particleSpeeds.push({
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.03,
        z: (Math.random() - 0.5) * 0.02,
        phase: Math.random() * Math.PI * 2 // Phase offset for smooth animation
      });
      
      // Magical colors (purple and green) - more subdued
      const colorChoice = Math.random() > 0.5;
      colors[i3] = colorChoice ? 0.3 : 0.2; // R (more subdued)
      colors[i3 + 1] = colorChoice ? 0.4 : 0.5; // G (more subdued)
      colors[i3 + 2] = colorChoice ? 0.5 : 0.3; // B (more subdued)
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.08, // Smaller size (was 0.15)
      vertexColors: true,
      transparent: true,
      opacity: 0.25, // Less visible (was 0.7)
      blending: THREE.AdditiveBlending
    });
    
    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
    this.magicalParticles = particles;
  }
  
  updateParticles(dt) {
    if (!this.magicalParticles || !this.particleSpeeds) return;
    
    this.time += dt;
    const positions = this.magicalParticles.geometry.attributes.position.array;
    
    for (let i = 0; i < this.particleSpeeds.length; i++) {
      const i3 = i * 3;
      const speed = this.particleSpeeds[i];
      const phase = this.time + speed.phase;
      
      // Floating animation with sine waves
      positions[i3] = this.particleInitialPositions[i3] + Math.sin(phase * 0.5) * 1.5;
      positions[i3 + 1] = this.particleInitialPositions[i3 + 1] + Math.sin(phase * 0.8) * 0.8;
      positions[i3 + 2] = this.particleInitialPositions[i3 + 2] + Math.cos(phase * 0.5) * 1.5;
    }
    
    this.magicalParticles.geometry.attributes.position.needsUpdate = true;
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

  updateCamera(playerPosition) {
    const desiredCamPos = playerPosition.clone().add(this.cameraOffset);
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
}
