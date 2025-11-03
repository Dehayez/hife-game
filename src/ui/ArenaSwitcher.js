/**
 * Arena switcher UI component
 * Allows users to switch between different arena configurations
 */
export function initArenaSwitcher(config) {
  const { mount, options, value: initialValue, onChange } = config;
  
  if (!mount) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'ui__choices';

  const buttons = new Map();
  let currentValue = initialValue;

  function createChoice(arena) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ui__choice';
    btn.setAttribute('aria-pressed', String(arena.value === initialValue));
    btn.dataset.value = arena.value;

    // Use caption for text-only choices (similar to character switcher)
    const caption = document.createElement('span');
    caption.className = 'ui__choice-caption';
    caption.textContent = arena.label;

    btn.appendChild(caption);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectValue(arena.value);
      if (onChange) {
        onChange(arena.value);
      }
    });
    
    // Prevent spacebar from activating focused button
    btn.addEventListener('keydown', (e) => {
      if (e.key === ' ') {
        e.preventDefault();
      }
    });

    return btn;
  }

  function selectValue(arenaValue) {
    currentValue = arenaValue;
    for (const [, b] of buttons) {
      const isActive = b.dataset.value === arenaValue;
      b.classList.toggle('is-active', isActive);
      b.setAttribute('aria-pressed', String(isActive));
    }
  }

  options.forEach((arena) => {
    const btn = createChoice(arena);
    if (arena.value === initialValue) {
      btn.classList.add('is-active');
    }
    buttons.set(arena.value, btn);
    wrapper.appendChild(btn);
  });

  mount.appendChild(wrapper);

  return {
    setValue(next) {
      if (buttons.has(next)) {
        selectValue(next);
      }
    }
  };
}