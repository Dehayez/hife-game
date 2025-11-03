import React from 'react';

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

export function XboxButton({ label, button, className = '' }) {
  return (
    <LegendKey className={`ui__legend-key--xbox ui__legend-key--xbox-${button} ${className}`} title={`Xbox ${button}`}>
      <span className="xbox-button">{button}</span>
    </LegendKey>
  );
}

