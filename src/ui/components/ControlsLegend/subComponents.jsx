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

export function ControllerStick({ side = 'left', controllerLabel = 'Xbox', className = '' }) {
  const normalizedSide = side === 'right' ? 'right' : 'left';
  const stickName = normalizedSide === 'left' ? 'Left Stick' : 'Right Stick';
  const label = `${controllerLabel} ${stickName}`;

  return (
    <LegendKey
      className={`ui__legend-key--controller ${className}`.trim()}
      title={label}
      aria-label={label}
    >
      <span className={`ui__legend-stick ui__legend-stick--${normalizedSide}`} data-hand={normalizedSide === 'left' ? 'L' : 'R'}>
        <span className="ui__legend-stick__ring">
          <span className="ui__legend-stick__cap" />
        </span>
        <span className="ui__legend-stick__axis ui__legend-stick__axis--horizontal" />
        <span className="ui__legend-stick__axis ui__legend-stick__axis--vertical" />
      </span>
    </LegendKey>
  );
}

