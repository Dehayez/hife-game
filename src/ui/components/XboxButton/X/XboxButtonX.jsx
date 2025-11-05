import React from 'react';
import './XboxButtonX.scss';

/**
 * XboxButton X Component
 * Reusable Xbox X button component
 */
export function XboxButtonX({ className = '', ...props }) {
  return (
    <div 
      className={`xbox-button xbox-button--x ${className}`}
      title="Xbox X"
      {...props}
    >
      <span className="xbox-button__label">X</span>
    </div>
  );
}




