import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getModeName, getModeImage } from './functions.js';

export const GameModeSwitcher = React.memo(function GameModeSwitcher({ options, value, onChange, gameModeManager = null }) {
  const [selectedValue, setSelectedValue] = useState(value);
  const [loadedImages, setLoadedImages] = useState(new Set());

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  // Preload all images
  useEffect(() => {
    const imagePromises = options.map((mode) => {
      const modeImage = getModeImage(mode, gameModeManager);
      if (!modeImage) return Promise.resolve();
      
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          setLoadedImages((prev) => new Set([...prev, modeImage]));
          resolve();
        };
        img.onerror = () => {
          console.warn(`Failed to load image: ${modeImage}`);
          resolve(); // Resolve anyway to not block
        };
        img.src = modeImage;
      });
    });
    
    Promise.all(imagePromises);
  }, [options, gameModeManager]);

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
  }, [options, selectedValue, handleSelect, gameModeManager, loadedImages]);

  return (
    <div className="ui__choices">
      {buttons}
    </div>
  );
});

