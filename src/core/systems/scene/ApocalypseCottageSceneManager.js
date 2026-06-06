import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { BaseSceneManager } from './BaseSceneManager.js';

/**
 * ApocalypseCottageSceneManager
 *
 * Cute-apocalypse cottagecore sandbox: dusty coral sky, drifting ash motes,
 * mossy pastel ground, glowing mushrooms, fireflies, and a dim rim of
 * dead-tree silhouettes. Reuses BaseSceneManager primitives where useful
 * and overrides everything that needs to feel softer.
 */
export class ApocalypseCottageSceneManager extends BaseSceneManager {
  constructor() {
    super(32, new THREE.Vector3(0, 6, 8));
    this.fireflies = null;
    this.fireflySpeeds = [];
    this.fireflyInitialPositions = null;
    this.fireflyBaseColors = null;
    this.ashParticles = null;
    this.ashSpeeds = [];
    this.rimTrees = [];
    this._dayPhase = 0;
    // Day/dusk/night palette (RGB triplets for THREE.Color setRGB)
    this._dayPalette = {
      bg:   { day: [0.78, 0.54, 0.47], dusk: [0.55, 0.35, 0.42], night: [0.18, 0.16, 0.28] },
      fog:  { day: [0.84, 0.66, 0.6 ], dusk: [0.58, 0.4 , 0.45], night: [0.22, 0.2 , 0.3 ] },
      hemi: { day: [0.95, 0.78, 0.65], dusk: [0.7 , 0.45, 0.5 ], night: [0.4 , 0.45, 0.7 ] }
    };
  }

  init(canvas) {
    this._setupRenderer(canvas);
    this._setupScene();
    this._setupCamera();
    this._setupLighting();
    this._setupSky();
    this._setupGround();
    this._setupRimDeadTrees();
    this._setupMushrooms();
    this._setupFireflies();
    this._setupAsh();
    this._setupResizeHandler();
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    // Dusty rose / coral background
    this.scene.background = new THREE.Color(0xc88a78);
    // Soft warm fog so the rim fades into the haze
    this.scene.fog = new THREE.FogExp2(0xd7a89a, 0.028);
  }

  _setupLighting() {
    // Warm pastel ambient — coral sky, mossy bounce
    const hemi = new THREE.HemisphereLight(0xf2c6a4, 0x6a8a5a, 0.85);
    this.scene.add(hemi);
    this._hemi = hemi;

    // Dim warm sun, low in the sky
    const sun = new THREE.DirectionalLight(0xffd1a8, 1.4);
    sun.position.set(20, 18, -10);
    sun.target.position.set(0, 0, 0);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 120;
    sun.shadow.camera.left = -24;
    sun.shadow.camera.right = 24;
    sun.shadow.camera.top = 24;
    sun.shadow.camera.bottom = -24;
    sun.shadow.bias = -0.0001;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 4;
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sun = sun;

    // Pink moon companion (no shadow, just vibe)
    const moonFill = new THREE.DirectionalLight(0xf8c2d4, 0.35);
    moonFill.position.set(-18, 12, 12);
    this.scene.add(moonFill);

    // Warm centre glow — like a distant fire
    const hearth = new THREE.PointLight(0xffb079, 0.4, 18);
    hearth.position.set(0, 2.5, 0);
    this.scene.add(hearth);
  }

