/**
 * Controller button helpers
 * Vanilla JS helper functions for creating controller button DOM elements
 * Used in non-React contexts like GameMenu
 */

const CONTROLLER_CONFIG = {
  xbox: {
    title: 'Xbox',
    baseClass: 'xbox-button',
    labelClass: 'xbox-button__label',
    buttons: {
      A: { label: 'A', modifier: 'a', title: 'A' },
      B: { label: 'B', modifier: 'b', title: 'B' },
      X: { label: 'X', modifier: 'x', title: 'X' },
      Y: { label: 'Y', modifier: 'y', title: 'Y' },
      LB: { label: 'LB', modifier: 'lb', title: 'Left Bumper' },
      LT: { label: 'LT', modifier: 'lt', title: 'Left Trigger' },
      RB: { label: 'RB', modifier: 'rb', title: 'Right Bumper' },
      RT: { label: 'RT', modifier: 'rt', title: 'Right Trigger' }
    }
  },
  playstation: {
    title: 'PlayStation',
    baseClass: 'playstation-button',
    labelClass: 'playstation-button__label',
    buttons: {
      A: { label: '✕', modifier: 'cross', title: 'Cross' },
      B: { label: '○', modifier: 'circle', title: 'Circle' },
      X: { label: '□', modifier: 'square', title: 'Square' },
      Y: { label: '△', modifier: 'triangle', title: 'Triangle' },
      LB: { label: 'L1', modifier: 'l1', title: 'L1' },
      LT: { label: 'L2', modifier: 'l2', title: 'L2' },
      RB: { label: 'R1', modifier: 'r1', title: 'R1' },
      RT: { label: 'R2', modifier: 'r2', title: 'R2' }
    }
  }
};

function createControllerButtonElement(button, className = '', controllerType = 'xbox') {
  const config = CONTROLLER_CONFIG[controllerType] || CONTROLLER_CONFIG.xbox;
  const buttonConfig = config.buttons[button];

  if (!buttonConfig) {
    console.warn(`Unknown ${config.title} button: ${button}`);
    return null;
  }

  const container = document.createElement('div');
  const classes = [
    'controller-button',
    config.baseClass,
    `${config.baseClass}--${buttonConfig.modifier}`,
    className
  ].filter(Boolean);

  container.className = classes.join(' ');
  container.title = `${config.title} ${buttonConfig.title}`;

  const label = document.createElement('span');
  label.className = `${config.labelClass} controller-button__label`;
  label.textContent = buttonConfig.label;

  container.appendChild(label);
  return container;
}

export function createXboxButtonElement(button, className = '') {
  return createControllerButtonElement(button, className, 'xbox');
}

export function createPlayStationButtonElement(button, className = '') {
  return createControllerButtonElement(button, className, 'playstation');
}

export function createControllerButton(button, { className = '', controllerType = 'xbox' } = {}) {
  return createControllerButtonElement(button, className, controllerType);
}

export const CONTROLLER_BUTTON_CONFIG = CONTROLLER_CONFIG;

