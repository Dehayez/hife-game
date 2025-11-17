/**
 * SplitscreenManager.js
 * 
 * Manages splitscreen rendering with multiple cameras and viewports.
 * Supports horizontal and vertical splitscreen layouts.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

export class SplitscreenManager {
  /**
   * Create a new SplitscreenManager
   * @param {THREE.WebGLRenderer} renderer - Three.js renderer
   * @param {THREE.Scene} scene - Three.js scene
   */
  constructor(renderer, scene) {
    this.renderer = renderer;
    this.scene = scene;
    this.isEnabled = false;
    this.layout = 'horizontal'; // 'horizontal' or 'vertical'
    this.cameras = [];
    this.viewports = [];
    this.playerCount = 0;
  }

  /**
   * Enable splitscreen mode
   * @param {number} playerCount - Number of players (1-4)
   * @param {string} layout - 'horizontal' or 'vertical'
   */
  enable(playerCount = 2, layout = 'horizontal') {
    if (playerCount < 1 || playerCount > 4) {
      console.warn(`Invalid player count: ${playerCount}. Must be between 1 and 4.`);
      return;
    }

    this.isEnabled = true;
    this.playerCount = playerCount;
    this.layout = layout;
    this._setupViewports();
  }

  /**
   * Disable splitscreen mode
   */
  disable() {
    this.isEnabled = false;
    this.cameras = [];
    this.viewports = [];
    this.playerCount = 0;
    
    // Reset renderer viewport to full screen
    this.renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  }

  /**
   * Add a camera for a player
   * @param {THREE.PerspectiveCamera} camera - Camera instance
   * @param {number} playerIndex - Player index (0-based)
   */
  addCamera(camera, playerIndex) {
    if (playerIndex < 0 || playerIndex >= this.playerCount) {
      console.warn(`Invalid player index: ${playerIndex}`);
      return;
    }

    this.cameras[playerIndex] = camera;
    this._updateCameraAspect(playerIndex);
  }

  /**
   * Remove a camera
   * @param {number} playerIndex - Player index (0-based)
   */
  removeCamera(playerIndex) {
    if (this.cameras[playerIndex]) {
      this.cameras[playerIndex] = null;
    }
  }

  /**
   * Get camera for a player
   * @param {number} playerIndex - Player index (0-based)
   * @returns {THREE.PerspectiveCamera|null}
   */
  getCamera(playerIndex) {
    return this.cameras[playerIndex] || null;
  }

  /**
   * Render all viewports
   */
  render() {
    if (!this.isEnabled || this.playerCount === 0) {
      return;
    }

    // Render each viewport
    for (let i = 0; i < this.playerCount; i++) {
      const camera = this.cameras[i];
      const viewport = this.viewports[i];
      
      if (camera && viewport) {
        this.renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);
        this.renderer.setScissor(viewport.x, viewport.y, viewport.width, viewport.height);
        this.renderer.setScissorTest(true);
        this.renderer.render(this.scene, camera);
      }
    }

    // Reset scissor test
    this.renderer.setScissorTest(false);
  }

  /**
   * Update camera aspect ratios when window resizes
   */
  handleResize() {
    if (!this.isEnabled) {
      return;
    }

    this._setupViewports();
    
    // Update all camera aspect ratios
    for (let i = 0; i < this.cameras.length; i++) {
      if (this.cameras[i]) {
        this._updateCameraAspect(i);
      }
    }
  }

  /**
   * Setup viewports based on player count and layout
   * @private
   */
  _setupViewports() {
    this.viewports = [];
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (this.playerCount === 1) {
      // Single player - full screen
      this.viewports.push({
        x: 0,
        y: 0,
        width: width,
        height: height
      });
    } else if (this.playerCount === 2) {
      if (this.layout === 'horizontal') {
        // Horizontal split: top and bottom
        const halfHeight = height / 2;
        this.viewports.push({
          x: 0,
          y: halfHeight,
          width: width,
          height: halfHeight
        });
        this.viewports.push({
          x: 0,
          y: 0,
          width: width,
          height: halfHeight
        });
      } else {
        // Vertical split: left and right
        const halfWidth = width / 2;
        this.viewports.push({
          x: 0,
          y: 0,
          width: halfWidth,
          height: height
        });
        this.viewports.push({
          x: halfWidth,
          y: 0,
          width: halfWidth,
          height: height
        });
      }
    } else if (this.playerCount === 3) {
      if (this.layout === 'horizontal') {
        // Top player gets full width, bottom two split
        const topHeight = height / 2;
        const bottomHeight = height / 2;
        const bottomWidth = width / 2;
        
        this.viewports.push({
          x: 0,
          y: topHeight,
          width: width,
          height: topHeight
        });
        this.viewports.push({
          x: 0,
          y: 0,
          width: bottomWidth,
          height: bottomHeight
        });
        this.viewports.push({
          x: bottomWidth,
          y: 0,
          width: bottomWidth,
          height: bottomHeight
        });
      } else {
        // Left player gets full height, right two split
        const leftWidth = width / 2;
        const rightWidth = width / 2;
        const rightHeight = height / 2;
        
        this.viewports.push({
          x: 0,
          y: 0,
          width: leftWidth,
          height: height
        });
        this.viewports.push({
          x: leftWidth,
          y: rightHeight,
          width: rightWidth,
          height: rightHeight
        });
        this.viewports.push({
          x: leftWidth,
          y: 0,
          width: rightWidth,
          height: rightHeight
        });
      }
    } else if (this.playerCount === 4) {
      // 2x2 grid
      const halfWidth = width / 2;
      const halfHeight = height / 2;
      
      this.viewports.push({
        x: 0,
        y: halfHeight,
        width: halfWidth,
        height: halfHeight
      });
      this.viewports.push({
        x: halfWidth,
        y: halfHeight,
        width: halfWidth,
        height: halfHeight
      });
      this.viewports.push({
        x: 0,
        y: 0,
        width: halfWidth,
        height: halfHeight
      });
      this.viewports.push({
        x: halfWidth,
        y: 0,
        width: halfWidth,
        height: halfHeight
      });
    }
  }

  /**
   * Update camera aspect ratio for a specific player
   * @private
   * @param {number} playerIndex - Player index (0-based)
   */
  _updateCameraAspect(playerIndex) {
    const camera = this.cameras[playerIndex];
    const viewport = this.viewports[playerIndex];
    
    if (camera && viewport) {
      camera.aspect = viewport.width / viewport.height;
      camera.updateProjectionMatrix();
    }
  }

  /**
   * Get viewport for a player
   * @param {number} playerIndex - Player index (0-based)
   * @returns {Object|null} Viewport object with x, y, width, height
   */
  getViewport(playerIndex) {
    return this.viewports[playerIndex] || null;
  }

  /**
   * Check if splitscreen is enabled
   * @returns {boolean}
   */
  isSplitscreenEnabled() {
    return this.isEnabled;
  }

  /**
   * Get current player count
   * @returns {number}
   */
  getPlayerCount() {
    return this.playerCount;
  }

  /**
   * Get current layout
   * @returns {string}
   */
  getLayout() {
    return this.layout;
  }
}












