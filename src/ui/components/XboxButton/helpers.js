/**
 * XboxButton Helpers
 * Vanilla JS helper functions for creating Xbox button DOM elements
 * Used in non-React contexts like GameMenu
 */

/**
 * Create an Xbox button DOM element
 * @param {string} button - Button name (A, B, X, Y, LB, LT, RB, RT)
 * @param {string} className - Additional CSS classes
 * @returns {HTMLElement} - The button element
 */
export function createXboxButtonElement(button, className = '') {
  const buttonMap = {
    A: { label: 'A', modifier: 'a' },
    B: { label: 'B', modifier: 'b' },
    X: { label: 'X', modifier: 'x' },
    Y: { label: 'Y', modifier: 'y' },
    LB: { label: 'LB', modifier: 'lb' },
    LT: { label: 'LT', modifier: 'lt' },
    RB: { label: 'RB', modifier: 'rb' },
    RT: { label: 'RT', modifier: 'rt' }
  };

  const buttonConfig = buttonMap[button];
  if (!buttonConfig) {
    console.warn(`Unknown Xbox button: ${button}`);
    return null;
  }

  const container = document.createElement('div');
  container.className = `xbox-button xbox-button--${buttonConfig.modifier} ${className}`;
  container.title = `Xbox ${button}`;

  const label = document.createElement('span');
  label.className = 'xbox-button__label';
  label.textContent = buttonConfig.label;

  container.appendChild(label);
  return container;
}

