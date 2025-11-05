import React, { useState, useEffect, useMemo } from 'react';
import { getCharacterColorValues } from '../../../config/abilities/CharacterColors.js';
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

  // Memoize character options to prevent unnecessary re-renders
  const characterButtons = useMemo(() => {
    return options.map((name) => {
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
            loading="lazy"
          />
          <span className="ui__choice-caption">{toTitleCase(name)}</span>
        </button>
      );
    });
  }, [options, selectedValue]);

  return (
    <div className="ui__choices">
      {characterButtons}
    </div>
  );
}

