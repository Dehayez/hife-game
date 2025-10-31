/**
 * InputManager.js
 * 
 * Main manager for all input-related functionality.
 * Handles keyboard and mouse input, movement state, and shooting controls.
 * 
 * This file acts as a facade, delegating to specialized modules:
 * - InputStats.js: Input stats and key bindings configuration
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getMovementStats, getKeyBindings } from './InputStats.js';

export class InputManager {
  /**
   * Create a new InputManager
   */
  constructor() {
    this.inputState = { 
      up: false, 
      down: false, 
      left: false, 
      right: false, 
      shift: false,
      jump: false,
      shoot: false,
      mortar: false
    };
    
    this.mousePosition = { x: 0, y: 0 };
    this.shootPressed = false;
    this.mortarPressed = false;
    
    const stats = getMovementStats();
    this.moveSpeed = stats.moveSpeed;
    this.runSpeedMultiplier = stats.runSpeedMultiplier;
    
    this._setupEventListeners();
  }

  /**
   * Setup event listeners for keyboard and mouse
   * @private
   */
  _setupEventListeners() {
    window.addEventListener('keydown', (e) => { 
      this.setKeyState(e, true);
      // Prevent default browser behavior for game keys
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
          e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => { 
      this.setKeyState(e, false);
      // Prevent default browser behavior for game keys
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
          e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
      }
    });
    
    // Mouse click for shooting
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left mouse button
        this.shootPressed = true;
        this.inputState.shoot = true;
      } else if (e.button === 2) { // Right mouse button
        this.mortarPressed = true;
        this.inputState.mortar = true;
      }
    });
    
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.shootPressed = false;
        this.inputState.shoot = false;
      } else if (e.button === 2) {
        this.mortarPressed = false;
        this.inputState.mortar = false;
      }
    });
    
    // Prevent context menu on right click
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
    
    // Track mouse position
    window.addEventListener('mousemove', (e) => {
      this.mousePosition.x = e.clientX;
      this.mousePosition.y = e.clientY;
    });
  }

  /**
   * Set key state based on event
   * @param {KeyboardEvent} e - Keyboard event
   * @param {boolean} pressed - Whether key is pressed
   */
  setKeyState(e, pressed) {
    const keys = getKeyBindings();
    
    // Arrow keys by value
    if (keys.up.includes(e.key)) {
      this.inputState.up = pressed;
    }
    if (keys.down.includes(e.key)) {
      this.inputState.down = pressed;
    }
    if (keys.left.includes(e.key)) {
      this.inputState.left = pressed;
    }
    if (keys.right.includes(e.key)) {
      this.inputState.right = pressed;
    }
    
    // Layout-agnostic WASD using physical key codes (works for ZQSD on AZERTY)
    if (keys.up.includes(e.code)) {
      this.inputState.up = pressed;
    }
    if (keys.down.includes(e.code)) {
      this.inputState.down = pressed;
    }
    if (keys.left.includes(e.code)) {
      this.inputState.left = pressed;
    }
    if (keys.right.includes(e.code)) {
      this.inputState.right = pressed;
    }
    
    // Shift key for running
    if (keys.run.includes(e.key)) {
      this.inputState.shift = pressed;
    }
    
    // Space key for jumping
    if (keys.jump.includes(e.key)) {
      this.inputState.jump = pressed;
    }
  }

  /**
   * Get input vector from current state
   * @returns {THREE.Vector2} Normalized input vector
   */
  getInputVector() {
    const input = new THREE.Vector2(
      (this.inputState.right ? 1 : 0) - (this.inputState.left ? 1 : 0),
      (this.inputState.up ? 1 : 0) - (this.inputState.down ? 1 : 0)
    );
    
    if (input.lengthSq() > 1) input.normalize();
    
    return input;
  }

  /**
   * Get current movement speed
   * @returns {number} Current speed (base speed or running speed)
   */
  getCurrentSpeed() {
    return this.inputState.shift ? this.moveSpeed * this.runSpeedMultiplier : this.moveSpeed;
  }

  /**
   * Check if player is running
   * @returns {boolean} True if running (shift held)
   */
  isRunning() {
    return this.inputState.shift;
  }

  /**
   * Check if player has movement input
   * @returns {boolean} True if any movement key is pressed
   */
  hasMovement() {
    const input = this.getInputVector();
    return input.x !== 0 || input.y !== 0;
  }

  /**
   * Check if jump key is pressed
   * @returns {boolean} True if jump key is pressed
   */
  isJumpPressed() {
    return this.inputState.jump;
  }

  /**
   * Check if shoot button is pressed
   * @returns {boolean} True if shoot button is pressed
   */
  isShootPressed() {
    return this.inputState.shoot;
  }

  /**
   * Get mouse position
   * @returns {Object} Mouse position with x and y
   */
  getMousePosition() {
    return this.mousePosition;
  }

  /**
   * Check if mortar button is pressed
   * @returns {boolean} True if mortar button is pressed
   */
  isMortarPressed() {
    return this.inputState.mortar;
  }
}

