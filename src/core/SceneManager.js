import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

export class SceneManager {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.arenaSize = 20;
    this.cameraOffset = new THREE.Vector3(0, 6, 8);
  }

  init(canvas) {
    this._setupRenderer(canvas);
    this._setupScene();
    this._setupCamera();
    this._setupLighting();
    this._setupGround();
    this._setupGrid();
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
    this.scene.background = new THREE.Color(0x10141c);
  }

  _setupCamera() {
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.scene.add(this.camera);
  }

  _setupLighting() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x202030, 0.8);
    this.scene.add(hemi);
    
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5, 10, 5);
    this.scene.add(dir);
  }

  _setupGround() {
    const groundGeo = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x2c3240, 
      roughness: 0.9, 
      metalness: 0.0 
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  _setupGrid() {
    const grid = new THREE.GridHelper(this.arenaSize, this.arenaSize, 0x3c8ce7, 0x2a3a56);
    grid.position.y = 0.01;
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
