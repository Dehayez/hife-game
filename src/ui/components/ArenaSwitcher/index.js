/**
 * Arena switcher UI component
 * Allows users to switch between different arena configurations
 */

import { createChoice, selectValue as selectValueFunc } from './functions.js';

export function initArenaSwitcher(config) {
  const { mount, options, value: initialValue, onChange } = config;
  
  if (!mount) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'ui__choices';

  const buttons = new Map();
  let currentValue = initialValue;

  function selectValue(arenaValue) {
    currentValue = selectValueFunc(arenaValue, buttons, currentValue);
  }

  options.forEach((arena) => {
    const btn = createChoice(arena, initialValue, selectValue, onChange);
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

