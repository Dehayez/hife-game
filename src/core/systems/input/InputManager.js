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
import { getMovementStats, getKeyBindings } from '../../../config/input/InputStats.js';

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
      mortar: false,
      characterSwap: false,
      heal: false,
      swordSwing: false,
      doubleJump: false,
      levitate: false
    };
    
    this.mousePosition = { x: 0, y: 0 };
    this.shootPressed = false;
    this.mortarPressed = false;
    this.mortarHoldPressed = false; // Track RB press state for toggle detection
    this.mortarHoldActive = false; // Track mortar hold toggle state (set by GameLoop)
    this.healingActive = false; // Track healing active state (set by GameLoop)
    this.leftTriggerPressed = false; // Track LT (left trigger) for preview
    this.rightTriggerPressed = false; // Track RT (right trigger) for release
    this.characterSwapPressed = false;
    this.healPressed = false;
    this.swordSwingPressed = false;
    this.scoreboardPressed = false;

    // Gamepad state
    this.gamepad = null;
    this.gamepadConnected = false;
    this.gamepadDeadZone = 0.2; // Dead zone for analog sticks
    this._gamepadJumpState = false;
    this._gamepadShiftState = false;
    this._gamepadMovementActive = false; // Track if gamepad is controlling movement
    this._lastJumpPressTime = 0; // For double jump detection
    this._doubleJumpTimeWindow = 500; // ms window for double jump
    this._previousJumpButtonState = false; // Track previous state to detect press vs hold
    this._keyboardJumpButtonPressed = false; // Track keyboard Spacebar state (separate from jump action)
    this._loggingEnabled = true; // Enable detailed input logging
    this._lastInputLog = null; // Track last input to avoid spam
    this._inputLogThrottle = 200; // Throttle input logs (ms)
    
    // Left joystick direction for projectile control (separate from movement)
    this.projectileDirection = { x: 0, z: 0 };
    this._projectileDirectionActive = false;
    
    // Left joystick analog movement (for smooth 360-degree movement)
    this.gamepadMovementVector = { x: 0, y: 0 };
    
    // Right joystick analog aiming (for smooth 360-degree aiming)
    this.gamepadAimingVector = { x: 0, y: 0 };
    this._gamepadAimingActive = false;
    
    // Right joystick normalized direction for projectile control (separate from cursor)
    this.rightJoystickDirection = { x: 0, z: 0 }; // World space direction (normalized)
    this._rightJoystickDirectionActive = false;
    this._lastRightJoystickDirection = { x: 0, z: 0 }; // Last valid direction before entering dead zone
    this._rightJoystickMagnitude = 0; // Raw magnitude (0-1) for distance scaling
    this._lastRightJoystickMagnitude = 0; // Last valid magnitude
    this._rightJoystickInDeadZone = false; // Track when stick is in dead zone
    
    const stats = getMovementStats();
    this.moveSpeed = stats.moveSpeed;
    this.runSpeedMultiplier = stats.runSpeedMultiplier;
    
    // Input mode: 'keyboard' or 'controller'
    this.inputMode = 'keyboard'; // Default to keyboard
    
    // Flag to block inputs (e.g., when menu is open)
    this._inputBlocked = false;
    
    // Callback for controller connection status changes
    this._onControllerStatusChange = null;
    
    this._setupEventListeners();
    this._setupGamepadListeners();
  }

  /**
   * Set callback for controller connection status changes
   * @param {Function} callback - Callback function(isConnected: boolean) => void
   */
  setOnControllerStatusChange(callback) {
    this._onControllerStatusChange = callback;
  }

  /**
   * Set input mode ('keyboard' or 'controller')
   * @param {string} mode - Input mode
   */
  setInputMode(mode) {
    if (mode === 'keyboard' || mode === 'controller') {
      // Prevent switching to controller mode if no controller is connected
      if (mode === 'controller' && !this.gamepadConnected) {
        console.warn('Cannot switch to controller mode: no controller detected');
        return false;
      }
      
      this.inputMode = mode;
      
      // Clear inputs when switching modes to prevent stuck states
      if (mode === 'keyboard') {
        // Clear gamepad-controlled inputs
        this.gamepadMovementVector.x = 0;
        this.gamepadMovementVector.y = 0;
        this._gamepadMovementActive = false;
        this.projectileDirection.x = 0;
        this.projectileDirection.z = 0;
        this._projectileDirectionActive = false;
        this.gamepadAimingVector.x = 0;
        this.gamepadAimingVector.y = 0;
        this._gamepadAimingActive = false;
        this.rightJoystickDirection.x = 0;
        this.rightJoystickDirection.z = 0;
        this._rightJoystickDirectionActive = false;
      } else {
        // Clear keyboard-controlled inputs
        this.inputState.up = false;
        this.inputState.down = false;
        this.inputState.left = false;
        this.inputState.right = false;
        this.inputState.levitate = false;
      }
      
      return true;
    }
    return false;
  }

  /**
   * Get current input mode
   * @returns {string} Current input mode ('keyboard' or 'controller')
   */
  getInputMode() {
    return this.inputMode;
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
      // Tab key for scoreboard (works in both keyboard and controller mode)
      if (e.key === 'Tab') {
        if (!this.scoreboardPressed) {
          this.scoreboardPressed = true;
          this.inputState.scoreboard = true;
        }
        e.preventDefault();
        return;
      }

      // Only process keyboard input when in keyboard mode
      if (this.inputMode === 'keyboard') {
        this.setKeyState(e, true);
        // Prevent default browser behavior for game keys
        if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
            e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
        }
      }
    });
    window.addEventListener('keyup', (e) => {
      // Tab key for scoreboard (works in both keyboard and controller mode)
      if (e.key === 'Tab') {
        this.scoreboardPressed = false;
        this.inputState.scoreboard = false;
        e.preventDefault();
        return;
      }

      // Only process keyboard input when in keyboard mode
      if (this.inputMode === 'keyboard') {
        this.setKeyState(e, false);
        // Prevent default browser behavior for game keys
        if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
            e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
        }
      }
    });
    
    // Mouse click for shooting
    window.addEventListener('mousedown', (e) => {
      // Don't shoot if clicking on UI elements
      if (this._isUIElement(e)) {
        return;
      }
      
      // Only process mouse input when in keyboard mode
      if (this.inputMode === 'keyboard') {
        if (e.button === 0) { // Left mouse button
          this.shootPressed = true;
          this.inputState.shoot = true;
        } else if (e.button === 2) { // Right mouse button
          this.mortarPressed = true;
          this.inputState.mortar = true;
        }
      }
    });
    
    window.addEventListener('mouseup', (e) => {
      // Don't process shooting if clicking on UI elements
      if (this._isUIElement(e)) {
        return;
      }
      
      // Only process mouse input when in keyboard mode
      if (this.inputMode === 'keyboard') {
        if (e.button === 0) {
          this.shootPressed = false;
          this.inputState.shoot = false;
        } else if (e.button === 2) {
          this.mortarPressed = false;
          this.inputState.mortar = false;
        }
      }
    });
    
    // Prevent context menu on right click (unless on UI)
    window.addEventListener('contextmenu', (e) => {
      if (!this._isUIElement(e)) {
        e.preventDefault();
      }
    });
    
    // Track mouse position (always track for cursor display, but only use for input in keyboard mode)
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
      
      this.gamepad = gamepad;
      this.gamepadConnected = true;
      
      // Show visual notification
      this._showGamepadNotification(gamepad, true);
      
      // Notify callback about controller connection
      if (this._onControllerStatusChange) {
        this._onControllerStatusChange(true);
      }
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      const gamepad = e.gamepad;
      const isXbox = this._isXboxController(gamepad);
      
      if (this.gamepad && this.gamepad.index === gamepad.index) {
        this.gamepad = null;
        this.gamepadConnected = false;
        
        // Show visual notification
        this._showGamepadNotification(gamepad, false);
        
        // If currently in controller mode, auto-switch to keyboard mode
        if (this.inputMode === 'controller') {
          this.inputMode = 'keyboard';
        }
        
        // Reset gamepad-controlled inputs
        this.inputState.up = false;
        this.inputState.down = false;
        this.inputState.left = false;
        this.inputState.right = false;
        this.inputState.shift = false;
        this.inputState.jump = false;
        this.inputState.shoot = false;
        this.inputState.mortar = false;
        this.inputState.characterSwap = false;
        this.inputState.heal = false;
        this.inputState.swordSwing = false;
        this.inputState.doubleJump = false;
        this.inputState.levitate = false;
        
        // Reset mortar hold state
        this.mortarHoldPressed = false;
        this.mortarHoldActive = false;
        this.healingActive = false;
        this.leftTriggerPressed = false;
        this.rightTriggerPressed = false;
        
        // Clear gamepad movement vector
        this.gamepadMovementVector.x = 0;
        this.gamepadMovementVector.y = 0;
        this._gamepadMovementActive = false;
        
        // Clear projectile direction
        this.projectileDirection.x = 0;
        this.projectileDirection.z = 0;
        this._projectileDirectionActive = false;
        
        // Clear aiming vector
        this.gamepadAimingVector.x = 0;
        this.gamepadAimingVector.y = 0;
        this._gamepadAimingActive = false;
        
        // Clear right joystick direction
        this.rightJoystickDirection.x = 0;
        this.rightJoystickDirection.z = 0;
        this._rightJoystickDirectionActive = false;
        this._lastRightJoystickDirection.x = 0;
        this._lastRightJoystickDirection.z = 0;
        this._rightJoystickMagnitude = 0;
        this._lastRightJoystickMagnitude = 0;
        this._rightJoystickInDeadZone = false;
        
        // Notify callback about controller disconnection
        if (this._onControllerStatusChange) {
          this._onControllerStatusChange(false);
        }
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
            
            // Show visual notification
            this._showGamepadNotification(gamepad, true);
            
            // Notify callback about controller connection
            if (this._onControllerStatusChange) {
              this._onControllerStatusChange(true);
            }
            
            break;
          }
        }
      }
    } catch (e) {
      // Gamepad API may not be accessible yet (requires user interaction)
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
            
            // Show visual notification
            this._showGamepadNotification(gamepad, true);
            
            // Notify callback about controller connection
            if (this._onControllerStatusChange) {
              this._onControllerStatusChange(true);
            }
            
            return true;
          }
        }
      }
    } catch (e) {
      // Gamepad API activation failed
    }
    
    // Retry checking existing gamepads
    this._checkExistingGamepads();
    return this.gamepadConnected;
  }

  /**
   * Set flag to block gamepad inputs (e.g., when menu is open)
   * @param {boolean} blocked - True to block inputs, false to allow
   */
  setInputBlocked(blocked) {
    this._inputBlocked = blocked;
    
    // Clear all inputs when blocked
    if (blocked) {
      this.inputState.up = false;
      this.inputState.down = false;
      this.inputState.left = false;
      this.inputState.right = false;
      this.inputState.jump = false;
      this.inputState.shift = false;
      this.inputState.shoot = false;
      this.inputState.mortar = false;
      this.inputState.levitate = false;
      this.inputState.characterSwap = false;
      this.inputState.heal = false;
      this.inputState.swordSwing = false;
      this.gamepadMovementVector.x = 0;
      this.gamepadMovementVector.y = 0;
      this._gamepadMovementActive = false;
      
      // Clear pressed state tracking
      this.swordSwingPressed = false;
      this.shootPressed = false;
      this.mortarPressed = false;
      this.mortarHoldPressed = false;
      this.leftTriggerPressed = false;
      this.rightTriggerPressed = false;
      this.characterSwapPressed = false;
      this.healPressed = false;
      this._previousJumpButtonState = false;
      this._previousKeyboardJumpState = false;
      this._gamepadJumpState = false;
    } else {
      // Clear pressed state tracking when unblocking to prevent button presses from leaking through
      this.swordSwingPressed = false;
      this.shootPressed = false;
      this.mortarPressed = false;
      this.mortarHoldPressed = false;
      this.leftTriggerPressed = false;
      this.rightTriggerPressed = false;
      this.characterSwapPressed = false;
      this.healPressed = false;
      this._previousJumpButtonState = false;
      this._previousKeyboardJumpState = false;
      this._gamepadJumpState = false;
    }
  }

  /**
   * Process jump and levitation input (works for both keyboard and controller modes)
   * Separates jump (press) from levitate (hold)
   */
  _processJumpAndLevitation() {
    // For keyboard mode, process Spacebar
    if (this.inputMode === 'keyboard') {
      const keyboardJumpButton = this._keyboardJumpButtonPressed;
      const isKeyboardJustPressed = keyboardJumpButton && !this._previousKeyboardJumpState;
      
      // Update levitation state (hold down = levitate)
      const isHoldingKeyboard = keyboardJumpButton && this._previousKeyboardJumpState;
      this.inputState.levitate = isHoldingKeyboard;
      
      // Jump only triggers on initial press, not on hold
      const now = Date.now();
      if (isKeyboardJustPressed) {
        // Detect double jump: two presses within time window
        if (now - this._lastJumpPressTime < this._doubleJumpTimeWindow && this._lastJumpPressTime > 0) {
          this.inputState.doubleJump = true;
          if (this._loggingEnabled) {
            this._logInput('🔄 DOUBLE JUMP', 'detected', null);
          }
        } else {
          this.inputState.doubleJump = false;
        }
        
        this.inputState.jump = true;
        this._lastJumpPressTime = now;
        
        if (!this.inputState.doubleJump && this._loggingEnabled) {
          this._logInput('🅰️ JUMP', 'pressed', null);
        }
      } else {
        // Clear jump state if not pressing (only set jump on press, not hold)
        this.inputState.jump = false;
        this.inputState.doubleJump = false;
      }
      
      // Update previous state for next frame
      this._previousKeyboardJumpState = keyboardJumpButton;
      return;
    }
  }

  /**
   * Update gamepad input state
   * Should be called each frame from the game loop
   * @param {number} dt - Delta time in seconds (optional, defaults to ~0.016 for 60fps)
   */
  updateGamepad(dt = 0.016) {
    // Process jump/levitation for keyboard mode
    if (this.inputMode === 'keyboard') {
      this._processJumpAndLevitation();
      return;
    }
    
    // Only process gamepad input when in controller mode
    if (this.inputMode !== 'controller') {
      return;
    }
    
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

    // Always process scoreboard button even when inputs are blocked (needed to close scoreboard)
    // Scoreboard (Back/Select button 8) - toggle scoreboard
    const scoreboardPressed = gamepad.buttons[8] && gamepad.buttons[8].pressed; // Back/Select button

    if (scoreboardPressed && !this.scoreboardPressed) {
      this.scoreboardPressed = true;
      this.inputState.scoreboard = true;
      if (this._loggingEnabled && !this._inputBlocked) {
        this._logInput('📊 SCOREBOARD', 'pressed', gamepad);
      }
    } else if (!scoreboardPressed && this.scoreboardPressed) {
      this.scoreboardPressed = false;
      this.inputState.scoreboard = false;
    }
    
    // Block other inputs if requested (e.g., menu is open, scoreboard is open)
    if (this._inputBlocked) {
      return;
    }

    // Check for keyboard state (only relevant if somehow keyboard was used, but should be cleared in controller mode)
    const hadKeyboardMovement = this.inputState.up || this.inputState.down || 
                                  this.inputState.left || this.inputState.right;
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
    
    // Clear keyboard movement states when using controller (controller mode only)
    if (hadKeyboardMovement) {
      this.inputState.left = false;
      this.inputState.right = false;
      this.inputState.up = false;
      this.inputState.down = false;
    }

    // Jump and Levitation (A button 0 / Spacebar) - separate press (jump) from hold (levitate)
    const gamepadJumpButton = gamepad.buttons[0] && gamepad.buttons[0].pressed; // A button
    const keyboardJumpButton = this._keyboardJumpButtonPressed; // Spacebar from keyboard
    
    // Detect press vs hold: jump only on initial press, levitate on hold
    const isGamepadJustPressed = gamepadJumpButton && !this._previousJumpButtonState;
    const isKeyboardJustPressed = keyboardJumpButton && !this._previousKeyboardJumpState;
    const isJumpPress = isGamepadJustPressed || isKeyboardJustPressed;
    
    // Update levitation state (hold down = levitate)
    // Levitate when button is currently held AND was also held in previous frame (meaning it's being held, not just pressed)
    const isHoldingGamepad = gamepadJumpButton && this._previousJumpButtonState;
    const isHoldingKeyboard = keyboardJumpButton && this._previousKeyboardJumpState;
    this.inputState.levitate = isHoldingGamepad || isHoldingKeyboard;
    
    // Detect double jump: track press timing
    const now = Date.now();
    
    // Jump only triggers on initial press, not on hold
    if (isJumpPress) {
      // Detect double jump: two presses within time window
      if (now - this._lastJumpPressTime < this._doubleJumpTimeWindow && this._lastJumpPressTime > 0) {
        this.inputState.doubleJump = true;
        if (this._loggingEnabled) {
          this._logInput('🔄 DOUBLE JUMP', 'detected', gamepad);
        }
      } else {
        this.inputState.doubleJump = false;
      }
      
      this.inputState.jump = true;
      this._gamepadJumpState = gamepadJumpButton;
      this._lastJumpPressTime = now;
      
      if (!this.inputState.doubleJump && this._loggingEnabled) {
        this._logInput('🅰️ JUMP', 'pressed', gamepad);
      }
    } else {
      // Clear jump state if not pressing (only set jump on press, not hold)
      this.inputState.jump = false;
      this._gamepadJumpState = false;
      this.inputState.doubleJump = false;
    }
    
    // Update previous states for next frame
    this._previousJumpButtonState = gamepadJumpButton;
    this._previousKeyboardJumpState = keyboardJumpButton;
    
    // Run/Sprint (left trigger only now) - combine with keyboard
    // Don't allow sprinting while holding mortar spell or healing
    const gamepadShift = (gamepad.buttons[6] && gamepad.buttons[6].value > 0.5); // Left trigger only
    if (gamepadShift && this._loggingEnabled) {
      this._logInput('🏃 SPRINT', gamepadShift ? 'pressed' : 'released', gamepad);
    }
    // Prevent sprinting when mortar hold is active or healing is active
    if (this.mortarHoldActive || this.healingActive) {
      this.inputState.shift = false;
      this._gamepadShiftState = false;
    } else if (gamepadShift || hadKeyboardShift) {
      this.inputState.shift = true;
      this._gamepadShiftState = gamepadShift;
    } else {
      this.inputState.shift = hadKeyboardShift || false;
      this._gamepadShiftState = false;
    }

    // Shoot (typically right trigger RT) - bolt
    // Don't allow RT to fire bolts when mortar hold is active (RT is used for mortar release)
    const shootPressed = (gamepad.buttons[7] && gamepad.buttons[7].value > 0.5); // Right trigger only
    
        // If mortar hold is active, prevent RT from firing bolts
    // Always clear shoot state when mortar hold is active, regardless of RT state
    if (this.mortarHoldActive) {
      // Force clear shoot state - RT is reserved for mortar release
      this.shootPressed = false;
      this.inputState.shoot = false;
    } else {
      // Normal shooting behavior when not in mortar hold mode
      if (shootPressed && !this.shootPressed) {
        this.shootPressed = true;
        this.inputState.shoot = true;
        if (this._loggingEnabled) {
          this._logInput('🔫 SHOOT (Bolt)', 'pressed', gamepad);
        }
      } else if (!shootPressed && this.shootPressed) {
        this.shootPressed = false;
        this.inputState.shoot = false;
      }
    }

    // Mortar Toggle (RB button 5) - press once to enter hold mode, press again to drop
    const mortarHoldPressed = gamepad.buttons[5] && gamepad.buttons[5].pressed; // Right bumper (RB) only
    
    if (mortarHoldPressed && !this.mortarHoldPressed) {
      this.mortarHoldPressed = true;
      this.inputState.mortar = true; // Keep for compatibility
      if (this._loggingEnabled) {
        this._logInput('💣 MORTAR TOGGLE', 'pressed', gamepad);
      }
    } else if (!mortarHoldPressed && this.mortarHoldPressed) {
      this.mortarHoldPressed = false;
      this.inputState.mortar = false; // Keep for compatibility (will be overridden by toggle state)
    }
    
    // Legacy mortar support (for mouse right click) - preserve mouse state
    // Note: mortarPressed is set by mouse events, mortarHoldPressed is set by gamepad
    
    // Left Trigger (LT) - button 6 for preview while holding mortar
    const leftTriggerPressed = gamepad.buttons[6] && gamepad.buttons[6].value > 0.5;
    
    if (leftTriggerPressed !== this.leftTriggerPressed) {
      this.leftTriggerPressed = leftTriggerPressed;
      if (this._loggingEnabled) {
        this._logInput('👁️ LEFT TRIGGER (Preview)', leftTriggerPressed ? 'pressed' : 'released', gamepad);
      }
    }
    
    // Right Trigger (RT) - button 7 for releasing mortar (already tracked for shoot)
    const rightTriggerPressed = gamepad.buttons[7] && gamepad.buttons[7].value > 0.5;
    
    if (rightTriggerPressed !== this.rightTriggerPressed) {
      this.rightTriggerPressed = rightTriggerPressed;
      if (this._loggingEnabled && this.mortarHoldPressed) {
        this._logInput('🚀 RIGHT TRIGGER (Release Mortar)', rightTriggerPressed ? 'pressed' : 'released', gamepad);
      }
    }

    // Character Swap (Y button 3 only) - with smoke particles
    const characterSwapPressed = gamepad.buttons[3] && gamepad.buttons[3].pressed; // Y button only
    
    if (characterSwapPressed && !this.characterSwapPressed) {
      this.characterSwapPressed = true;
      this.inputState.characterSwap = true;
      if (this._loggingEnabled) {
        this._logInput('🔄 CHARACTER SWAP', 'pressed', gamepad);
      }
    } else if (!characterSwapPressed && this.characterSwapPressed) {
      this.characterSwapPressed = false;
      this.inputState.characterSwap = false;
    }

    // Heal (X button 2) - hold to heal
    const healPressed = gamepad.buttons[2] && gamepad.buttons[2].pressed; // X button only
    
    if (healPressed !== this.healPressed) {
      this.healPressed = healPressed;
      this.inputState.heal = healPressed;
      if (healPressed && this._loggingEnabled) {
        this._logInput('💚 HEAL', 'pressed', gamepad);
      } else if (!healPressed && this._loggingEnabled) {
        this._logInput('💚 HEAL', 'released', gamepad);
      }
    }

    // Sword Swing (B button 1) - 360 degree attack
    const swordSwingPressed = gamepad.buttons[1] && gamepad.buttons[1].pressed; // B button only

    if (swordSwingPressed && !this.swordSwingPressed) {
      this.swordSwingPressed = true;
      this.inputState.swordSwing = true;
      if (this._loggingEnabled) {
        this._logInput('⚔️ SWORD SWING', 'pressed', gamepad);
      }
    } else if (!swordSwingPressed && this.swordSwingPressed) {
      this.swordSwingPressed = false;
      this.inputState.swordSwing = false;
    }

    // Right analog stick (axes 2 and 3) for aiming/shooting direction
    const rightStickX = gamepad.axes[2];
    const rightStickY = gamepad.axes[3];
    
    // Check if stick is actually released (raw values very close to zero)
    const isStickReleased = Math.abs(rightStickX) < 0.05 && Math.abs(rightStickY) < 0.05;
    
    // Calculate raw magnitude (0-1) from raw stick values
    const rawMagnitude = Math.min(1, Math.sqrt(rightStickX * rightStickX + rightStickY * rightStickY));
    
    // Apply dead zone to raw stick values
    const rightXDead = Math.abs(rightStickX) > this.gamepadDeadZone ? rightStickX : 0;
    const rightYDead = Math.abs(rightStickY) > this.gamepadDeadZone ? rightStickY : 0;
    
    // Store normalized right joystick direction (screen-relative, not world space)
    // This will be converted to camera-relative world space in GameLoop
    const rightStickLength = Math.sqrt(rightXDead * rightXDead + rightYDead * rightYDead);
    if (rightStickLength > this.gamepadDeadZone) {
      // Normalize and store joystick input (raw joystick space)
      // X = right/left, Z = up/down (will be converted to camera-relative in GameLoop)
      this.rightJoystickDirection.x = rightXDead / rightStickLength;
      this.rightJoystickDirection.z = rightYDead / rightStickLength; // Store raw Y as Z (converted later)
      this._rightJoystickDirectionActive = true;
      this._rightJoystickInDeadZone = false;
      // Store magnitude for distance scaling
      this._rightJoystickMagnitude = rawMagnitude;
      this._lastRightJoystickMagnitude = rawMagnitude;
      // Save this direction as the last valid direction
      this._lastRightJoystickDirection.x = this.rightJoystickDirection.x;
      this._lastRightJoystickDirection.z = this.rightJoystickDirection.z;
    } else if (isStickReleased) {
      // Stick is fully released - clear the active flag
      this._rightJoystickDirectionActive = false;
      this._rightJoystickInDeadZone = false;
      this.rightJoystickDirection.x = 0;
      this.rightJoystickDirection.z = 0;
      this._rightJoystickMagnitude = 0;
    } else {
      // When in dead zone but not fully released, keep the last valid direction
      // This allows mortar aiming when RB is pressed even if stick is near center
      if (this._rightJoystickDirectionActive && !this._rightJoystickInDeadZone) {
        // First time entering dead zone - preserve the last direction and magnitude
        this._rightJoystickInDeadZone = true;
        // Use last saved direction and magnitude
        this.rightJoystickDirection.x = this._lastRightJoystickDirection.x;
        this.rightJoystickDirection.z = this._lastRightJoystickDirection.z;
        this._rightJoystickMagnitude = this._lastRightJoystickMagnitude;
        // Keep active flag set so mortar can use this direction
      } else if (!this._rightJoystickDirectionActive) {
        // Clear if was never active
        this._rightJoystickInDeadZone = false;
        this.rightJoystickDirection.x = 0;
        this.rightJoystickDirection.z = 0;
        this._rightJoystickMagnitude = 0;
      }
      // If already in dead zone and was active, keep the last direction and magnitude
    }
    
    // Store analog aiming vector for cursor movement (screen space)
    // This allows backwards compatibility with cursor-based aiming
    if (Math.abs(rightStickX) > this.gamepadDeadZone || Math.abs(rightStickY) > this.gamepadDeadZone) {
      // Normalize to ensure smooth circular aiming (not square aiming)
      const stickMagnitude = Math.sqrt(rightStickX * rightStickX + rightStickY * rightStickY);
      if (stickMagnitude > 1.0) {
        // Normalize if magnitude exceeds 1 (shouldn't happen but safety check)
        this.gamepadAimingVector.x = rightStickX / stickMagnitude;
        this.gamepadAimingVector.y = rightStickY / stickMagnitude;
      } else {
        // Use raw values for analog aiming (allows variable sensitivity based on stick position)
        this.gamepadAimingVector.x = rightStickX;
        this.gamepadAimingVector.y = rightStickY;
      }
      this._gamepadAimingActive = true;
      
      // Also update mouse position for backwards compatibility with cursor-based aiming
      // This allows both joystick direction and cursor position to work
      const cursorSensitivity = 500; // pixels per second per stick unit
      const deltaX = rightStickX * cursorSensitivity * dt;
      const deltaY = rightStickY * cursorSensitivity * dt;
      
      // Update mouse position
      this.mousePosition.x = Math.max(0, Math.min(window.innerWidth, this.mousePosition.x + deltaX));
      // Invert Y for right stick (up stick = move cursor up on screen)
      this.mousePosition.y = Math.max(0, Math.min(window.innerHeight, this.mousePosition.y - deltaY));
    } else {
      // Clear aiming when stick returns to neutral
      this.gamepadAimingVector.x = 0;
      this.gamepadAimingVector.y = 0;
      this._gamepadAimingActive = false;
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
  }

  /**
   * Toggle input logging
   * @param {boolean} enabled - Whether to enable logging
   */
  setLoggingEnabled(enabled) {
    this._loggingEnabled = enabled;
  }

  /**
   * Manually trigger gamepad activation
   * Useful for debugging or forcing gamepad detection
   * @returns {boolean} True if a gamepad was found and activated
   */
  forceGamepadActivation() {
    const wasConnected = this.gamepadConnected;
    const activated = this.activateGamepadAccess();
    return activated;
  }

  /**
   * Set key state based on event
   * @param {KeyboardEvent} e - Keyboard event
   * @param {boolean} pressed - Whether key is pressed
   */
  setKeyState(e, pressed) {
    const keys = getKeyBindings();
    
    // Movement keys (only processed in keyboard mode)
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
    
    // Shift key for running
    // Don't allow sprinting when mortar hold is active or healing is active
    if (keys.run.includes(e.key)) {
      if (this.mortarHoldActive || this.healingActive) {
        this.inputState.shift = false; // Prevent sprinting while holding mortar or healing
      } else {
        this.inputState.shift = pressed;
      }
    }
    
    // Space key for jumping (press) and levitation (hold)
    if (keys.jump.includes(e.key)) {
      // Track keyboard Spacebar state (separate from jump action)
      this._keyboardJumpButtonPressed = pressed;
    }
  }

  /**
   * Get input vector from current state
   * Uses gamepad analog joystick for smooth 360-degree movement in controller mode
   * Uses keyboard input in keyboard mode
   * @returns {THREE.Vector2} Input vector (analog for joystick, normalized for keyboard)
   */
  getInputVector() {
    // In controller mode, use gamepad analog joystick for smooth 360-degree movement
    if (this.inputMode === 'controller' && this._gamepadMovementActive && 
        (this.gamepadMovementVector.x !== 0 || this.gamepadMovementVector.y !== 0)) {
      // Return analog joystick values for smooth movement in all directions
      // Y axis is inverted for gamepad (up stick = negative Y = forward in Z)
      return new THREE.Vector2(
        this.gamepadMovementVector.x,
        -this.gamepadMovementVector.y // Invert Y for 3D space
      );
    }
    
    // In keyboard mode, use keyboard input
    if (this.inputMode === 'keyboard') {
      const input = new THREE.Vector2(
        (this.inputState.right ? 1 : 0) - (this.inputState.left ? 1 : 0),
        (this.inputState.up ? 1 : 0) - (this.inputState.down ? 1 : 0)
      );
      
      if (input.lengthSq() > 1) input.normalize();
      
      return input;
    }
    
    // Fallback: no input
    return new THREE.Vector2(0, 0);
  }

  /**
   * Get current movement speed
   * @returns {number} Current speed (base speed or running speed)
   */
  getCurrentSpeed() {
    // Don't allow sprinting when mortar hold is active or healing is active
    if (this.mortarHoldActive || this.healingActive) {
      return this.moveSpeed;
    }
    return this.inputState.shift ? this.moveSpeed * this.runSpeedMultiplier : this.moveSpeed;
  }

  /**
   * Check if player is running
   * @returns {boolean} True if running (shift held)
   */
  isRunning() {
    // Don't allow running when mortar hold is active or healing is active
    if (this.mortarHoldActive || this.healingActive) {
      return false;
    }
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
    // Don't allow shooting when mortar hold is active (RT is used for mortar release)
    if (this.mortarHoldActive) {
      return false;
    }
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
   * Check if mortar button is pressed (mouse right click or RB hold)
   * @returns {boolean} True if mortar button is pressed
   */
  isMortarPressed() {
    return this.inputState.mortar || this.mortarHoldPressed;
  }
  
  /**
   * Set mortar hold active state (called by GameLoop to sync toggle state)
   * @param {boolean} active - True if mortar hold mode is active
   */
  setMortarHoldActive(active) {
    this.mortarHoldActive = active;
  }
  
  /**
   * Set healing active state (called by GameLoop to sync healing state)
   * @param {boolean} active - True if healing is currently active
   */
  setHealingActive(active) {
    this.healingActive = active;
  }
  
  /**
   * Check if mortar hold button (RB) is pressed (for toggle detection)
   * @returns {boolean} True if RB is currently pressed
   */
  isMortarHoldPressed() {
    return this.mortarHoldPressed;
  }
  
  /**
   * Check if left trigger (LT) is pressed
   * @returns {boolean} True if LT is pressed
   */
  isLeftTriggerPressed() {
    return this.leftTriggerPressed;
  }
  
  /**
   * Check if right trigger (RT) is pressed
   * @returns {boolean} True if RT is pressed
   */
  isRightTriggerPressed() {
    return this.rightTriggerPressed;
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

  /**
   * Get right joystick aiming direction for smooth 360-degree aiming (screen space)
   * @returns {Object} Aiming direction with x and y components (analog, -1 to 1 range)
   */
  getAimingDirection() {
    return this.gamepadAimingVector;
  }

  /**
   * Check if right joystick is active for aiming (screen space)
   * @returns {boolean} True if right joystick is being used for aiming
   */
  isAimingActive() {
    return this._gamepadAimingActive;
  }

  /**
   * Get right joystick direction for projectile control (world space, normalized)
   * @returns {Object} Direction with x and z components (normalized, world space)
   */
  getRightJoystickDirection() {
    return this.rightJoystickDirection;
  }

  /**
   * Check if right joystick direction is active for projectile control
   * @returns {boolean} True if right joystick is being used for projectile direction
   */
  isRightJoystickDirectionActive() {
    return this._rightJoystickDirectionActive;
  }

  /**
   * Get right joystick magnitude for projectile distance scaling
   * @returns {number} Magnitude from 0 to 1 (0 = no input, 1 = fully pressed)
   */
  getRightJoystickMagnitude() {
    return this._rightJoystickMagnitude;
  }

  /**
   * Check if right joystick is actively being pushed (checks raw values directly)
   * Only returns true if in controller mode
   * @returns {boolean} True if right joystick raw values exceed dead zone and in controller mode
   */
  isRightJoystickPushed() {
    // Only check joystick if in controller mode
    if (this.inputMode !== 'controller') return false;
    if (!this.gamepad || !this.gamepadConnected) return false;
    const rightStickX = this.gamepad.axes[2];
    const rightStickY = this.gamepad.axes[3];
    const magnitude = Math.sqrt(rightStickX * rightStickX + rightStickY * rightStickY);
    return magnitude > this.gamepadDeadZone;
  }

  /**
   * Check if character swap button is pressed
   * @returns {boolean} True if character swap button is pressed
   */
  isCharacterSwapPressed() {
    return this.inputState.characterSwap;
  }

  /**
   * Check if heal button is pressed (held)
   * @returns {boolean} True if heal button is pressed
   */
  isHealPressed() {
    return this.inputState.heal;
  }

  /**
   * Check if sword swing button is pressed
   * @returns {boolean} True if sword swing button is pressed
   */
  isSwordSwingPressed() {
    return this.inputState.swordSwing;
  }

  /**
   * Check if double jump was detected
   * @returns {boolean} True if double jump was detected
   */
  isDoubleJumpDetected() {
    return this.inputState.doubleJump;
  }

  /**
   * Check if levitate key is pressed
   * @returns {boolean} True if levitate key is pressed
   */
  isLevitatePressed() {
    return this.inputState.levitate;
  }

  /**
   * Check if scoreboard button is pressed
   * @returns {boolean} True if scoreboard button is pressed
   */
  isScoreboardPressed() {
    return this.inputState.scoreboard;
  }
}