  _setupSky() {
    // Dim pinkish moon mesh sitting in the haze
    const moonGeo = new THREE.SphereGeometry(2.2, 32, 32);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xf6cbd6, fog: false });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(-22, 12, -34);
    this.scene.add(moon);

    const glowTex = this._createRadialGradientTexture(512, 0xf6cbd6, 1.0, 0);
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      fog: false
    });
    const glow = new THREE.Sprite(glowMat);
    glow.position.set(-22, 12, -35);
    glow.scale.set(12, 12, 1);
    this.scene.add(glow);

    this.moon = moon;
    this.moonGlow = glow;

    // Warm sun disc
    const sunGeo = new THREE.SphereGeometry(1.6, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffc78c, fog: false });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(20, 14, -28);
    this.scene.add(sunMesh);

    const sunGlowTex = this._createRadialGradientTexture(512, 0xffb066, 1.2, 0);
    const sunGlowMat = new THREE.SpriteMaterial({
      map: sunGlowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      fog: false
    });
    const sunGlow = new THREE.Sprite(sunGlowMat);
    sunGlow.position.set(20, 14, -29);
    sunGlow.scale.set(16, 16, 1);
    this.scene.add(sunGlow);
  }

  _setupGround() {
    // Placeholder fallback ground — replaced by HeightmapTerrain via
    // replaceGroundWithTerrain() once the terrain system is created.
    const groundGeo = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x7ba36a,
      roughness: 0.95,
      metalness: 0.0
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.ground = ground;
  }

  /**
   * Swap the placeholder ground plane for a sculptable heightmap mesh.
   * Called from ManagerInitializer once the HeightmapTerrain is built.
   */
  replaceGroundWithTerrain(terrainMesh) {
    if (this.ground) {
      this.scene.remove(this.ground);
      this.ground.geometry?.dispose();
      this.ground.material?.dispose();
      this.ground = null;
    }
    this.scene.add(terrainMesh);
    this.terrainMesh = terrainMesh;
  }

  _setupRimDeadTrees() {
    // Ring of dead-tree silhouettes just outside the play bounds
    const count = 28;
    const radius = this.arenaSize / 2 + 4;
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x3a2a36,
      roughness: 0.95
    });
    const branchMat = new THREE.MeshStandardMaterial({
      color: 0x4a3548,
      roughness: 0.95
    });

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
      const r = radius + (Math.random() - 0.5) * 2.5;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const height = 3.5 + Math.random() * 2.5;

      const trunkGeo = new THREE.CylinderGeometry(0.18, 0.32, height, 6);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(x, height / 2, z);
      trunk.rotation.z = (Math.random() - 0.5) * 0.12;
      trunk.castShadow = true;
      this.scene.add(trunk);

      // A couple of crooked branches
      const branchCount = 2 + Math.floor(Math.random() * 2);
      for (let b = 0; b < branchCount; b++) {
        const bGeo = new THREE.CylinderGeometry(0.05, 0.1, 1.2 + Math.random() * 0.6, 4);
        const branch = new THREE.Mesh(bGeo, branchMat);
        branch.position.set(
          x + (Math.random() - 0.5) * 0.3,
          height * (0.55 + Math.random() * 0.35),
          z + (Math.random() - 0.5) * 0.3
        );
        branch.rotation.z = (Math.random() - 0.5) * 1.4;
        branch.rotation.x = (Math.random() - 0.5) * 0.8;
        branch.castShadow = true;
        this.scene.add(branch);
        this.rimTrees.push(branch);
      }
      this.rimTrees.push(trunk);
    }
  }

  _setupMushrooms() {
    // Pastel cottagecore mushrooms — coral cap with cream spots
    const positions = [
      { x: -5.5, z: -3.2, size: 0.45 },
      { x: 4.6, z: -5.0, size: 0.55 },
      { x: -3.8, z: 4.2, size: 0.4 },
      { x: 6.2, z: 3.8, size: 0.5 },
      { x: 1.5, z: 6.7, size: 0.42 },
      { x: -6.4, z: 1.8, size: 0.48 }
    ];

    const stemMat = new THREE.MeshStandardMaterial({ color: 0xf2e3c8, roughness: 0.85 });
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xe07a82,
      emissive: 0x5a2a32,
      emissiveIntensity: 0.25,
      roughness: 0.7
    });
    const spotMat = new THREE.MeshStandardMaterial({ color: 0xfaf2e0, roughness: 0.8 });

    positions.forEach(pos => {
      const stemGeo = new THREE.CylinderGeometry(0.09, 0.12, 0.45, 8);
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(pos.x, 0.22, pos.z);
      stem.castShadow = true;
      stem.receiveShadow = true;
      this.scene.add(stem);

      const capGeo = new THREE.SphereGeometry(pos.size * 0.7, 12, 10);
      capGeo.scale(1, 0.55, 1);
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(pos.x, 0.5, pos.z);
      cap.castShadow = true;
      cap.receiveShadow = true;
      this.scene.add(cap);

      // Cream spots
      for (let s = 0; s < 3; s++) {
        const spotGeo = new THREE.SphereGeometry(pos.size * 0.1, 6, 6);
        const spot = new THREE.Mesh(spotGeo, spotMat);
        const ang = (s / 3) * Math.PI * 2;
        spot.position.set(
          pos.x + Math.cos(ang) * pos.size * 0.35,
          0.56,
          pos.z + Math.sin(ang) * pos.size * 0.35
        );
        this.scene.add(spot);
      }

      const glow = new THREE.PointLight(0xff9ab0, 0.5, 3.5);
      glow.position.set(pos.x, 0.6, pos.z);
      this.scene.add(glow);

      this.mushrooms.push({ stem, cap, glowLight: glow, softGlow: glow });
    });
  }

  _setupFireflies() {
    const count = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    this.fireflyInitialPositions = new Float32Array(count * 3);
    this.fireflyBaseColors = new Float32Array(count * 3);
    this.fireflySpeeds = [];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const x = (Math.random() - 0.5) * this.arenaSize;
      const y = 0.6 + Math.random() * 3.2;
      const z = (Math.random() - 0.5) * this.arenaSize;
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
      this.fireflyInitialPositions[i3] = x;
      this.fireflyInitialPositions[i3 + 1] = y;
      this.fireflyInitialPositions[i3 + 2] = z;
      this.fireflySpeeds.push({
        phase: Math.random() * Math.PI * 2,
        blinkPhase: Math.random() * Math.PI * 2
      });
      // Warm cream + soft pink mix
      const pinkish = Math.random() > 0.55;
      const r = pinkish ? 1.0 : 1.0;
      const g = pinkish ? 0.78 : 0.95;
      const b = pinkish ? 0.86 : 0.7;
      this.fireflyBaseColors[i3] = r;
      this.fireflyBaseColors[i3 + 1] = g;
      this.fireflyBaseColors[i3 + 2] = b;
      colors[i3] = r;
      colors[i3 + 1] = g;
      colors[i3 + 2] = b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const tex = this._makeSoftCircleTexture();
    const mat = new THREE.PointsMaterial({
      size: 0.13,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      map: tex,
      sizeAttenuation: true
    });

    this.fireflies = new THREE.Points(geometry, mat);
    this.scene.add(this.fireflies);
  }

  _setupAsh() {
    // Slow-drifting white motes falling gently
    const count = 110;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    this.ashSpeeds = [];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * this.arenaSize * 1.3;
      positions[i3 + 1] = Math.random() * 14 + 1;
      positions[i3 + 2] = (Math.random() - 0.5) * this.arenaSize * 1.3;
      this.ashSpeeds.push({
        fall: 0.12 + Math.random() * 0.18,
        sway: 0.4 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const tex = this._makeSoftCircleTexture();
    const mat = new THREE.PointsMaterial({
      size: 0.18,
      color: 0xfff2e0,
      transparent: true,
      opacity: 0.55,
      blending: THREE.NormalBlending,
      map: tex,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.ashParticles = new THREE.Points(geometry, mat);
    this.scene.add(this.ashParticles);
  }

  _makeSoftCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.7)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
  }

  updateParticles(dt) {
    this.time += dt;
    this._updateFireflies(dt);
    this._updateAsh(dt);
    this._updateDayNight(dt);
  }

  _updateDayNight(dt) {
    // 6-minute full cycle: 4 min day, 1 min dusk, 1 min night
    const period = 360;
    this._dayPhase = (this._dayPhase + dt) % period;
    const p = this._dayPhase / period;
    // 0 → 0.66 day, 0.66 → 0.83 dusk, 0.83 → 1 night
    let bg, fog, hemi;
    if (p < 0.66) {
      bg = this._dayPalette.bg.day;
      fog = this._dayPalette.fog.day;
      hemi = this._dayPalette.hemi.day;
    } else if (p < 0.83) {
      const t = (p - 0.66) / 0.17;
      bg = this._lerpRgb(this._dayPalette.bg.day, this._dayPalette.bg.dusk, t);
      fog = this._lerpRgb(this._dayPalette.fog.day, this._dayPalette.fog.dusk, t);
      hemi = this._lerpRgb(this._dayPalette.hemi.day, this._dayPalette.hemi.dusk, t);
    } else {
      const t = (p - 0.83) / 0.17;
      bg = this._lerpRgb(this._dayPalette.bg.dusk, this._dayPalette.bg.night, t);
      fog = this._lerpRgb(this._dayPalette.fog.dusk, this._dayPalette.fog.night, t);
      hemi = this._lerpRgb(this._dayPalette.hemi.dusk, this._dayPalette.hemi.night, t);
    }
    if (this.scene?.background) this.scene.background.setRGB(bg[0], bg[1], bg[2]);
    if (this.scene?.fog) this.scene.fog.color.setRGB(fog[0], fog[1], fog[2]);
    if (this._hemi) this._hemi.color.setRGB(hemi[0], hemi[1], hemi[2]);
  }

  _lerpRgb(a, b, t) {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t
    ];
  }

  _updateFireflies(dt) {
    if (!this.fireflies) return;
    const positions = this.fireflies.geometry.attributes.position.array;
    const colors = this.fireflies.geometry.attributes.color.array;
    for (let i = 0; i < this.fireflySpeeds.length; i++) {
      const i3 = i * 3;
      const s = this.fireflySpeeds[i];
      const phase = this.time + s.phase;
      const blink = this.time * 1.8 + s.blinkPhase;
      positions[i3] = this.fireflyInitialPositions[i3] + Math.sin(phase * 0.5) * 1.6;
      positions[i3 + 1] = this.fireflyInitialPositions[i3 + 1] + Math.sin(phase * 0.9) * 0.6;
      positions[i3 + 2] = this.fireflyInitialPositions[i3 + 2] + Math.cos(phase * 0.5) * 1.6;
      const brightness = 0.45 + ((Math.sin(blink) + 1) * 0.5) * 0.55;
      colors[i3] = this.fireflyBaseColors[i3] * brightness;
      colors[i3 + 1] = this.fireflyBaseColors[i3 + 1] * brightness;
      colors[i3 + 2] = this.fireflyBaseColors[i3 + 2] * brightness;
    }
    this.fireflies.geometry.attributes.position.needsUpdate = true;
    this.fireflies.geometry.attributes.color.needsUpdate = true;
  }

  _updateAsh(dt) {
    if (!this.ashParticles) return;
    const positions = this.ashParticles.geometry.attributes.position.array;
    const halfArena = this.arenaSize * 0.65;
    for (let i = 0; i < this.ashSpeeds.length; i++) {
      const i3 = i * 3;
      const s = this.ashSpeeds[i];
      positions[i3] += Math.sin(this.time * s.sway + s.phase) * dt * 0.3;
      positions[i3 + 1] -= s.fall * dt;
      positions[i3 + 2] += Math.cos(this.time * s.sway + s.phase) * dt * 0.3;
      if (positions[i3 + 1] < 0.2) {
        positions[i3] = (Math.random() - 0.5) * halfArena * 2;
        positions[i3 + 1] = 13 + Math.random() * 2;
        positions[i3 + 2] = (Math.random() - 0.5) * halfArena * 2;
      }
    }
    this.ashParticles.geometry.attributes.position.needsUpdate = true;
  }

  updateBlinkingEyes(_dt) {
    // No spooky eyes in the cottagecore scene — left as a no-op so the
    // existing game loop can call it uniformly.
  }
}
