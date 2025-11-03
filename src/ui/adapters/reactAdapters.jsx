import React from 'react';
import { createRoot } from 'react-dom/client';
import { CharacterSwitcher } from '../components/CharacterSwitcher';
import { GameModeSwitcher } from '../components/GameModeSwitcher';
import { InputModeSwitcher } from '../components/InputModeSwitcher';
import { ControlsLegend } from '../components/ControlsLegend';

// Adapter for CharacterSwitcher - maintains same API as vanilla JS version
export function initCharacterSwitcher({ mount, options, value, onChange }) {
  const root = createRoot(mount);
  let currentValue = value;

  root.render(
    <CharacterSwitcher
      options={options}
      value={value}
      onChange={(newValue) => {
        currentValue = newValue;
        onChange(newValue);
        root.render(
          <CharacterSwitcher
            options={options}
            value={currentValue}
            onChange={(v) => {
              currentValue = v;
              onChange(v);
              root.render(
                <CharacterSwitcher
                  options={options}
                  value={currentValue}
                  onChange={onChange}
                />
              );
            }}
          />
        );
      }}
    />
  );

  return {
    setValue(next) {
      if (options.includes(next)) {
        currentValue = next;
        root.render(
          <CharacterSwitcher
            options={options}
            value={currentValue}
            onChange={(v) => {
              currentValue = v;
              onChange(v);
              root.render(
                <CharacterSwitcher
                  options={options}
                  value={currentValue}
                  onChange={onChange}
                />
              );
            }}
          />
        );
      }
    },
  };
}

// Adapter for GameModeSwitcher
export function initGameModeSwitcher({ mount, options, value, onChange, gameModeManager = null }) {
  const root = createRoot(mount);
  let currentValue = value;

  root.render(
    <GameModeSwitcher
      options={options}
      value={value}
      gameModeManager={gameModeManager}
      onChange={(newValue) => {
        currentValue = newValue;
        onChange(newValue);
        root.render(
          <GameModeSwitcher
            options={options}
            value={currentValue}
            gameModeManager={gameModeManager}
            onChange={(v) => {
              currentValue = v;
              onChange(v);
              root.render(
                <GameModeSwitcher
                  options={options}
                  value={currentValue}
                  gameModeManager={gameModeManager}
                  onChange={onChange}
                />
              );
            }}
          />
        );
      }}
    />
  );

  return {
    setValue(next) {
      if (options.includes(next)) {
        currentValue = next;
        root.render(
          <GameModeSwitcher
            options={options}
            value={currentValue}
            gameModeManager={gameModeManager}
            onChange={(v) => {
              currentValue = v;
              onChange(v);
              root.render(
                <GameModeSwitcher
                  options={options}
                  value={currentValue}
                  gameModeManager={gameModeManager}
                  onChange={onChange}
                />
              );
            }}
          />
        );
      }
    },
  };
}

// Adapter for InputModeSwitcher
export function initInputModeSwitcher({ mount, options, value, onChange }) {
  const root = createRoot(mount);
  let currentValue = value;
  let controllerAvailable = false;

  function render() {
    root.render(
      <InputModeSwitcher
        options={options}
        value={currentValue}
        controllerAvailable={controllerAvailable}
        onChange={(newValue) => {
          currentValue = newValue;
          onChange(newValue);
          render();
        }}
      />
    );
  }

  render();

  return {
    setValue(next) {
      if (options.includes(next) && !(next === 'controller' && !controllerAvailable)) {
        currentValue = next;
        render();
      }
    },
    setControllerAvailable(isAvailable) {
      controllerAvailable = isAvailable;
      if (!isAvailable && currentValue === 'controller') {
        currentValue = 'keyboard';
        onChange('keyboard');
      }
      render();
    },
  };
}

// Adapter for ControlsLegend
export function initControlsLegend({ mount, inputManager, gameModeManager }) {
  const root = createRoot(mount);

  root.render(
    <ControlsLegend inputManager={inputManager} gameModeManager={gameModeManager} />
  );

  return {
    update() {
      // React component will automatically update via useEffect
      root.render(
        <ControlsLegend inputManager={inputManager} gameModeManager={gameModeManager} />
      );
    },
    destroy() {
      root.unmount();
    },
  };
}

