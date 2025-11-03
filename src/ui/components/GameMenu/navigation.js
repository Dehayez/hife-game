export function handleJoystickNavigation(direction, instance) {
  // Get all focusable elements in current panel
  const focusableElements = instance.getFocusableElements();
  if (focusableElements.length === 0) return;

  // Find current focused element
  const currentFocused = document.activeElement;
  let currentIndex = Array.from(focusableElements).indexOf(currentFocused);
  
  // If nothing focused, start at first element
  if (currentIndex === -1) {
    currentIndex = 0;
    focusableElements[0]?.focus();
    instance.highlightElement(focusableElements[0]);
    return;
  }

  // Get bounding rectangle of current element
  const currentRect = focusableElements[currentIndex].getBoundingClientRect();
  const currentCenterX = currentRect.left + currentRect.width / 2;
  const currentCenterY = currentRect.top + currentRect.height / 2;

  let bestElement = null;
  let bestDistance = Infinity;

  // Find the closest element in the specified direction
  for (let i = 0; i < focusableElements.length; i++) {
    if (i === currentIndex) continue;

    const rect = focusableElements[i].getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let isInDirection = false;
    let distance = 0;

    switch (direction) {
      case 'down':
        // Element must be below (higher Y) and horizontally aligned
        isInDirection = centerY > currentCenterY && 
                       Math.abs(centerX - currentCenterX) < Math.max(rect.width, currentRect.width);
        if (isInDirection) {
          // Prefer closest vertically, then closest horizontally
          distance = (centerY - currentCenterY) + Math.abs(centerX - currentCenterX) * 0.1;
        }
        break;
      case 'up':
        // Element must be above (lower Y) and horizontally aligned
        isInDirection = centerY < currentCenterY && 
                       Math.abs(centerX - currentCenterX) < Math.max(rect.width, currentRect.width);
        if (isInDirection) {
          distance = (currentCenterY - centerY) + Math.abs(centerX - currentCenterX) * 0.1;
        }
        break;
      case 'right':
        // Element must be to the right (higher X) and vertically aligned
        isInDirection = centerX > currentCenterX && 
                       Math.abs(centerY - currentCenterY) < Math.max(rect.height, currentRect.height);
        if (isInDirection) {
          distance = (centerX - currentCenterX) + Math.abs(centerY - currentCenterY) * 0.1;
        }
        break;
      case 'left':
        // Element must be to the left (lower X) and vertically aligned
        isInDirection = centerX < currentCenterX && 
                       Math.abs(centerY - currentCenterY) < Math.max(rect.height, currentRect.height);
        if (isInDirection) {
          distance = (currentCenterX - centerX) + Math.abs(centerY - currentCenterY) * 0.1;
        }
        break;
    }

    if (isInDirection && distance < bestDistance) {
      bestDistance = distance;
      bestElement = focusableElements[i];
    }
  }

  // If no element found in that direction, stop (don't wrap)
  if (!bestElement) return;

  // Focus the best element
  bestElement.focus();
  instance.highlightElement(bestElement);
}

