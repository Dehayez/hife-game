import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getModeName, getModeImage } from './functions.js';

export const GameModeSwitcher = React.memo(function GameModeSwitcher({ options, value, onChange, gameModeManager = null }) {
  const [selectedValue, setSelectedValue] = useState(value);

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  const handleSelect = useCallback((mode) => {
    setSelectedValue(mode);
    onChange(mode);
  }, [onChange]);

  const buttons = useMemo(() => {
    return options.map((mode) => {
      const isActive = mode === selectedValue;
      const modeImage = getModeImage(mode, gameModeManager);
      const modeName = getModeName(mode, gameModeManager);
      const buttonStyle = modeImage ? {
        backgroundImage: `url("${encodeURI(modeImage)}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      } : {};
      return (
        <button
          key={mode}
          type="button"
          className={`ui__choice ${isActive ? 'is-active' : ''}`}
          aria-pressed={isActive}
          onClick={() => handleSelect(mode)}
          style={buttonStyle}
          onKeyDown={(e) => {
            if (e.key === ' ') {
              e.preventDefault();
            }
          }}
        >
          <span className="ui__choice-caption">{modeName}</span>
        </button>
      );
    });
  }, [options, selectedValue, handleSelect, gameModeManager]);

  return (
    <div className="ui__choices">
      {buttons}
    </div>
  );
});

