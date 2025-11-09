import React from 'react';
import './XboxButtonLT.scss';

/**
 * XboxButton LT Component
 * Reusable Xbox Left Trigger button component
 */
export function XboxButtonLT({ className = '', ...props }) {
  return (
    <div 
      className={`xbox-button xbox-button--lt ${className}`}
      title="Xbox Left Trigger"
      {...props}
    >
      <span className="xbox-button__label">LT</span>
    </div>
  );
}










