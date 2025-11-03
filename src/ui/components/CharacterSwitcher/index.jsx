import React, { useState, useEffect } from 'react';
import { getCharacterColorValues } from '../../../core/systems/abilities/config/CharacterColors.js';
import { toTitleCase } from './functions.js';

export function CharacterSwitcher({ options, value, onChange }) {
  const [selectedValue, setSelectedValue] = useState(value);

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  const handleSelect = (name) => {
    setSelectedValue(name);
    onChange(name);
  };

  return (
    <div className="ui__choices">
      {options.map((name) => {
        const isActive = name === selectedValue;
        const colorValues = isActive ? getCharacterColorValues(name) : null;

        return (
          <button
            key={name}
            type="button"
            className={`ui__choice ${isActive ? 'is-active' : ''}`}
            aria-pressed={isActive}
            onClick={() => handleSelect(name)}
            onKeyDown={(e) => {
              if (e.key === ' ') {
                e.preventDefault();
              }
            }}
            style={
              isActive && colorValues
                ? {
                    '--character-active-color': colorValues.color,
                    '--character-active-color-rgb': colorValues.rgb,
                  }
                : {}
            }
          >
            <img
              className="ui__choice-img"
              alt={name}
              src={`/assets/characters/${name}/idle_front.png`}
            />
            <span className="ui__choice-caption">{toTitleCase(name)}</span>
          </button>
        );
      })}
    </div>
  );
}

