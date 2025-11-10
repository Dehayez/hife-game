/**
 * Get arena image path
 * @param {string} arenaKey - Arena key ('standard' or 'large')
 * @returns {string|null} Image path or null if not found
 */
export function getArenaImage(arenaKey) {
  if (!arenaKey) return null;
  
  // Map arena keys to image filenames
  const imageMap = {
    'standard': '/assets/arenas/forest-plaza.png',
    'large': '/assets/arenas/ancient grove.png'
  };
  
  return imageMap[arenaKey] || null;
}

export function createChoice(arena, initialValue, selectValue, onChange) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ui__choice';
  btn.setAttribute('aria-pressed', String(arena.value === initialValue));
  btn.dataset.value = arena.value;

  // Set background image if available
  const arenaImage = arena.image || getArenaImage(arena.value);
  if (arenaImage) {
    // Encode URL to handle spaces and special characters
    const encodedImage = encodeURI(arenaImage);
    btn.style.backgroundImage = `url("${encodedImage}")`;
    btn.style.backgroundSize = 'cover';
    btn.style.backgroundPosition = 'center';
    btn.style.backgroundRepeat = 'no-repeat';
  }

  // Use caption for text overlay
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

