export function initControlsLegend({ mount, inputManager, gameModeManager }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui__legend-panel';

  // Legend title
  const legendTitle = document.createElement('h3');
  legendTitle.className = 'ui__legend-title';
  legendTitle.textContent = 'Controls';
  wrapper.appendChild(legendTitle);

  // Content container that will be updated
  const contentContainer = document.createElement('div');
  contentContainer.className = 'ui__legend-content';
  wrapper.appendChild(contentContainer);

  // Function to update legend based on input mode and game mode
  function updateLegend() {
    // Clear existing content
    contentContainer.innerHTML = '';
    
    const inputMode = inputManager ? inputManager.getInputMode() : 'keyboard';
    const gameMode = gameModeManager ? gameModeManager.getMode() : 'free-play';
    const isShootingMode = gameMode === 'shooting';

    if (inputMode === 'controller') {
      // Controller controls
      renderControllerControls(contentContainer, isShootingMode);
    } else {
      // Keyboard/Mouse controls
      renderKeyboardControls(contentContainer, isShootingMode);
    }
  }

  // Render keyboard/mouse controls
  function renderKeyboardControls(container, isShootingMode) {
    // Movement section
  const movementSection = document.createElement('div');
  movementSection.className = 'ui__legend-section';

    const movementGroup = document.createElement('div');
    movementGroup.className = 'ui__legend-group';
    
    const movementLabel = document.createElement('span');
    movementLabel.className = 'ui__legend-label';
    movementLabel.textContent = 'Move:';
    movementGroup.appendChild(movementLabel);
    
    const movementKeys = document.createElement('div');
    movementKeys.className = 'ui__legend-keys ui__legend-keys--arrows';
    
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
      movementKeys.appendChild(keyBox);
    });
    
    movementGroup.appendChild(movementKeys);
    movementSection.appendChild(movementGroup);
    container.appendChild(movementSection);

  // Actions section
  const actionsSection = document.createElement('div');
  actionsSection.className = 'ui__legend-section';

    // Run
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

    // Jump
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

    container.appendChild(actionsSection);

    // Shooting mode controls
    if (isShootingMode) {
      const shootingSection = document.createElement('div');
      shootingSection.className = 'ui__legend-section';
      
      const shootingTitle = document.createElement('div');
      shootingTitle.className = 'ui__legend-group';
      shootingTitle.style.marginTop = '12px';
      shootingTitle.style.paddingTop = '12px';
      shootingTitle.style.borderTop = '1px solid var(--color-border-light)';
      
      const titleLabel = document.createElement('span');
      titleLabel.className = 'ui__legend-label';
      titleLabel.textContent = 'Shooting:';
      titleLabel.style.fontWeight = '600';
      titleLabel.style.opacity = '1';
      shootingTitle.appendChild(titleLabel);
      shootingSection.appendChild(shootingTitle);

      // Bolt
      const boltGroup = document.createElement('div');
      boltGroup.className = 'ui__legend-group';
      
      const boltLabel = document.createElement('span');
      boltLabel.className = 'ui__legend-label';
      boltLabel.textContent = 'Bolt:';
      boltGroup.appendChild(boltLabel);
      
      const boltKeys = document.createElement('div');
      boltKeys.className = 'ui__legend-keys ui__legend-keys--run';
      
      const leftClick = document.createElement('div');
      leftClick.className = 'ui__legend-key';
      leftClick.innerHTML = '🖱️ Left Click';
      boltKeys.appendChild(leftClick);
      
      boltGroup.appendChild(boltKeys);
      shootingSection.appendChild(boltGroup);

      // Mortar
      const mortarGroup = document.createElement('div');
      mortarGroup.className = 'ui__legend-group';
      
      const mortarLabel = document.createElement('span');
      mortarLabel.className = 'ui__legend-label';
      mortarLabel.textContent = 'Mortar:';
      mortarGroup.appendChild(mortarLabel);
      
      const mortarKeys = document.createElement('div');
      mortarKeys.className = 'ui__legend-keys ui__legend-keys--run';
      
      const rightClick = document.createElement('div');
      rightClick.className = 'ui__legend-key';
      rightClick.innerHTML = '🖱️ Right Click';
      mortarKeys.appendChild(rightClick);
      
      mortarGroup.appendChild(mortarKeys);
      shootingSection.appendChild(mortarGroup);

      // Herald speed control (cursor distance)
      const speedGroup = document.createElement('div');
      speedGroup.className = 'ui__legend-group';
      
      const speedLabel = document.createElement('span');
      speedLabel.className = 'ui__legend-label';
      speedLabel.textContent = 'Speed (Herald):';
      speedGroup.appendChild(speedLabel);
      
      const speedHint = document.createElement('div');
      speedHint.className = 'ui__legend-key';
      speedHint.style.minWidth = 'auto';
      speedHint.style.fontSize = '10px';
      speedHint.style.opacity = '0.7';
      speedHint.textContent = 'Cursor distance';
      speedGroup.appendChild(speedHint);
      
      shootingSection.appendChild(speedGroup);

      container.appendChild(shootingSection);
    }
  }

  // Render controller controls
  function renderControllerControls(container, isShootingMode) {
    // Movement section
    const movementSection = document.createElement('div');
    movementSection.className = 'ui__legend-section';
    
    const movementGroup = document.createElement('div');
    movementGroup.className = 'ui__legend-group';
    
    const movementLabel = document.createElement('span');
    movementLabel.className = 'ui__legend-label';
    movementLabel.textContent = 'Move:';
    movementGroup.appendChild(movementLabel);
    
    const movementKeys = document.createElement('div');
    movementKeys.className = 'ui__legend-keys ui__legend-keys--run';
    
    const leftStick = document.createElement('div');
    leftStick.className = 'ui__legend-key ui__legend-key--xbox';
    leftStick.innerHTML = '🎮 Left Stick';
    leftStick.title = 'Xbox Left Analog Stick';
    movementKeys.appendChild(leftStick);
    
    movementGroup.appendChild(movementKeys);
    movementSection.appendChild(movementGroup);
    container.appendChild(movementSection);

    // Actions section
    const actionsSection = document.createElement('div');
    actionsSection.className = 'ui__legend-section';

    // Run
    const runGroup = document.createElement('div');
    runGroup.className = 'ui__legend-group';
    
    const runLabel = document.createElement('span');
    runLabel.className = 'ui__legend-label';
    runLabel.textContent = 'Run:';
    runGroup.appendChild(runLabel);
    
    const runKeys = document.createElement('div');
    runKeys.className = 'ui__legend-keys ui__legend-keys--run';
    
    const ltKey = document.createElement('div');
    ltKey.className = 'ui__legend-key ui__legend-key--xbox';
    ltKey.innerHTML = '<span class="xbox-button">LT</span>';
    ltKey.title = 'Xbox Left Trigger';
    runKeys.appendChild(ltKey);
    
    runGroup.appendChild(runKeys);
    actionsSection.appendChild(runGroup);

    // Jump
    const jumpGroup = document.createElement('div');
    jumpGroup.className = 'ui__legend-group';
    
    const jumpLabel = document.createElement('span');
    jumpLabel.className = 'ui__legend-label';
    jumpLabel.textContent = 'Jump:';
    jumpGroup.appendChild(jumpLabel);
    
    const jumpKeys = document.createElement('div');
    jumpKeys.className = 'ui__legend-keys ui__legend-keys--run';
    
    const aButton = document.createElement('div');
    aButton.className = 'ui__legend-key ui__legend-key--xbox ui__legend-key--xbox-a';
    aButton.innerHTML = '<span class="xbox-button">A</span>';
    aButton.title = 'Xbox A Button';
    jumpKeys.appendChild(aButton);
    
    jumpGroup.appendChild(jumpKeys);
    actionsSection.appendChild(jumpGroup);

    // Levitation
    const levitateGroup = document.createElement('div');
    levitateGroup.className = 'ui__legend-group';
    
    const levitateLabel = document.createElement('span');
    levitateLabel.className = 'ui__legend-label';
    levitateLabel.textContent = 'Levitate:';
    levitateGroup.appendChild(levitateLabel);
    
    const levitateKeys = document.createElement('div');
    levitateKeys.className = 'ui__legend-keys ui__legend-keys--run';
    
    const levitateAButton = document.createElement('div');
    levitateAButton.className = 'ui__legend-key ui__legend-key--xbox ui__legend-key--xbox-a';
    levitateAButton.innerHTML = '<span class="xbox-button">A</span>';
    levitateAButton.title = 'Xbox A Button';
    levitateKeys.appendChild(levitateAButton);
    
    levitateGroup.appendChild(levitateKeys);
    actionsSection.appendChild(levitateGroup);

    container.appendChild(actionsSection);

    // Shooting mode controls
    if (isShootingMode) {
      const shootingSection = document.createElement('div');
      shootingSection.className = 'ui__legend-section';
      
      const shootingTitle = document.createElement('div');
      shootingTitle.className = 'ui__legend-group';
      shootingTitle.style.marginTop = '12px';
      shootingTitle.style.paddingTop = '12px';
      shootingTitle.style.borderTop = '1px solid var(--color-border-light)';
      
      const titleLabel = document.createElement('span');
      titleLabel.className = 'ui__legend-label';
      titleLabel.textContent = 'Shooting:';
      titleLabel.style.fontWeight = '600';
      titleLabel.style.opacity = '1';
      shootingTitle.appendChild(titleLabel);
      shootingSection.appendChild(shootingTitle);

      // Aim
      const aimGroup = document.createElement('div');
      aimGroup.className = 'ui__legend-group';
      
      const aimLabel = document.createElement('span');
      aimLabel.className = 'ui__legend-label';
      aimLabel.textContent = 'Aim:';
      aimGroup.appendChild(aimLabel);
      
      const aimKeys = document.createElement('div');
      aimKeys.className = 'ui__legend-keys ui__legend-keys--run';
      
      const rightStick = document.createElement('div');
      rightStick.className = 'ui__legend-key ui__legend-key--xbox';
      rightStick.innerHTML = '🎮 Right Stick';
      rightStick.title = 'Xbox Right Analog Stick';
      aimKeys.appendChild(rightStick);
      
      aimGroup.appendChild(aimKeys);
      shootingSection.appendChild(aimGroup);

      // Bolt
      const boltGroup = document.createElement('div');
      boltGroup.className = 'ui__legend-group';
      
      const boltLabel = document.createElement('span');
      boltLabel.className = 'ui__legend-label';
      boltLabel.textContent = 'Bolt:';
      boltGroup.appendChild(boltLabel);
      
      const boltKeys = document.createElement('div');
      boltKeys.className = 'ui__legend-keys ui__legend-keys--run';
      
      const rtButton = document.createElement('div');
      rtButton.className = 'ui__legend-key ui__legend-key--xbox ui__legend-key--xbox-rt';
      rtButton.innerHTML = '<span class="xbox-button">RT</span>';
      rtButton.title = 'Xbox Right Trigger';
      boltKeys.appendChild(rtButton);
      
      boltGroup.appendChild(boltKeys);
      shootingSection.appendChild(boltGroup);

      // Mortar Hold
      const mortarHoldGroup = document.createElement('div');
      mortarHoldGroup.className = 'ui__legend-group';
      
      const mortarHoldLabel = document.createElement('span');
      mortarHoldLabel.className = 'ui__legend-label';
      mortarHoldLabel.textContent = 'Mortar Hold:';
      mortarHoldGroup.appendChild(mortarHoldLabel);
      
      const mortarHoldKeys = document.createElement('div');
      mortarHoldKeys.className = 'ui__legend-keys ui__legend-keys--run';
      
      const rbButton = document.createElement('div');
      rbButton.className = 'ui__legend-key ui__legend-key--xbox';
      rbButton.innerHTML = '<span class="xbox-button">RB</span>';
      rbButton.title = 'Xbox Right Bumper';
      mortarHoldKeys.appendChild(rbButton);
      
      mortarHoldGroup.appendChild(mortarHoldKeys);
      shootingSection.appendChild(mortarHoldGroup);

      // Mortar Release
      const mortarReleaseGroup = document.createElement('div');
      mortarReleaseGroup.className = 'ui__legend-group';
      
      const mortarReleaseLabel = document.createElement('span');
      mortarReleaseLabel.className = 'ui__legend-label';
      mortarReleaseLabel.textContent = 'Release:';
      mortarReleaseGroup.appendChild(mortarReleaseLabel);
      
      const mortarReleaseKeys = document.createElement('div');
      mortarReleaseKeys.className = 'ui__legend-keys ui__legend-keys--run';
      
      const rtRelease = document.createElement('div');
      rtRelease.className = 'ui__legend-key ui__legend-key--xbox ui__legend-key--xbox-rt';
      rtRelease.innerHTML = '<span class="xbox-button">RT</span>';
      rtRelease.title = 'Xbox Right Trigger';
      mortarReleaseKeys.appendChild(rtRelease);
      
      mortarReleaseGroup.appendChild(mortarReleaseKeys);
      shootingSection.appendChild(mortarReleaseGroup);

      // Herald speed control (right stick push)
      const speedGroup = document.createElement('div');
      speedGroup.className = 'ui__legend-group';
      
      const speedLabel = document.createElement('span');
      speedLabel.className = 'ui__legend-label';
      speedLabel.textContent = 'Speed (Herald):';
      speedGroup.appendChild(speedLabel);
      
      const speedHint = document.createElement('div');
      speedHint.className = 'ui__legend-key';
      speedHint.style.minWidth = 'auto';
      speedHint.style.fontSize = '10px';
      speedHint.style.opacity = '0.7';
      speedHint.textContent = 'Right stick push';
      speedGroup.appendChild(speedHint);
      
      shootingSection.appendChild(speedGroup);

      container.appendChild(shootingSection);
    }

    // Additional controller actions
    const extraSection = document.createElement('div');
    extraSection.className = 'ui__legend-section';
    
    // Character Swap
    const swapGroup = document.createElement('div');
    swapGroup.className = 'ui__legend-group';
    
    const swapLabel = document.createElement('span');
    swapLabel.className = 'ui__legend-label';
    swapLabel.textContent = 'Swap:';
    swapGroup.appendChild(swapLabel);
    
    const swapKeys = document.createElement('div');
    swapKeys.className = 'ui__legend-keys ui__legend-keys--run';
    
    const yButton = document.createElement('div');
    yButton.className = 'ui__legend-key ui__legend-key--xbox ui__legend-key--xbox-y';
    yButton.innerHTML = '<span class="xbox-button">Y</span>';
    yButton.title = 'Xbox Y Button';
    swapKeys.appendChild(yButton);
    
    swapGroup.appendChild(swapKeys);
    extraSection.appendChild(swapGroup);

    // Heal
    const healGroup = document.createElement('div');
    healGroup.className = 'ui__legend-group';
    
    const healLabel = document.createElement('span');
    healLabel.className = 'ui__legend-label';
    healLabel.textContent = 'Heal:';
    healGroup.appendChild(healLabel);
    
    const healKeys = document.createElement('div');
    healKeys.className = 'ui__legend-keys ui__legend-keys--run';
    
    const xButton = document.createElement('div');
    xButton.className = 'ui__legend-key ui__legend-key--xbox ui__legend-key--xbox-x';
    xButton.innerHTML = '<span class="xbox-button">X</span>';
    xButton.title = 'Xbox X Button';
    healKeys.appendChild(xButton);
    
    healGroup.appendChild(healKeys);
    extraSection.appendChild(healGroup);

    // Sword Swing
    const swordGroup = document.createElement('div');
    swordGroup.className = 'ui__legend-group';
    
    const swordLabel = document.createElement('span');
    swordLabel.className = 'ui__legend-label';
    swordLabel.textContent = 'Sword:';
    swordGroup.appendChild(swordLabel);
    
    const swordKeys = document.createElement('div');
    swordKeys.className = 'ui__legend-keys ui__legend-keys--run';
    
    const bButton = document.createElement('div');
    bButton.className = 'ui__legend-key ui__legend-key--xbox ui__legend-key--xbox-b';
    bButton.innerHTML = '<span class="xbox-button">B</span>';
    bButton.title = 'Xbox B Button';
    swordKeys.appendChild(bButton);
    
    swordGroup.appendChild(swordKeys);
    extraSection.appendChild(swordGroup);

    container.appendChild(extraSection);
  }

  // Initial render
  updateLegend();

  mount.appendChild(wrapper);

  return {
    update() {
      updateLegend();
    },
    destroy() {
      if (wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    }
  };
}
