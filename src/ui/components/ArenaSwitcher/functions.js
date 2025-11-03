export function createChoice(arena, initialValue, selectValue, onChange) {
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

export function selectValue(arenaValue, buttons, currentValue) {
  currentValue = arenaValue;
  for (const [, b] of buttons) {
    const isActive = b.dataset.value === arenaValue;
    b.classList.toggle('is-active', isActive);
    b.setAttribute('aria-pressed', String(isActive));
  }
  return currentValue;
}

