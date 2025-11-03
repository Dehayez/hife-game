import React from 'react';
import { createRoot } from 'react-dom/client';
import { CharacterSwitcher } from '../components/CharacterSwitcher';
import { GameModeSwitcher } from '../components/GameModeSwitcher';
import { InputModeSwitcher } from '../components/InputModeSwitcher';
import { ControlsLegend } from '../components/ControlsLegend';

// Adapter for CharacterSwitcher - maintains same API as vanilla JS version
export function initCharacterSwitcher({ mount, options, value, onChange }) {
  // Clear container before creating root
  if (mount) {
    mount.innerHTML = '';
  }
  
  const root = createRoot(mount);
  let currentValue = value;

  function renderComponent(newValue = currentValue) {
    root.render(
      <CharacterSwitcher
        options={options}
        value={newValue}
        onChange={(v) => {
          currentValue = v;
          onChange(v);
          renderComponent(v);
        }}
      />
    );
  }

  renderComponent(value);

  return {
    setValue(next) {
      if (options.includes(next)) {
        currentValue = next;
        renderComponent(next);
      }
    },
  };
}

// Adapter for GameModeSwitcher
export function initGameModeSwitcher({ mount, options, value, onChange, gameModeManager = null }) {
  // Clear container before creating root
  if (mount) {
    mount.innerHTML = '';
  }
  
  const root = createRoot(mount);
  let currentValue = value;

  function renderComponent(newValue = currentValue) {
    root.render(
      <GameModeSwitcher
        options={options}
        value={newValue}
        gameModeManager={gameModeManager}
        onChange={(v) => {
          currentValue = v;
          onChange(v);
          renderComponent(v);
        }}
      />
    );
  }

  renderComponent(value);

  return {
    setValue(next) {
      if (options.includes(next)) {
        currentValue = next;
        renderComponent(next);
      }
    },
  };
}

// Adapter for InputModeSwitcher
export function initInputModeSwitcher({ mount, options, value, onChange }) {
  // Clear container before creating root
  if (mount) {
    mount.innerHTML = '';
  }
  
  let root = createRoot(mount);
  let currentValue = value;
  let controllerAvailable = false;

  function renderComponent() {
    // Check if mount still exists
    if (!mount || !mount.parentNode) {
      return;
    }
    
    // If container was cleared (has no children), recreate root
    if (mount.children.length === 0) {
      try {
        root.unmount();
      } catch (e) {
        // Root already unmounted or invalid, ignore
      }
      mount.innerHTML = '';
      root = createRoot(mount);
    }
    
    try {
      root.render(
        <InputModeSwitcher
          options={options}
          value={currentValue}
          controllerAvailable={controllerAvailable}
          onChange={(newValue) => {
            currentValue = newValue;
            onChange(newValue);
            renderComponent();
          }}
        />
      );
    } catch (error) {
      // If render fails, container was likely cleared - recreate root
      try {
        root.unmount();
      } catch (e) {
        // Ignore
      }
      mount.innerHTML = '';
      root = createRoot(mount);
      root.render(
        <InputModeSwitcher
          options={options}
          value={currentValue}
          controllerAvailable={controllerAvailable}
          onChange={(newValue) => {
            currentValue = newValue;
            onChange(newValue);
            renderComponent();
          }}
        />
      );
    }
  }

  renderComponent();

  return {
    setValue(next) {
      if (options.includes(next) && !(next === 'controller' && !controllerAvailable)) {
        currentValue = next;
        renderComponent();
      }
    },
    setControllerAvailable(isAvailable) {
      controllerAvailable = isAvailable;
      if (!isAvailable && currentValue === 'controller') {
        currentValue = 'keyboard';
        onChange('keyboard');
      }
      renderComponent();
    },
  };
}

// Adapter for ControlsLegend
export function initControlsLegend({ mount, inputManager, gameModeManager }) {
  // Clear container before creating root
  if (mount) {
    mount.innerHTML = '';
  }
  
  let root = createRoot(mount);

  function renderComponent() {
    // Check if mount still exists
    if (!mount || !mount.parentNode) {
      return;
    }
    
    // If container was cleared (has no children), recreate root
    if (mount.children.length === 0) {
      try {
        root.unmount();
      } catch (e) {
        // Root already unmounted or invalid, ignore
      }
      mount.innerHTML = '';
      root = createRoot(mount);
    }
    
    try {
      root.render(
        <ControlsLegend inputManager={inputManager} gameModeManager={gameModeManager} />
      );
    } catch (error) {
      // If render fails, container was likely cleared - recreate root
      try {
        root.unmount();
      } catch (e) {
        // Ignore
      }
      mount.innerHTML = '';
      root = createRoot(mount);
      root.render(
        <ControlsLegend inputManager={inputManager} gameModeManager={gameModeManager} />
      );
    }
  }

  renderComponent();

  return {
    update() {
      // React component will automatically update via useEffect, but we can force a re-render if needed
      renderComponent();
    },
    destroy() {
      if (root) {
        try {
          root.unmount();
        } catch (e) {
          // Ignore unmount errors
        }
      }
    },
  };
}

