export function initInputModeSwitcher({ mount, options, value, onChange }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui__choices';

  const buttons = new Map();
  let controllerAvailable = false;

  function getModeDisplayName(mode) {
    const names = {
      keyboard: 'Keyboard & Mouse',
      controller: 'Controller'
    };
    return names[mode] || mode;
  }

  function createChoice(mode) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ui__choice';
    btn.setAttribute('aria-pressed', String(mode === value));
    btn.dataset.mode = mode;

    const icon = document.createElement('span');
    icon.className = 'ui__choice-icon';
    icon.textContent = mode === 'keyboard' ? '⌨️' : '🎮';
    icon.style.fontSize = '24px';
    icon.style.display = 'block';
    icon.style.lineHeight = '1';

    const caption = document.createElement('span');
    caption.className = 'ui__choice-caption';
    caption.textContent = getModeDisplayName(mode);

    btn.appendChild(icon);
    btn.appendChild(caption);

    btn.addEventListener('click', () => {
      // Prevent switching to controller mode if not available
      if (mode === 'controller' && !controllerAvailable) {
        return;
      }
      selectValue(mode);
      onChange(mode);
    });
    
    // Prevent spacebar from activating focused button
    btn.addEventListener('keydown', (e) => {
      if (e.key === ' ') {
        e.preventDefault();
      }
    });

    return btn;
  }

  function selectValue(mode) {
    value = mode;
    for (const [, b] of buttons) {
      const isActive = b.dataset.mode === mode;
      b.classList.toggle('is-active', isActive);
      b.setAttribute('aria-pressed', String(isActive));
    }
  }

  function updateControllerAvailability(isAvailable) {
    controllerAvailable = isAvailable;
    const controllerBtn = buttons.get('controller');
    if (controllerBtn) {
      if (isAvailable) {
        controllerBtn.disabled = false;
        controllerBtn.classList.remove('is-disabled');
        controllerBtn.style.opacity = '1';
        controllerBtn.style.cursor = 'pointer';
      } else {
        controllerBtn.disabled = true;
        controllerBtn.classList.add('is-disabled');
        controllerBtn.style.opacity = '0.5';
        controllerBtn.style.cursor = 'not-allowed';
        
        // If currently selected and controller becomes unavailable, switch to keyboard
        // Note: The actual mode switch is handled by InputManager and main.js callback
        // We just update the UI visual state here
        if (value === 'controller') {
          selectValue('keyboard');
        }
      }
    }
  }

  options.forEach((mode) => {
    const btn = createChoice(mode);
    if (mode === value) btn.classList.add('is-active');
    
    // Initially disable controller if not available
    if (mode === 'controller' && !controllerAvailable) {
      btn.disabled = true;
      btn.classList.add('is-disabled');
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
    }
    
    buttons.set(mode, btn);
    wrapper.appendChild(btn);
  });

  mount.appendChild(wrapper);

  return {
    setValue(next) {
      if (buttons.has(next)) {
        // Prevent switching to controller if not available
        if (next === 'controller' && !controllerAvailable) {
          return;
        }
        selectValue(next);
      }
    },
    setControllerAvailable(isAvailable) {
      updateControllerAvailability(isAvailable);
    }
  };
}

