export function initGameModeDisplay({ mount, gameModeManager, characterManager = null }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui__mode-display';

  const modeLabel = document.createElement('div');
  modeLabel.className = 'ui__mode-label';

  const primaryInfo = document.createElement('div');
  primaryInfo.className = 'ui__mode-primary';

  const secondaryInfo = document.createElement('div');
  secondaryInfo.className = 'ui__mode-secondary';

  const restartButton = document.createElement('button');
  restartButton.className = 'ui__restart-button';
  restartButton.textContent = 'Restart';
  restartButton.type = 'button';
  restartButton.addEventListener('click', () => {
    gameModeManager.restartMode();
    if (characterManager) {
      characterManager.respawn();
    }
  });

  wrapper.appendChild(modeLabel);
  wrapper.appendChild(primaryInfo);
  wrapper.appendChild(secondaryInfo);
  wrapper.appendChild(restartButton);

  function update() {
    const info = gameModeManager.getDisplayInfo();
    
    // Hide entire panel if no mode info (free-play mode)
    if (!info.mode) {
      wrapper.style.display = 'none';
      return;
    }
    
    wrapper.style.display = 'block';
    modeLabel.textContent = info.mode;
    primaryInfo.textContent = info.primary || '';
    secondaryInfo.textContent = info.secondary || '';
    
    primaryInfo.style.display = info.primary ? 'block' : 'none';
    secondaryInfo.style.display = info.secondary ? 'block' : 'none';
  }

  mount.appendChild(wrapper);

  setInterval(update, 100);

  return {
    update
  };
}

