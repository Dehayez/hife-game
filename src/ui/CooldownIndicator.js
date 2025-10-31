export function initCooldownIndicator({ mount, projectileManager, characterManager }) {
  // Create a default return object even if mount doesn't exist
  const defaultReturn = {
    container: null,
    shotFill: null,
    mortarFill: null,
    shotBar: null,
    mortarBar: null,
    update: function() {},
    show: function() {},
    hide: function() {}
  };
  
  if (!mount) {
    console.warn('CooldownIndicator: No mount element provided');
    return defaultReturn;
  }

  // Only show in shooting mode
  const container = document.createElement('div');
  container.className = 'ui__cooldown-indicator';
  container.style.display = 'none'; // Hidden by default, shown in shooting mode
  
  // Regular shot cooldown
  const shotIndicator = document.createElement('div');
  shotIndicator.className = 'ui__cooldown-item';
  const shotLabel = document.createElement('div');
  shotLabel.className = 'ui__cooldown-label';
  shotLabel.textContent = 'Shot (LMB)';
  const shotBar = document.createElement('div');
  shotBar.className = 'ui__cooldown-bar';
  const shotFill = document.createElement('div');
  shotFill.className = 'ui__cooldown-fill';
  shotFill.style.width = '100%';
  shotBar.appendChild(shotFill);
  shotIndicator.appendChild(shotLabel);
  shotIndicator.appendChild(shotBar);
  
  // Mortar cooldown
  const mortarIndicator = document.createElement('div');
  mortarIndicator.className = 'ui__cooldown-item';
  const mortarLabel = document.createElement('div');
  mortarLabel.className = 'ui__cooldown-label';
  mortarLabel.textContent = 'Mortar (RMB)';
  const mortarBar = document.createElement('div');
  mortarBar.className = 'ui__cooldown-bar';
  const mortarFill = document.createElement('div');
  mortarFill.className = 'ui__cooldown-fill';
  mortarFill.style.width = '100%';
  mortarBar.appendChild(mortarFill);
  mortarIndicator.appendChild(mortarLabel);
  mortarIndicator.appendChild(mortarBar);
  
  container.appendChild(shotIndicator);
  container.appendChild(mortarIndicator);
  mount.appendChild(container);
  
  // Store references for updates
  return {
    container,
    shotFill,
    mortarFill,
    shotBar,
    mortarBar,
    update: function() {
      if (!projectileManager || !characterManager) return;
      
      const characterName = characterManager.getCharacterName();
      const playerId = 'local';
      
      // Get character stats for cooldowns
      const stats = projectileManager.getCharacterStats(characterName);
      
      // Update shot cooldown
      const shotCooldown = projectileManager.characterCooldowns.get(playerId) || 0;
      const shotMaxCooldown = stats.cooldown || 0.3;
      const shotPercent = shotMaxCooldown > 0 ? Math.min(shotCooldown / shotMaxCooldown, 1.0) : 0;
      shotFill.style.width = `${(1 - shotPercent) * 100}%`;
      shotFill.style.opacity = shotPercent > 0 ? '0.6' : '1.0';
      
      // Update mortar cooldown
      const mortarCooldown = projectileManager.mortarCharacterCooldowns.get(playerId) || 0;
      const mortarMaxCooldown = stats.mortarCooldown || 1.5;
      const mortarPercent = mortarMaxCooldown > 0 ? Math.min(mortarCooldown / mortarMaxCooldown, 1.0) : 0;
      mortarFill.style.width = `${(1 - mortarPercent) * 100}%`;
      mortarFill.style.opacity = mortarPercent > 0 ? '0.6' : '1.0';
    },
    show: function() {
      container.style.display = 'block';
    },
    hide: function() {
      container.style.display = 'none';
    }
  };
}

