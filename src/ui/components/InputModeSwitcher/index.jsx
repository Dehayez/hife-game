import React, { useState, useEffect } from 'react';
import { getModeDisplayName } from './functions.js';

export function InputModeSwitcher({ options, value, onChange, controllerAvailable = false }) {
  const [selectedValue, setSelectedValue] = useState(value);

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  useEffect(() => {
    if (!controllerAvailable && selectedValue === 'controller') {
      setSelectedValue('keyboard');
    }
  }, [controllerAvailable, selectedValue]);

  const handleSelect = (mode) => {
    if (mode === 'controller' && !controllerAvailable) {
      return;
    }
    setSelectedValue(mode);
    onChange(mode);
  };

  return (
    <div className="ui__choices">
      {options.map((mode) => {
        const isActive = mode === selectedValue;
        const isDisabled = mode === 'controller' && !controllerAvailable;

        return (
          <button
            key={mode}
            type="button"
            className={`ui__choice ${isActive ? 'is-active' : ''} ${isDisabled ? 'is-disabled' : ''}`}
            aria-pressed={isActive}
            disabled={isDisabled}
            onClick={() => handleSelect(mode)}
            onKeyDown={(e) => {
              if (e.key === ' ') {
                e.preventDefault();
              }
            }}
            style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            <span className="ui__choice-icon" style={{ fontSize: '24px', display: 'block', lineHeight: '1' }}>
              {mode === 'keyboard' ? '⌨️' : '🎮'}
            </span>
            <span className="ui__choice-caption">{getModeDisplayName(mode)}</span>
          </button>
        );
      })}
    </div>
  );
}

