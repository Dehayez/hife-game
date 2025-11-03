export function createOverlayElements() {
  // Create overlay container
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: saturate(0.1) brightness(0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    pointer-events: none;
    font-family: 'Arial', sans-serif;
    opacity: 0;
    transition: opacity 2s ease-in-out;
  `;

  // Create countdown text
  const countdownText = document.createElement('div');
  countdownText.style.cssText = `
    font-size: 4rem;
    font-weight: bold;
    color: rgba(255, 255, 255, 0.9);
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    animation: pulse 1s ease-in-out infinite alternate;
  `;

  // Add pulse animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      from { transform: scale(1); opacity: 0.8; }
      to { transform: scale(1.1); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  overlay.appendChild(countdownText);
  document.body.appendChild(overlay);

  return { overlay, countdownText };
}

