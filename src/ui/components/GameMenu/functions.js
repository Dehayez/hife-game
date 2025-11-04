import { createXboxButtonElement } from '../XboxButton/helpers.js';

export function isXboxController(gamepad) {
  if (!gamepad) return false;
  const id = gamepad.id.toLowerCase();
  return id.includes('xbox') || 
         id.includes('microsoft') ||
         id.includes('045e'); // Microsoft vendor ID
}

export function checkXboxController(inputManager, instance) {
  // Check via InputManager if available
  if (inputManager && inputManager.isGamepadConnected()) {
    const gamepads = navigator.getGamepads();
    if (gamepads && gamepads.length > 0) {
      const gamepad = gamepads[0];
      if (gamepad && isXboxController(gamepad)) {
        instance.isXboxControllerConnected = true;
        instance.updateBumperIcons();
        return;
      }
    }
  }
  
  // Fallback: check gamepads directly
  try {
    if (navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      if (gamepads && gamepads.length > 0) {
        for (let i = 0; i < gamepads.length; i++) {
          if (gamepads[i] && isXboxController(gamepads[i])) {
            instance.isXboxControllerConnected = true;
            instance.updateBumperIcons();
            return;
          }
        }
      }
    }
  } catch (e) {
    // Gamepad API may not be accessible
  }
  
  instance.isXboxControllerConnected = false;
  instance.updateBumperIcons();
}

export function updateFooterContent(footer, inputManager) {
  if (!footer) return;
  
  // Clear existing content
  footer.innerHTML = '';
  
  // Check if input mode is controller
  const inputMode = inputManager?.getInputMode() || 'keyboard';
  const isController = inputMode === 'controller';
  
  if (isController) {
    // Xbox controller commands
    const bButton = document.createElement('span');
    bButton.className = 'game-menu__footer-button game-menu__footer-button--xbox-b';
    
    const xboxButtonElement = createXboxButtonElement('B');
    if (xboxButtonElement) {
      bButton.appendChild(xboxButtonElement);
    }
    
    const backLabel = document.createElement('span');
    backLabel.className = 'game-menu__footer-label';
    backLabel.textContent = 'Back';
    
    footer.appendChild(bButton);
    footer.appendChild(backLabel);
  } else {
    // Keyboard command
    const escKey = document.createElement('span');
    escKey.className = 'game-menu__footer-button game-menu__footer-button--esc';
    escKey.textContent = 'Esc';
    
    const backLabel = document.createElement('span');
    backLabel.className = 'game-menu__footer-label';
    backLabel.textContent = 'Back';
    
    footer.appendChild(escKey);
    footer.appendChild(backLabel);
  }
}

export function updateHeaderVisibility(header, inputManager) {
  if (header) {
    const inputMode = inputManager?.getInputMode() || 'keyboard';
    if (inputMode === 'controller') {
      header.style.display = 'none';
    } else {
      header.style.display = 'flex';
    }
  }
}

export function updateBumperIcons(instance) {
  if (instance.lbIcon && instance.rbIcon) {
    const inputMode = instance.inputManager?.getInputMode() || 'keyboard';
    if (inputMode === 'controller') {
      instance.lbIcon.style.display = 'flex';
      instance.rbIcon.style.display = 'flex';
    } else {
      instance.lbIcon.style.display = 'none';
      instance.rbIcon.style.display = 'none';
    }
  }
  
  // Update trigger icons visibility
  if (instance.ltIcon && instance.rtIcon) {
    const inputMode = instance.inputManager?.getInputMode() || 'keyboard';
    if (inputMode === 'controller') {
      instance.ltIcon.style.display = 'flex';
      instance.rtIcon.style.display = 'flex';
    } else {
      instance.ltIcon.style.display = 'none';
      instance.rtIcon.style.display = 'none';
    }
  }
  
  // Also update footer content when controller state changes
  instance.updateFooterContent();
  // Also update header visibility when controller state changes
  instance.updateHeaderVisibility();
}

