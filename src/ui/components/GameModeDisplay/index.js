import { updateDisplay } from './functions.js';

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

  mount.appendChild(wrapper);

  setInterval(() => updateDisplay(wrapper, modeLabel, primaryInfo, secondaryInfo, gameModeManager), 100);

  return {
    update() {
      updateDisplay(wrapper, modeLabel, primaryInfo, secondaryInfo, gameModeManager);
    }
  };
}

