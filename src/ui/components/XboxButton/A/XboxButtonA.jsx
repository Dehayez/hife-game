import React from 'react';
import './XboxButtonA.scss';

/**
 * XboxButton A Component
 * Reusable Xbox A button component
 */
export function XboxButtonA({ className = '', ...props }) {
  return (
    <div 
      className={`xbox-button xbox-button--a ${className}`}
      title="Xbox A"
      {...props}
    >
      <span className="xbox-button__label">A</span>
    </div>
  );
}











