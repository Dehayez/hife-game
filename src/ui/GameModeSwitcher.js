export function initGameModeSwitcher({ mount, options, value, onChange }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui__choices';

  const buttons = new Map();

  function toTitleCase(str) {
    if (!str) return str;
    return str.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  function createChoice(mode) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ui__choice';
    btn.setAttribute('aria-pressed', String(mode === value));
    btn.dataset.mode = mode;

    const caption = document.createElement('span');
    caption.className = 'ui__choice-caption';
    caption.textContent = toTitleCase(mode);

    btn.appendChild(caption);

    btn.addEventListener('click', () => {
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

  options.forEach((mode) => {
    const btn = createChoice(mode);
    if (mode === value) btn.classList.add('is-active');
    buttons.set(mode, btn);
    wrapper.appendChild(btn);
  });

  mount.appendChild(wrapper);

  return {
    setValue(next) {
      if (buttons.has(next)) selectValue(next);
    }
  };
}

