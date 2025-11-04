import React from 'react';
import './scss/index.scss';

/**
 * XboxButton Y Component
 * Reusable Xbox Y button component
 */
export function XboxButtonY({ className = '', ...props }) {
  return (
    <div 
      className={`xbox-button xbox-button--y ${className}`}
      title="Xbox Y"
      {...props}
    >
      <span className="xbox-button__label">Y</span>
    </div>
  );
}

