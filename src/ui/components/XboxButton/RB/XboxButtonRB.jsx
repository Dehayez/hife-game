import React from 'react';
import './XboxButtonRB.scss';

/**
 * XboxButton RB Component
 * Reusable Xbox Right Bumper button component
 */
export function XboxButtonRB({ className = '', ...props }) {
  return (
    <div 
      className={`xbox-button xbox-button--rb ${className}`}
      title="Xbox Right Bumper"
      {...props}
    >
      <span className="xbox-button__label">RB</span>
    </div>
  );
}




















