import { createControllerButton } from '../XboxButton/helpers.js';

const GENERIC_TYPE = 'generic';

function detectControllerType(gamepad) {
  if (!gamepad || !gamepad.id) return GENERIC_TYPE;
  const id = gamepad.id.toLowerCase();

  if (id.includes('xbox') ||
      id.includes('microsoft') ||
      id.includes('045e') ||
      id.includes('xinput')) {
    return 'xbox';
  }

  if (id.includes('playstation') ||
      id.includes('dualshock') ||
      id.includes('dualsense') ||
      id.includes('ps5') ||
      id.includes('ps4') ||
      id.includes('sony') ||
      id.includes('054c') ||
      id.includes('0ce6') ||
      (id.includes('wireless controller') && id.includes('054c'))) {
    return 'playstation';
  }

  return GENERIC_TYPE;
}

function getConnectedGamepads() {
  try {
    if (navigator.getGamepads) {
      return navigator.getGamepads() || [];
    }
  } catch (e) {
    // Gamepad API may not be accessible yet
  }
  return [];
}

export function checkControllerType(inputManager, instance) {
  let controllerType = GENERIC_TYPE;
  let controllerConnected = false;

  if (inputManager && typeof inputManager.isGamepadConnected === 'function' && inputManager.isGamepadConnected()) {
    controllerConnected = true;
    if (typeof inputManager.getControllerType === 'function') {
      controllerType = inputManager.getControllerType() || GENERIC_TYPE;
    }
  }

  if (!controllerConnected) {
    const gamepads = getConnectedGamepads();
    for (const gamepad of gamepads) {
      if (gamepad) {
        controllerConnected = true;
        controllerType = detectControllerType(gamepad);
        if (controllerType !== GENERIC_TYPE) break;
      }
    }
  }

  const prevType = instance.controllerType;
  const prevConnected = instance.isControllerConnected;

  instance.isControllerConnected = controllerConnected;
  instance.controllerType = controllerType;

  if (prevType !== controllerType || prevConnected !== controllerConnected) {
    instance.updateBumperIcons();
  }
}

export function updateFooterContent(footer, inputManager, controllerType = 'xbox') {
  if (!footer) return;
  
  // Clear existing content
  footer.innerHTML = '';
  
  // Check if input mode is controller
  const inputMode = inputManager?.getInputMode() || 'keyboard';
  const isController = inputMode === 'controller';
  const resolvedType = controllerType === GENERIC_TYPE ? 'xbox' : controllerType;
  
  if (isController) {
    // Controller commands (Back equivalent)
    const bButton = document.createElement('span');
    bButton.className = 'game-menu__footer-button game-menu__footer-button--controller';

    const buttonElement = createControllerButton('B', { controllerType: resolvedType });
    if (buttonElement) {
      bButton.appendChild(buttonElement);
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
  const inputMode = instance.inputManager?.getInputMode() || 'keyboard';
  const resolvedType = instance.controllerType === GENERIC_TYPE ? 'xbox' : instance.controllerType;

  if (instance.lbIcon && instance.rbIcon) {
    if (inputMode === 'controller') {
      instance.lbIcon.style.display = 'flex';
      instance.rbIcon.style.display = 'flex';
      instance.lbIcon.innerHTML = '';
      instance.rbIcon.innerHTML = '';
      const leftElement = createControllerButton('LB', { controllerType: resolvedType });
      const rightElement = createControllerButton('RB', { controllerType: resolvedType });
      if (leftElement) instance.lbIcon.appendChild(leftElement);
      if (rightElement) instance.rbIcon.appendChild(rightElement);
    } else {
      instance.lbIcon.style.display = 'none';
      instance.rbIcon.style.display = 'none';
      instance.lbIcon.innerHTML = '';
      instance.rbIcon.innerHTML = '';
    }
  }
  
  // Update trigger icons visibility
  if (instance.ltIcon && instance.rtIcon) {
    if (inputMode === 'controller') {
      instance.ltIcon.style.display = 'flex';
      instance.rtIcon.style.display = 'flex';
      instance.ltIcon.innerHTML = '';
      instance.rtIcon.innerHTML = '';
      const ltElement = createControllerButton('LT', { controllerType: resolvedType });
      const rtElement = createControllerButton('RT', { controllerType: resolvedType });
      if (ltElement) instance.ltIcon.appendChild(ltElement);
      if (rtElement) instance.rtIcon.appendChild(rtElement);
    } else {
      instance.ltIcon.style.display = 'none';
      instance.rtIcon.style.display = 'none';
      instance.ltIcon.innerHTML = '';
      instance.rtIcon.innerHTML = '';
    }
  }
  
  // Also update footer content when controller state changes
  instance.updateFooterContent();
  // Also update header visibility when controller state changes
  instance.updateHeaderVisibility();
}

