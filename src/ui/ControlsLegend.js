export function initControlsLegend({ mount }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui__legend-panel';

  // Movement keys section
  const movementSection = document.createElement('div');
  movementSection.className = 'ui__legend-section';

  const movementTitle = document.createElement('h3');
  movementTitle.className = 'ui__legend-title';
  movementTitle.textContent = 'Movement';
  movementSection.appendChild(movementTitle);

  // Arrow keys layout
  const arrowGroup = document.createElement('div');
  arrowGroup.className = 'ui__legend-group';
  
  const arrowLabel = document.createElement('span');
  arrowLabel.className = 'ui__legend-label';
  arrowLabel.textContent = 'Arrow Keys:';
  arrowGroup.appendChild(arrowLabel);

  const arrowKeys = document.createElement('div');
  arrowKeys.className = 'ui__legend-keys ui__legend-keys--arrows';
  
  // Create key boxes for arrow keys in proper cross formation
  // Up on top, Left-Down-Right below
  const arrowKeysData = [
    { key: 'up', label: '↑', className: 'ui__legend-key--up' },
    { key: 'left', label: '←', className: 'ui__legend-key--left' },
    { key: 'down', label: '↓', className: 'ui__legend-key--down' },
    { key: 'right', label: '→', className: 'ui__legend-key--right' }
  ];
  
  arrowKeysData.forEach(keyData => {
    const keyBox = document.createElement('div');
    keyBox.className = `ui__legend-key ${keyData.className}`;
    keyBox.textContent = keyData.label;
    arrowKeys.appendChild(keyBox);
  });
  
  arrowGroup.appendChild(arrowKeys);
  movementSection.appendChild(arrowGroup);

  wrapper.appendChild(movementSection);

  // Running section
  const runningSection = document.createElement('div');
  runningSection.className = 'ui__legend-section';

  const runningTitle = document.createElement('h3');
  runningTitle.className = 'ui__legend-title';
  runningTitle.textContent = 'Actions';
  runningSection.appendChild(runningTitle);

  const runGroup = document.createElement('div');
  runGroup.className = 'ui__legend-group';
  
  const runKeys = document.createElement('div');
  runKeys.className = 'ui__legend-keys ui__legend-keys--run';
  
  const shiftKey = document.createElement('div');
  shiftKey.className = 'ui__legend-key ui__legend-key--shift';
  shiftKey.innerHTML = '⇧ Shift';
  runKeys.appendChild(shiftKey);
  
  const runLabel = document.createElement('span');
  runLabel.className = 'ui__legend-label';
  runLabel.textContent = 'Run';
  runKeys.appendChild(runLabel);
  
  runGroup.appendChild(runKeys);
  runningSection.appendChild(runGroup);

  wrapper.appendChild(runningSection);

  mount.appendChild(wrapper);

  return {
    destroy() {
      if (wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    }
  };
}
