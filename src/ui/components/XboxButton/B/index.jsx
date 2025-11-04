import React from 'react';
import './scss/index.scss';

/**
 * XboxButton B Component
 * Reusable Xbox B button component
 */
export function XboxButtonB({ className = '', ...props }) {
  return (
    <div 
      className={`xbox-button xbox-button--b ${className}`}
      title="Xbox B"
      {...props}
    >
      <span className="xbox-button__label">B</span>
    </div>
  );
}

