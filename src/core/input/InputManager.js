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
    
    // Gamepad state
    this.gamepad = null;
    this.gamepadConnected = false;
    this.gamepadDeadZone = 0.2; // Dead zone for analog sticks
    this._gamepadJumpState = false;
    this._gamepadShiftState = false;
    this._gamepadMovementActive = false; // Track if gamepad is controlling movement
    this._loggingEnabled = true; // Enable detailed input logging
    this._lastInputLog = null; // Track last input to avoid spam
    this._inputLogThrottle = 200; // Throttle input logs (ms)
    
    // Left joystick direction for projectile control (separate from movement)
    this.projectileDirection = { x: 0, z: 0 };
    this._projectileDirectionActive = false;
    
    // Left joystick analog movement (for smooth 360-degree movement)
    this.gamepadMovementVector = { x: 0, y: 0 };
    
    const stats = getMovementStats();
    this.moveSpeed = stats.moveSpeed;
    this.runSpeedMultiplier = stats.runSpeedMultiplier;
    
    this._setupEventListeners();
    this._setupGamepadListeners();
  }

  /**
   * Check if click target is a UI element
   * @param {Event} e - Mouse event
   * @returns {boolean} True if click is on a UI element
   * @private
   */
  _isUIElement(e) {
    let target = e.target;
    // Check if target or any parent has a class starting with "ui__"
    while (target && target !== document.body) {
      if (target.classList) {
        for (const className of target.classList) {
          if (className.startsWith('ui__') || className === 'ui') {
            return true;
          }
        }
      }
      target = target.parentElement;
    }
    return false;
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
      // Don't shoot if clicking on UI elements
      if (this._isUIElement(e)) {
        return;
      }
      
      if (e.button === 0) { // Left mouse button
        this.shootPressed = true;
        this.inputState.shoot = true;
      } else if (e.button === 2) { // Right mouse button
        this.mortarPressed = true;
        this.inputState.mortar = true;
      }
    });
    
    window.addEventListener('mouseup', (e) => {
      // Don't process shooting if clicking on UI elements
      if (this._isUIElement(e)) {
        return;
      }
      
      if (e.button === 0) {
        this.shootPressed = false;
        this.inputState.shoot = false;
      } else if (e.button === 2) {
        this.mortarPressed = false;
        this.inputState.mortar = false;
      }
    });
    
    // Prevent context menu on right click (unless on UI)
    window.addEventListener('contextmenu', (e) => {
      if (!this._isUIElement(e)) {
        e.preventDefault();
      }
    });
    
    // Track mouse position
    window.addEventListener('mousemove', (e) => {
      this.mousePosition.x = e.clientX;
      this.mousePosition.y = e.clientY;
    });
  }

  /**
   * Detect if gamepad is an Xbox controller
   * @param {Object} gamepad - Gamepad object
   * @returns {boolean} True if Xbox controller
   * @private
   */
  _isXboxController(gamepad) {
    if (!gamepad) return false;
    const id = gamepad.id.toLowerCase();
    return id.includes('xbox') || 
           id.includes('microsoft') ||
           id.includes('045e'); // Microsoft vendor ID
  }

  /**
   * Show visual notification for gamepad connection
   * @param {Object} gamepad - Gamepad object
   * @param {boolean} connected - True if connected, false if disconnected
   * @private
   */
  _showGamepadNotification(gamepad, connected) {
    const isXbox = this._isXboxController(gamepad);
    const controllerName = isXbox ? 'Xbox Controller' : gamepad.id || 'Gamepad';
    const message = connected 
      ? `🎮 ${controllerName} connected!`
      : `🎮 ${controllerName} disconnected`;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${connected ? 'rgba(106, 184, 154, 0.9)' : 'rgba(255, 140, 66, 0.9)'};
      color: #0b0e13;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease-out;
      pointer-events: none;
    `;
    notification.textContent = message;
    
    // Add animation keyframes if not already added
    if (!document.getElementById('gamepad-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'gamepad-notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  /**
   * Setup gamepad event listeners
   * @private
   */
  _setupGamepadListeners() {
    window.addEventListener('gamepadconnected', (e) => {
      const gamepad = e.gamepad;
      const isXbox = this._isXboxController(gamepad);
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎮 GAMEPAD CONNECTED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Type:', isXbox ? '✅ Xbox Controller' : 'Generic Controller');
      console.log('ID:', gamepad.id);
      console.log('Index:', gamepad.index);
      console.log('Buttons:', gamepad.buttons.length);
      console.log('Axes:', gamepad.axes.length);
      console.log('Mapping:', gamepad.mapping || 'standard');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      this.gamepad = gamepad;
      this.gamepadConnected = true;
      
      // Show visual notification
      this._showGamepadNotification(gamepad, true);
      
      if (isXbox) {
        console.log('✅ Xbox controller detected! Ready to use.');
      } else {
        console.log('⚠️ Non-Xbox controller detected. May have different button mappings.');
      }
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      const gamepad = e.gamepad;
      const isXbox = this._isXboxController(gamepad);
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎮 GAMEPAD DISCONNECTED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Type:', isXbox ? 'Xbox Controller' : 'Generic Controller');
      console.log('ID:', gamepad.id);
      console.log('Index:', gamepad.index);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (this.gamepad && this.gamepad.index === gamepad.index) {
        this.gamepad = null;
        this.gamepadConnected = false;
        
        // Show visual notification
        this._showGamepadNotification(gamepad, false);
        
        // Reset gamepad-controlled inputs
        this.inputState.up = false;
        this.inputState.down = false;
        this.inputState.left = false;
        this.inputState.right = false;
        this.inputState.shift = false;
        this.inputState.jump = false;
        this.inputState.shoot = false;
        this.inputState.mortar = false;
        
        // Clear gamepad movement vector
        this.gamepadMovementVector.x = 0;
        this.gamepadMovementVector.y = 0;
        this._gamepadMovementActive = false;
        
        // Clear projectile direction
        this.projectileDirection.x = 0;
        this.projectileDirection.z = 0;
        this._projectileDirectionActive = false;
        
        console.log('⚠️ Gamepad inputs cleared');
      }
    });

    // Check for already connected gamepads
    this._checkExistingGamepads();
    
    // Activate gamepad access on user interaction
    // Some browsers require user interaction before Gamepad API becomes accessible
    const activateOnInteraction = () => {
      if (!this.gamepadConnected) {
        this.activateGamepadAccess();
      }
    };
    
    // Listen for various user interactions to activate gamepad access
    window.addEventListener('click', activateOnInteraction, { once: true });
    window.addEventListener('keydown', activateOnInteraction, { once: true });
    window.addEventListener('mousedown', activateOnInteraction, { once: true });
    window.addEventListener('touchstart', activateOnInteraction, { once: true });
    
    // Also activate when window gains focus (for when controller is plugged in after page load)
    window.addEventListener('focus', () => {
      if (!this.gamepadConnected) {
        this.activateGamepadAccess();
      }
    });
  }

  /**
   * Check for gamepads that are already connected
   * @private
   */
  _checkExistingGamepads() {
    // Some browsers require user interaction before Gamepad API is accessible
    // Try to access gamepads, but don't error if unavailable
    try {
      if (navigator.getGamepads) {
        const gamepads = navigator.getGamepads();
        for (let i = 0; i < gamepads.length; i++) {
          if (gamepads[i]) {
            const gamepad = gamepads[i];
            this.gamepad = gamepad;
            this.gamepadConnected = true;
            const isXbox = this._isXboxController(gamepad);
            
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🎮 GAMEPAD ALREADY CONNECTED');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('Type:', isXbox ? '✅ Xbox Controller' : 'Generic Controller');
            console.log('ID:', gamepad.id);
            console.log('Index:', gamepad.index);
            console.log('Buttons:', gamepad.buttons.length);
            console.log('Axes:', gamepad.axes.length);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            // Show visual notification
            this._showGamepadNotification(gamepad, true);
            
            if (isXbox) {
              console.log('✅ Xbox controller detected! Ready to use.');
            }
            
            break;
          }
        }
      }
    } catch (e) {
      // Gamepad API may not be accessible yet (requires user interaction)
      console.log('Gamepad API not yet accessible:', e.message);
    }
  }

  /**
   * Activate gamepad access (call after user interaction)
   * Some browsers require user interaction before Gamepad API becomes available
   */
  activateGamepadAccess() {
    // Force gamepad polling by accessing navigator.getGamepads()
    // This "wakes up" the Gamepad API on some browsers
    try {
      if (navigator.getGamepads) {
        const gamepads = navigator.getGamepads();
        // Check all gamepad slots
        for (let i = 0; i < gamepads.length; i++) {
          if (gamepads[i] && !this.gamepadConnected) {
            const gamepad = gamepads[i];
            this.gamepad = gamepad;
            this.gamepadConnected = true;
            const isXbox = this._isXboxController(gamepad);
            
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🎮 GAMEPAD ACTIVATED');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('Type:', isXbox ? '✅ Xbox Controller' : 'Generic Controller');
            console.log('ID:', gamepad.id);
            console.log('Index:', gamepad.index);
            console.log('Buttons:', gamepad.buttons.length);
            console.log('Axes:', gamepad.axes.length);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            // Show visual notification
            this._showGamepadNotification(gamepad, true);
            
            if (isXbox) {
              console.log('✅ Xbox controller activated! Ready to use.');
            }
            
            return true;
          }
        }
      }
    } catch (e) {
      console.log('Gamepad API activation failed:', e.message);
    }
    
    // Retry checking existing gamepads
    this._checkExistingGamepads();
    return this.gamepadConnected;
  }

  /**
   * Update gamepad input state
   * Should be called each frame from the game loop
   * @param {number} dt - Delta time in seconds (optional, defaults to ~0.016 for 60fps)
   */
  updateGamepad(dt = 0.016) {
    // Check if Gamepad API is available
    if (!navigator.getGamepads) {
      return;
    }

    // If no gamepad is connected, periodically check for one
    if (!this.gamepadConnected) {
      this._checkExistingGamepads();
      // Also try activation in case it needs user interaction
      if (!this.gamepadConnected) {
        this.activateGamepadAccess();
      }
      if (!this.gamepadConnected) {
        return;
      }
    }

    // Get current gamepad state
    let gamepads;
    try {
      gamepads = navigator.getGamepads();
    } catch (e) {
      // Gamepad API may not be accessible yet
      console.log('Gamepad API access failed:', e.message);
      this.gamepad = null;
      this.gamepadConnected = false;
      return;
    }
    
    const gamepad = gamepads[this.gamepad ? this.gamepad.index : 0];
    
    // If gamepad was disconnected or not found, check all slots
    if (!gamepad) {
      // Try to find any connected gamepad
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          this.gamepad = gamepads[i];
          this.gamepadConnected = true;
          console.log('Gamepad reconnected:', gamepads[i].id);
          break;
        }
      }
      
      // If still no gamepad found, reset state
      if (!this.gamepad) {
        this.gamepad = null;
        this.gamepadConnected = false;
        return;
      }
    }

    // Update gamepad reference
    this.gamepad = gamepad;

    // Store keyboard state before applying gamepad (keyboard takes precedence)
    const hadKeyboardMovement = this.inputState.up || this.inputState.down || 
                                  this.inputState.left || this.inputState.right;
    const hadKeyboardJump = this.inputState.jump && !this._gamepadJumpState;
    const hadKeyboardShift = this.inputState.shift && !this._gamepadShiftState;

    // Left analog stick (axes 0 and 1) 
    const leftStickX = gamepad.axes[0];
    const leftStickY = gamepad.axes[1];
    
    // Apply dead zone to raw stick values
    const leftXDead = Math.abs(leftStickX) > this.gamepadDeadZone ? leftStickX : 0;
    const leftYDead = Math.abs(leftStickY) > this.gamepadDeadZone ? leftStickY : 0;
    
    // Store analog movement vector for smooth 360-degree movement
    // This allows movement in all directions, not just cardinal
    if (Math.abs(leftStickX) > this.gamepadDeadZone || Math.abs(leftStickY) > this.gamepadDeadZone) {
      // Normalize to ensure smooth circular movement (not square movement)
      const stickMagnitude = Math.sqrt(leftStickX * leftStickX + leftStickY * leftStickY);
      if (stickMagnitude > 1.0) {
        // Normalize if magnitude exceeds 1 (shouldn't happen but safety check)
        this.gamepadMovementVector.x = leftStickX / stickMagnitude;
        this.gamepadMovementVector.y = leftStickY / stickMagnitude;
      } else {
        // Use raw values for analog movement (allows variable speed based on stick position)
        this.gamepadMovementVector.x = leftStickX;
        this.gamepadMovementVector.y = leftStickY;
      }
      this._gamepadMovementActive = true;
    } else {
      // Clear movement when stick returns to neutral
      this.gamepadMovementVector.x = 0;
      this.gamepadMovementVector.y = 0;
      this._gamepadMovementActive = false;
    }
    
    // Store left stick direction for projectile control (raw, normalized)
    // Always update projectile direction regardless of game mode
    const leftStickLength = Math.sqrt(leftXDead * leftXDead + leftYDead * leftYDead);
    if (leftStickLength > this.gamepadDeadZone) {
      // Normalize and store direction
      this.projectileDirection.x = leftXDead / leftStickLength;
      this.projectileDirection.z = -leftYDead / leftStickLength; // Invert Y for 3D (up stick = forward in Z)
      this._projectileDirectionActive = true;
    } else {
      // Clear projectile direction when stick returns to neutral
      this.projectileDirection.x = 0;
      this.projectileDirection.z = 0;
      this._projectileDirectionActive = false;
    }
    
    // Apply dead zone for binary movement check (used for old movement system, deprecated)
    const leftX = leftXDead;
    const leftY = leftYDead;
    
    // D-Pad is disabled - only joystick movement is allowed
    // This ensures smooth 360-degree analog movement only
    
    // Clear keyboard movement states - movement is now joystick-only
    // Keyboard movement is disabled per user request
    if (hadKeyboardMovement) {
      this.inputState.left = false;
      this.inputState.right = false;
      this.inputState.up = false;
      this.inputState.down = false;
    }

    // Jump (typically button 0 or A button) - combine with keyboard
    const gamepadJump = (gamepad.buttons[0] && gamepad.buttons[0].pressed) ||
                        (gamepad.buttons[1] && gamepad.buttons[1].pressed); // Also support B button
    if (gamepadJump && this._loggingEnabled) {
      this._logInput('🅰️ JUMP', gamepadJump ? 'pressed' : 'released', gamepad);
    }
    if (gamepadJump || hadKeyboardJump) {
      this.inputState.jump = true;
      this._gamepadJumpState = gamepadJump;
    } else {
      this.inputState.jump = hadKeyboardJump || false;
      this._gamepadJumpState = false;
    }

    // Run/Sprint (typically left shoulder button or left trigger) - combine with keyboard
    const gamepadShift = (gamepad.buttons[4] && gamepad.buttons[4].pressed) || // Left shoulder
                          (gamepad.buttons[6] && gamepad.buttons[6].value > 0.5); // Left trigger
    if (gamepadShift && this._loggingEnabled) {
      this._logInput('🏃 SPRINT', gamepadShift ? 'pressed' : 'released', gamepad);
    }
    if (gamepadShift || hadKeyboardShift) {
      this.inputState.shift = true;
      this._gamepadShiftState = gamepadShift;
    } else {
      this.inputState.shift = hadKeyboardShift || false;
      this._gamepadShiftState = false;
    }

    // Shoot (typically right trigger RT) - firebolt
    const shootPressed = (gamepad.buttons[7] && gamepad.buttons[7].value > 0.5); // Right trigger only
    
    if (shootPressed && !this.shootPressed) {
      this.shootPressed = true;
      this.inputState.shoot = true;
      if (this._loggingEnabled) {
        this._logInput('🔫 SHOOT (Firebolt)', 'pressed', gamepad);
      }
    } else if (!shootPressed && this.shootPressed) {
      this.shootPressed = false;
      this.inputState.shoot = false;
    }

    // Mortar (RB button 5 only)
    const mortarPressed = gamepad.buttons[5] && gamepad.buttons[5].pressed; // Right bumper (RB) only
    
    if (mortarPressed && !this.mortarPressed) {
      this.mortarPressed = true;
      this.inputState.mortar = true;
      if (this._loggingEnabled) {
        this._logInput('💣 MORTAR', 'pressed', gamepad);
      }
    } else if (!mortarPressed && this.mortarPressed) {
      this.mortarPressed = false;
      this.inputState.mortar = false;
    }

    // Right analog stick (axes 2 and 3) for aiming/shooting direction
    const rightStickX = gamepad.axes[2];
    const rightStickY = gamepad.axes[3];
    
    // Update mouse position based on right stick for aiming
    if (Math.abs(rightStickX) > this.gamepadDeadZone || Math.abs(rightStickY) > this.gamepadDeadZone) {
      // Convert stick input to screen coordinates
      // Scale factor for cursor movement speed
      const cursorSensitivity = 500; // pixels per second per stick unit
      
      // Update cursor position relative to screen center
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      // Apply stick input with delta time
      const deltaX = rightStickX * cursorSensitivity * dt;
      const deltaY = rightStickY * cursorSensitivity * dt;
      
      // Update mouse position
      this.mousePosition.x = Math.max(0, Math.min(window.innerWidth, this.mousePosition.x + deltaX));
      // Invert Y for right stick (up stick = move cursor up on screen)
      this.mousePosition.y = Math.max(0, Math.min(window.innerHeight, this.mousePosition.y - deltaY));
    }
  }

  /**
   * Check if a gamepad is connected
   * @returns {boolean} True if a gamepad is connected
   */
  isGamepadConnected() {
    return this.gamepadConnected;
  }

  /**
   * Log gamepad input (throttled to avoid spam)
   * @param {string} action - Action name
   * @param {string} state - Input state (pressed/released)
   * @param {Object} gamepad - Gamepad object
   * @private
   */
  _logInput(action, state, gamepad) {
    const now = Date.now();
    const logKey = `${action}-${state}`;
    
    // Throttle logs
    if (this._lastInputLog && this._lastInputLog.key === logKey && 
        (now - this._lastInputLog.time) < this._inputLogThrottle) {
      return;
    }
    
    this._lastInputLog = { key: logKey, time: now };
    console.log(`🎮 [INPUT] ${action} - ${state.toUpperCase()}`);
    
    // Log detailed button state for debugging
    if (gamepad && this._loggingEnabled) {
      const activeButtons = [];
      for (let i = 0; i < gamepad.buttons.length; i++) {
        if (gamepad.buttons[i] && (gamepad.buttons[i].pressed || gamepad.buttons[i].value > 0.1)) {
          activeButtons.push(`Btn${i}:${gamepad.buttons[i].value.toFixed(2)}`);
        }
      }
      if (activeButtons.length > 0) {
        console.log(`   Active buttons: ${activeButtons.join(', ')}`);
      }
    }
  }

  /**
   * Toggle input logging
   * @param {boolean} enabled - Whether to enable logging
   */
  setLoggingEnabled(enabled) {
    this._loggingEnabled = enabled;
    console.log(`🎮 Input logging ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Manually trigger gamepad activation
   * Useful for debugging or forcing gamepad detection
   * @returns {boolean} True if a gamepad was found and activated
   */
  forceGamepadActivation() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 MANUALLY ACTIVATING GAMEPAD ACCESS...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const wasConnected = this.gamepadConnected;
    const activated = this.activateGamepadAccess();
    
    if (activated && !wasConnected) {
      console.log('✅ Gamepad activated successfully!');
      const isXbox = this._isXboxController(this.gamepad);
      if (isXbox) {
        console.log('✅ Xbox controller confirmed!');
      }
    } else if (activated) {
      console.log('✅ Gamepad already active');
    } else {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  NO GAMEPAD DETECTED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Troubleshooting steps:');
      console.log('  1. ✅ Controller is connected (USB-C, Bluetooth, or wireless adapter)');
      console.log('  2. ✅ Controller is turned on/powered');
      console.log('  3. ✅ On Mac: System recognizes controller in System Settings > Game Controller');
      console.log('  4. ✅ Press any button on the controller to "wake it up"');
      console.log('  5. ✅ Click anywhere on the page to activate Gamepad API');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Check if Gamepad API is available
      if (!navigator.getGamepads) {
        console.error('❌ Gamepad API not supported in this browser');
      } else {
        const gamepads = navigator.getGamepads();
        console.log(`   Found ${gamepads.length} gamepad slots`);
        for (let i = 0; i < gamepads.length; i++) {
          if (gamepads[i]) {
            console.log(`   Slot ${i}: ${gamepads[i].id}`);
          }
        }
      }
    }
    
    return activated;
  }

  /**
   * Set key state based on event
   * @param {KeyboardEvent} e - Keyboard event
   * @param {boolean} pressed - Whether key is pressed
   */
  setKeyState(e, pressed) {
    const keys = getKeyBindings();
    
    // Movement keys are disabled - only joystick movement is allowed
    // Arrow keys and WASD no longer control movement
    // Keeping this code for other keys (shift, jump, etc.)
    
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
   * Uses gamepad analog joystick for smooth 360-degree movement
   * @returns {THREE.Vector2} Input vector (analog for joystick, normalized for keyboard)
   */
  getInputVector() {
    // If gamepad is active and providing analog movement, use that (smooth 360-degree)
    if (this._gamepadMovementActive && (this.gamepadMovementVector.x !== 0 || this.gamepadMovementVector.y !== 0)) {
      // Return analog joystick values for smooth movement in all directions
      // Y axis is inverted for gamepad (up stick = negative Y = forward in Z)
      return new THREE.Vector2(
        this.gamepadMovementVector.x,
        -this.gamepadMovementVector.y // Invert Y for 3D space
      );
    }
    
    // Fallback to keyboard input (if any, but movement keys are now disabled)
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

  /**
   * Get left joystick direction for projectile control
   * @returns {Object} Direction with x and z components (normalized, 0-1 range)
   */
  getProjectileDirection() {
    return this.projectileDirection;
  }

  /**
   * Check if left joystick is active for projectile direction
   * @returns {boolean} True if left joystick is being used for projectile direction
   */
  isProjectileDirectionActive() {
    return this._projectileDirectionActive;
  }
}

