import React from 'react';
import './XboxButtonRT.scss';

/**
 * XboxButton RT Component
 * Reusable Xbox Right Trigger button component
 */
export function XboxButtonRT({ className = '', ...props }) {
  return (
    <div 
      className={`xbox-button xbox-button--rt ${className}`}
      title="Xbox Right Trigger"
      {...props}
    >
      <span className="xbox-button__label">RT</span>
    </div>
  );
}






