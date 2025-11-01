export function initCharacterSwitcher({ mount, options, value, onChange }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui__choices';

  const buttons = new Map();

  function toTitleCase(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get character color values for UI styling
   * @param {string} characterName - Character name ('lucy' or 'herald')
   * @returns {{color: string, rgb: string}} Color hex and RGB values
   */
  function getCharacterColorValues(characterName) {
    if (characterName === 'lucy') {
      return { color: '#9c57b6', rgb: '156, 87, 182' };
    } else if (characterName === 'herald') {
      return { color: '#f5ba0b', rgb: '245, 186, 11' };
    }
    // Default fallback
    return { color: '#9c57b6', rgb: '156, 87, 182' };
  }

  function createChoice(name) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ui__choice';
    btn.setAttribute('aria-pressed', String(name === value));
    btn.dataset.name = name;

    const img = document.createElement('img');
    img.className = 'ui__choice-img';
    img.alt = name;
    img.src = `/assets/characters/${name}/idle_front.png`;

    const caption = document.createElement('span');
    caption.className = 'ui__choice-caption';
    caption.textContent = toTitleCase(name);

    btn.appendChild(img);
    btn.appendChild(caption);

    btn.addEventListener('click', () => {
      selectValue(name);
      onChange(name);
    });
    
    // Prevent spacebar from activating focused button
    btn.addEventListener('keydown', (e) => {
      if (e.key === ' ') {
        e.preventDefault();
      }
    });

    return btn;
  }

  function selectValue(name) {
    value = name;
    for (const [, b] of buttons) {
      const isActive = b.dataset.name === name;
      b.classList.toggle('is-active', isActive);
      b.setAttribute('aria-pressed', String(isActive));
      
      // Set character-specific color for active border
      if (isActive) {
        const colorValues = getCharacterColorValues(name);
        b.style.setProperty('--character-active-color', colorValues.color);
        b.style.setProperty('--character-active-color-rgb', colorValues.rgb);
      } else {
        // Clear character color styles when not active
        b.style.removeProperty('--character-active-color');
        b.style.removeProperty('--character-active-color-rgb');
      }
    }
  }

  options.forEach((name) => {
    const btn = createChoice(name);
    if (name === value) {
      btn.classList.add('is-active');
      // Set character-specific color for initial active state
      const colorValues = getCharacterColorValues(name);
      btn.style.setProperty('--character-active-color', colorValues.color);
      btn.style.setProperty('--character-active-color-rgb', colorValues.rgb);
    }
    buttons.set(name, btn);
    wrapper.appendChild(btn);
  });

  mount.appendChild(wrapper);

  return {
    setValue(next) {
      if (buttons.has(next)) selectValue(next);
    }
  };
}


