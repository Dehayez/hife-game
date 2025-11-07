import React from 'react';
import { CONTROLLER_BUTTON_CONFIG } from '../XboxButton/helpers.js';

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

export function ControllerButton({ button, controllerType = 'xbox', className = '' }) {
  const config = CONTROLLER_BUTTON_CONFIG[controllerType] || CONTROLLER_BUTTON_CONFIG.xbox;
  const buttonConfig = config.buttons[button];

  if (!buttonConfig) {
    console.warn(`Unknown controller button: ${button} for type ${controllerType}`);
    return null;
  }

  const legendClasses = [`ui__legend-key--controller`, `ui__legend-key--controller-${controllerType}`, `ui__legend-key--controller-${controllerType}-${button.toLowerCase()}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <LegendKey className={legendClasses} title={`${config.title} ${buttonConfig.title}`}>
      <span className={`controller-button ${config.baseClass} ${config.baseClass}--${buttonConfig.modifier}`} aria-label={`${config.title} ${buttonConfig.title}`}>
        <span className={`${config.labelClass} controller-button__label`}>
          {buttonConfig.label}
        </span>
      </span>
    </LegendKey>
  );
}