export function handleControllerInput(instance) {
  // Only process controller input when input mode is controller
  const inputMode = instance.inputManager?.getInputMode() || 'keyboard';
  if (inputMode !== 'controller') return;
  
  const gamepads = navigator.getGamepads();
  if (!gamepads || gamepads.length === 0) return;
  
  const gamepad = gamepads[0]; // Use first connected gamepad
  if (!gamepad) return;

  // Only process navigation and button presses when menu is open
  if (!instance.isVisible) return;

  // A button (0) - Activate focused element when menu is open
  if (gamepad.buttons[0]?.pressed) {
    if (!instance.controllerNavigation.buttonPressed.has(0)) {
      instance.controllerNavigation.buttonPressed.add(0);
      instance.activateFocusedElement();
    }
  } else {
    instance.controllerNavigation.buttonPressed.delete(0);
  }

  // B button (1) - Close menu if open
  if (gamepad.buttons[1]?.pressed) {
    if (!instance.controllerNavigation.buttonPressed.has(1)) {
      instance.controllerNavigation.buttonPressed.add(1);
      if (instance.isVisible) {
        instance.toggle();
      }
    }
  } else {
    instance.controllerNavigation.buttonPressed.delete(1);
  }

  // Back button (8) - Close menu if open
  if (gamepad.buttons[8]?.pressed) {
    if (!instance.controllerNavigation.buttonPressed.has(8)) {
      instance.controllerNavigation.buttonPressed.add(8);
      if (instance.isVisible) {
        instance.toggle();
      }
    }
  } else {
    instance.controllerNavigation.buttonPressed.delete(8);
  }

  // Left Bumper (4) - Navigate tabs left
  if (gamepad.buttons[4]?.pressed) {
    if (!instance.controllerNavigation.buttonPressed.has(4)) {
      instance.controllerNavigation.buttonPressed.add(4);
      instance.navigateTab('left');
      setTimeout(() => {
        instance.controllerNavigation.buttonPressed.delete(4);
      }, 300);
    }
  }

  // Right Bumper (5) - Navigate tabs right
  if (gamepad.buttons[5]?.pressed) {
    if (!instance.controllerNavigation.buttonPressed.has(5)) {
      instance.controllerNavigation.buttonPressed.add(5);
      instance.navigateTab('right');
      setTimeout(() => {
        instance.controllerNavigation.buttonPressed.delete(5);
      }, 300);
    }
  }

  // Left Trigger (6) - Navigate sections left
  const leftTrigger = gamepad.buttons[6]?.pressed || (gamepad.axes && gamepad.axes[2] && gamepad.axes[2] > 0.5);
  if (leftTrigger) {
    if (!instance.controllerNavigation.buttonPressed.has('lt')) {
      instance.controllerNavigation.buttonPressed.add('lt');
      instance.navigateSection('left');
      setTimeout(() => {
        instance.controllerNavigation.buttonPressed.delete('lt');
      }, 300);
    }
  } else {
    instance.controllerNavigation.buttonPressed.delete('lt');
  }

  // Right Trigger (7) - Navigate sections right
  const rightTrigger = gamepad.buttons[7]?.pressed || (gamepad.axes && gamepad.axes[5] && gamepad.axes[5] > 0.5);
  if (rightTrigger) {
    if (!instance.controllerNavigation.buttonPressed.has('rt')) {
      instance.controllerNavigation.buttonPressed.add('rt');
      instance.navigateSection('right');
      setTimeout(() => {
        instance.controllerNavigation.buttonPressed.delete('rt');
      }, 300);
    }
  } else {
    instance.controllerNavigation.buttonPressed.delete('rt');
  }

  // Left joystick navigation (for menu items)
  const leftStickX = gamepad.axes[0] || 0;
  const leftStickY = gamepad.axes[1] || 0;
  const stickThreshold = 0.5;
  
  if (Math.abs(leftStickX) > stickThreshold || Math.abs(leftStickY) > stickThreshold) {
    const direction = Math.abs(leftStickX) > Math.abs(leftStickY) 
      ? (leftStickX > 0 ? 'right' : 'left')
      : (leftStickY > 0 ? 'down' : 'up');
    
    const stickKey = `stick-${direction}`;
    if (!instance.controllerNavigation.buttonPressed.has(stickKey)) {
      instance.controllerNavigation.buttonPressed.add(stickKey);
      handleJoystickNavigation(direction, instance);
      setTimeout(() => {
        instance.controllerNavigation.buttonPressed.delete(stickKey);
      }, 200);
    }
  }

  // D-pad navigation (for menu items)
  let dpadX = 0;
  let dpadY = 0;
  
  // Check D-pad buttons (12-15: up, down, left, right)
  if (gamepad.buttons[12]?.pressed) dpadY = -1;
  if (gamepad.buttons[13]?.pressed) dpadY = 1;
  if (gamepad.buttons[14]?.pressed) dpadX = -1;
  if (gamepad.buttons[15]?.pressed) dpadX = 1;
  
  // Fallback to axes if buttons don't work
  if (gamepad.axes && gamepad.axes.length >= 8) {
    const dpadAxisH = gamepad.axes[6] || 0;
    const dpadAxisV = gamepad.axes[7] || 0;
    if (Math.abs(dpadAxisH) > 0.5) dpadX = dpadAxisH > 0 ? 1 : -1;
    if (Math.abs(dpadAxisV) > 0.5) dpadY = dpadAxisV > 0 ? 1 : -1;
  }
  
  if (dpadX !== 0 || dpadY !== 0) {
    const direction = dpadY !== 0 
      ? (dpadY > 0 ? 'down' : 'up')
      : (dpadX > 0 ? 'right' : 'left');
    
    const dpadKey = `dpad-${direction}`;
    if (!instance.controllerNavigation.buttonPressed.has(dpadKey)) {
      instance.controllerNavigation.buttonPressed.add(dpadKey);
      handleJoystickNavigation(direction, instance);
      setTimeout(() => {
        instance.controllerNavigation.buttonPressed.delete(dpadKey);
      }, 200);
    }
  } else {
    ['dpad-up', 'dpad-down', 'dpad-left', 'dpad-right'].forEach(key => {
      instance.controllerNavigation.buttonPressed.delete(key);
    });
  }
}

