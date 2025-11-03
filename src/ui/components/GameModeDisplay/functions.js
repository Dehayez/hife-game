export function updateDisplay(wrapper, modeLabel, primaryInfo, secondaryInfo, gameModeManager) {
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

