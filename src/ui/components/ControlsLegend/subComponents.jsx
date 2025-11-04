import React from 'react';
import {
  XboxButtonA,
  XboxButtonB,
  XboxButtonX,
  XboxButtonY,
  XboxButtonLB,
  XboxButtonLT,
  XboxButtonRB,
  XboxButtonRT
} from '../XboxButton/index.jsx';

export function LegendGroup({ label, children, className = '' }) {
  return (
    <div className={`ui__legend-group ${className}`}>
      <span className="ui__legend-label">{label}</span>
      {children}
    </div>
  );
}

export function LegendSection({ children, className = '' }) {
  return <div className={`ui__legend-section ${className}`}>{children}</div>;
}

export function LegendKeys({ children, variant = 'run' }) {
  return <div className={`ui__legend-keys ui__legend-keys--${variant}`}>{children}</div>;
}

export function LegendKey({ children, className = '', ...props }) {
  return (
    <div className={`ui__legend-key ${className}`} {...props}>
      {children}
    </div>
  );
}

const buttonComponents = {
  A: XboxButtonA,
  B: XboxButtonB,
  X: XboxButtonX,
  Y: XboxButtonY,
  LB: XboxButtonLB,
  LT: XboxButtonLT,
  RB: XboxButtonRB,
  RT: XboxButtonRT
};

export function XboxButton({ label, button, className = '' }) {
  const ButtonComponent = buttonComponents[button];
  
  if (!ButtonComponent) {
    console.warn(`Unknown Xbox button: ${button}`);
    return null;
  }
  
  return (
    <LegendKey className={`ui__legend-key--xbox ui__legend-key--xbox-${button.toLowerCase()} ${className}`} title={`Xbox ${button}`}>
      <ButtonComponent />
    </LegendKey>
  );
}

