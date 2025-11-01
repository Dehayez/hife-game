/**
 * Arena switcher UI component
 * Allows users to switch between different arena configurations
 */
export function initArenaSwitcher(config) {
  const { mount, options, value, onChange } = config;
  
  if (!mount) {
    return;
  }

  // Create dropdown UI
  const container = document.createElement('div');
  container.className = 'ui__control';
  
  const select = document.createElement('select');
  select.className = 'ui__select';
  select.id = 'arena-select';
  
  // Add options
  options.forEach(arena => {
    const option = document.createElement('option');
    option.value = arena.value;
    option.textContent = arena.label;
    option.selected = arena.value === value;
    select.appendChild(option);
  });
  
  // Handle change
  select.addEventListener('change', (e) => {
    onChange(e.target.value);
  });
  
  container.appendChild(select);
  mount.appendChild(container);
}

