export function getModeName(mode, gameModeManager) {
  if (gameModeManager) {
    const config = gameModeManager.getModeConfigByKey(mode);
    if (config && config.name) {
      return config.name;
    }
  }
  if (!mode) return mode;
  return mode.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function getModeImage(mode, gameModeManager) {
  if (gameModeManager) {
    const config = gameModeManager.getModeConfigByKey(mode);
    if (config && config.image) {
      return config.image;
    }
  }
  // Fallback: try direct path if gameModeManager is not available
  return `/assets/gamemodes/${mode}.png`;
}

