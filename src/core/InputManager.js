import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

export class InputManager {
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
    
    this.moveSpeed = 4; // units per second
    this.runSpeedMultiplier = 1.7; // speed multiplier when running
    
    this._setupEventListeners();
  }

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

  setKeyState(e, pressed) {
    // Arrow keys by value
    switch (e.key) {
      case 'ArrowUp': this.inputState.up = pressed; break;
      case 'ArrowDown': this.inputState.down = pressed; break;
      case 'ArrowLeft': this.inputState.left = pressed; break;
      case 'ArrowRight': this.inputState.right = pressed; break;
    }
    
    // Layout-agnostic WASD using physical key codes (works for ZQSD on AZERTY)
    switch (e.code) {
      case 'KeyW': this.inputState.up = pressed; break;
      case 'KeyS': this.inputState.down = pressed; break;
      case 'KeyA': this.inputState.left = pressed; break;
      case 'KeyD': this.inputState.right = pressed; break;
    }
    
    // Fallback for browsers emitting localized letters via e.key
    switch (e.key) {
      case 'w': case 'W': case 'z': case 'Z': this.inputState.up = pressed; break; // Z on AZERTY
      case 's': case 'S': this.inputState.down = pressed; break;
      case 'a': case 'A': case 'q': case 'Q': this.inputState.left = pressed; break; // Q on AZERTY
      case 'd': case 'D': this.inputState.right = pressed; break;
    }
    
    // Shift key for running
    switch (e.key) {
      case 'Shift': this.inputState.shift = pressed; break;
    }
    
    // Space key for jumping
    switch (e.key) {
      case ' ': this.inputState.jump = pressed; break;
    }
  }

  getInputVector() {
    const input = new THREE.Vector2(
      (this.inputState.right ? 1 : 0) - (this.inputState.left ? 1 : 0),
      (this.inputState.up ? 1 : 0) - (this.inputState.down ? 1 : 0)
    );
    
    if (input.lengthSq() > 1) input.normalize();
    
    return input;
  }

  getCurrentSpeed() {
    return this.inputState.shift ? this.moveSpeed * this.runSpeedMultiplier : this.moveSpeed;
  }

  isRunning() {
    return this.inputState.shift;
  }

  hasMovement() {
    const input = this.getInputVector();
    return input.x !== 0 || input.y !== 0;
  }

  isJumpPressed() {
    return this.inputState.jump;
  }

  isShootPressed() {
    return this.inputState.shoot;
  }

  getMousePosition() {
    return this.mousePosition;
  }

  isMortarPressed() {
    return this.inputState.mortar;
  }
}
