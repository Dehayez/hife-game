export function initControlsLegend({ mount }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui__legend-panel';

  // Legend title
  const legendTitle = document.createElement('h3');
  legendTitle.className = 'ui__legend-title';
  legendTitle.textContent = 'Legend';
  wrapper.appendChild(legendTitle);

  // Movement keys section
  const movementSection = document.createElement('div');
  movementSection.className = 'ui__legend-section';

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

  // Actions section
  const actionsSection = document.createElement('div');
  actionsSection.className = 'ui__legend-section';

  const runGroup = document.createElement('div');
  runGroup.className = 'ui__legend-group';
  
  const runLabel = document.createElement('span');
  runLabel.className = 'ui__legend-label';
  runLabel.textContent = 'Run:';
  runGroup.appendChild(runLabel);
  
  const runKeys = document.createElement('div');
  runKeys.className = 'ui__legend-keys ui__legend-keys--run';
  
  const shiftKey = document.createElement('div');
  shiftKey.className = 'ui__legend-key ui__legend-key--shift';
  shiftKey.innerHTML = '⇧ Shift';
  runKeys.appendChild(shiftKey);
  
  runGroup.appendChild(runKeys);
  actionsSection.appendChild(runGroup);

  // Jump action
  const jumpGroup = document.createElement('div');
  jumpGroup.className = 'ui__legend-group';
  
  const jumpLabel = document.createElement('span');
  jumpLabel.className = 'ui__legend-label';
  jumpLabel.textContent = 'Jump:';
  jumpGroup.appendChild(jumpLabel);
  
  const jumpKeys = document.createElement('div');
  jumpKeys.className = 'ui__legend-keys ui__legend-keys--jump';
  
  const spaceKey = document.createElement('div');
  spaceKey.className = 'ui__legend-key ui__legend-key--space';
  spaceKey.innerHTML = 'Space';
  jumpKeys.appendChild(spaceKey);
  
  jumpGroup.appendChild(jumpKeys);
  actionsSection.appendChild(jumpGroup);

  wrapper.appendChild(actionsSection);

  mount.appendChild(wrapper);

  return {
    destroy() {
      if (wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    }
  };
}
