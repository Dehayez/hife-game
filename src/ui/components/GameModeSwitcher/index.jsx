import React, { useState, useEffect } from 'react';
import { getModeName } from './functions.js';

export function GameModeSwitcher({ options, value, onChange, gameModeManager = null }) {
  const [selectedValue, setSelectedValue] = useState(value);

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  const handleSelect = (mode) => {
    setSelectedValue(mode);
    onChange(mode);
  };

  return (
    <div className="ui__choices">
      {options.map((mode) => {
        const isActive = mode === selectedValue;
        return (
          <button
            key={mode}
            type="button"
            className={`ui__choice ${isActive ? 'is-active' : ''}`}
            aria-pressed={isActive}
            onClick={() => handleSelect(mode)}
            onKeyDown={(e) => {
              if (e.key === ' ') {
                e.preventDefault();
              }
            }}
          >
            <span className="ui__choice-caption">{getModeName(mode, gameModeManager)}</span>
          </button>
        );
      })}
    </div>
  );
}

