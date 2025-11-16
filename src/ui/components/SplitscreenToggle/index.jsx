import React, { useState, useCallback } from 'react';
import { enableSplitscreen, disableSplitscreen, isSplitscreenEnabled } from '../../../core/systems/splitscreen/SplitscreenHelper.js';

export const SplitscreenToggle = React.memo(function SplitscreenToggle({ managers, inputManager }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [playerCount, setPlayerCount] = useState(2);

  const handleToggle = useCallback(async () => {
    if (isEnabled) {
      disableSplitscreen(managers);
      setIsEnabled(false);
    } else {
      // Check if we have enough gamepads for splitscreen
      const gamepadCount = inputManager ? inputManager.getConnectedGamepadCount() : 0;
      const requiredGamepads = playerCount - 1; // Player 1 uses keyboard
      
      if (requiredGamepads > gamepadCount) {
        alert(`Splitscreen requires ${requiredGamepads} gamepad(s) connected. Currently ${gamepadCount} gamepad(s) connected.`);
        return;
      }

      const characterNames = ['lucy', 'herald', 'lucy', 'herald'].slice(0, playerCount);
      const success = await enableSplitscreen(managers, playerCount, 'horizontal', characterNames);
      
      if (success) {
        setIsEnabled(true);
      } else {
        alert('Failed to enable splitscreen mode.');
      }
    }
  }, [isEnabled, playerCount, managers, inputManager]);

  const handlePlayerCountChange = useCallback((count) => {
    setPlayerCount(count);
    if (isEnabled) {
      // Disable and re-enable with new count
      disableSplitscreen(managers);
      setIsEnabled(false);
    }
  }, [isEnabled, managers]);

  return (
    <div className="ui__splitscreen-toggle">
      <div className="ui__section">
        <h3 className="ui__section-title">Splitscreen</h3>
        <div className="ui__choices">
          <button
            type="button"
            className={`ui__choice ${isEnabled ? 'is-active' : ''}`}
            onClick={handleToggle}
          >
            <span className="ui__choice-caption">{isEnabled ? 'Disable' : 'Enable'}</span>
          </button>
        </div>
        {!isEnabled && (
          <div className="ui__choices" style={{ marginTop: '10px' }}>
            <label className="ui__label">Player Count:</label>
            {[2, 3, 4].map((count) => (
              <button
                key={count}
                type="button"
                className={`ui__choice ${playerCount === count ? 'is-active' : ''}`}
                onClick={() => handlePlayerCountChange(count)}
              >
                <span className="ui__choice-caption">{count}</span>
              </button>
            ))}
          </div>
        )}
        {isEnabled && (
          <div className="ui__info" style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
            Splitscreen mode active ({playerCount} players)
          </div>
        )}
      </div>
    </div>
  );
});










