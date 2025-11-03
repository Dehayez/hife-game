export function createButton() {
  // Create start button
  const button = document.createElement('button');
  button.className = 'ui__start-button';
  button.textContent = 'Start';
  button.type = 'button';
  
  // Prevent spacebar from activating focused button
  button.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
      e.preventDefault();
    }
  });

  return button;
}

