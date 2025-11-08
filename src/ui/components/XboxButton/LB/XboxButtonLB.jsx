import React from 'react';
import './XboxButtonLB.scss';

/**
 * XboxButton LB Component
 * Reusable Xbox Left Bumper button component
 */
export function XboxButtonLB({ className = '', ...props }) {
  return (
    <div 
      className={`xbox-button xbox-button--lb ${className}`}
      title="Xbox Left Bumper"
      {...props}
    >
      <span className="xbox-button__label">LB</span>
    </div>
  );
}









