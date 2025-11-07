import React, { useState, useEffect } from 'react';
import { KeyboardControls } from './KeyboardControls.jsx';
import { ControllerControls } from './ControllerControls.jsx';

export function ControlsLegend({ inputManager, gameModeManager }) {
  const [inputMode, setInputMode] = useState(() => inputManager?.getInputMode() || 'keyboard');
  const [gameMode, setGameMode] = useState(() => gameModeManager?.getMode() || 'free-play');
  const [controllerType, setControllerType] = useState(() => inputManager?.getControllerType?.() || 'generic');

  useEffect(() => {
    const updateFromManagers = () => {
      if (inputManager) {
        setInputMode(inputManager.getInputMode());
        if (typeof inputManager.getControllerType === 'function') {
          setControllerType(inputManager.getControllerType() || 'generic');
        }
      }
      if (gameModeManager) {
        setGameMode(gameModeManager.getMode());
      }
    };

    // Initial update
    updateFromManagers();

    // Set up interval to check for changes (since managers don't emit events)
    const interval = setInterval(updateFromManagers, 100);

    return () => clearInterval(interval);
  }, [inputManager, gameModeManager]);

  const isShootingMode = gameMode === 'shooting';

  return (
    <div className="ui__legend-panel">
      <div className="ui__legend-content">
        {inputMode === 'controller' ? (
          <ControllerControls isShootingMode={isShootingMode} controllerType={controllerType} />
        ) : (
          <KeyboardControls isShootingMode={isShootingMode} />
        )}
      </div>
    </div>
  );
}

