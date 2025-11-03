import { getMeleeStats } from '../core/abilities/functions/CharacterAbilityStats.js';
import { getCharacterColorCss } from '../core/abilities/config/CharacterColors.js';

export function initCooldownIndicator({ mount, projectileManager, characterManager }) {
  // Create a default return object even if mount doesn't exist
  const defaultReturn = {
    container: null,
    shotFill: null,
    mortarFill: null,
    meleeFill: null,
    shotBar: null,
    mortarBar: null,
    meleeBar: null,
    update: function() {},
    show: function() {},
    hide: function() {}
  };
  
  if (!mount) {
    return defaultReturn;
  }

  // Only show in shooting mode
  const container = document.createElement('div');
  container.className = 'ui__cooldown-indicator';
  container.style.display = 'none'; // Hidden by default, shown in shooting mode
  
  // Regular shot cooldown (will update dynamically based on character)
  const shotIndicator = document.createElement('div');
  shotIndicator.className = 'ui__cooldown-item';
  const shotLabel = document.createElement('div');
  shotLabel.className = 'ui__cooldown-label';
  shotLabel.innerHTML = 'Shot <span class="ui__cooldown-key">(LMB)</span>'; // Default, will update based on character
  const shotBar = document.createElement('div');
  shotBar.className = 'ui__cooldown-bar';
  const shotFill = document.createElement('div');
  shotFill.className = 'ui__cooldown-fill';
  shotFill.style.width = '100%';
  shotBar.appendChild(shotFill);
  shotIndicator.appendChild(shotLabel);
  shotIndicator.appendChild(shotBar);
  
  // Mortar cooldown (will update dynamically based on character)
  const mortarIndicator = document.createElement('div');
  mortarIndicator.className = 'ui__cooldown-item';
  const mortarLabel = document.createElement('div');
  mortarLabel.className = 'ui__cooldown-label';
  mortarLabel.innerHTML = 'Mortar <span class="ui__cooldown-key">(RMB)</span>'; // Default, will update based on character
  const mortarBar = document.createElement('div');
  mortarBar.className = 'ui__cooldown-bar';
  const mortarFill = document.createElement('div');
  mortarFill.className = 'ui__cooldown-fill';
  mortarFill.style.width = '100%';
  mortarBar.appendChild(mortarFill);
  mortarIndicator.appendChild(mortarLabel);
  mortarIndicator.appendChild(mortarBar);
  
  // Melee cooldown (will update dynamically based on character)
  const meleeIndicator = document.createElement('div');
  meleeIndicator.className = 'ui__cooldown-item';
  const meleeLabel = document.createElement('div');
  meleeLabel.className = 'ui__cooldown-label';
  meleeLabel.innerHTML = 'Melee <span class="ui__cooldown-key">(B)</span>'; // Default, will update based on character
  const meleeBar = document.createElement('div');
  meleeBar.className = 'ui__cooldown-bar';
  const meleeFill = document.createElement('div');
  meleeFill.className = 'ui__cooldown-fill';
  meleeFill.style.width = '100%';
  meleeBar.appendChild(meleeFill);
  meleeIndicator.appendChild(meleeLabel);
  meleeIndicator.appendChild(meleeBar);
  
  container.appendChild(shotIndicator);
  container.appendChild(mortarIndicator);
  container.appendChild(meleeIndicator);
  mount.appendChild(container);
  
  // Store references for updates
  return {
    container,
    shotFill,
    mortarFill,
    meleeFill,
    shotBar,
    mortarBar,
    meleeBar,
    update: function() {
      if (!projectileManager || !characterManager) return;
      
      const characterName = characterManager.getCharacterName();
      const playerId = 'local';
      
      // Get character stats for cooldowns
      const stats = projectileManager.getCharacterStats(characterName);
      const meleeStats = getMeleeStats(characterName);
      
      // Update labels based on character (fire spells for Herald/Pyre)
      const isHerald = characterName === 'herald';
      shotLabel.innerHTML = isHerald ? 'Bolt <span class="ui__cooldown-key">(LMB)</span>' : 'Shot <span class="ui__cooldown-key">(LMB)</span>';
      mortarLabel.innerHTML = isHerald ? 'Fireball <span class="ui__cooldown-key">(RMB)</span>' : 'Mortar <span class="ui__cooldown-key">(RMB)</span>';
      meleeLabel.innerHTML = 'Melee <span class="ui__cooldown-key">(B)</span>';
      
      // Get character color for cooldown fills
      const characterColor = getCharacterColorCss(characterName);
      
      // Update shot cooldown
      const shotCooldown = projectileManager.characterCooldowns.getCooldown(playerId);
      const shotMaxCooldown = stats.bolt.cooldown || 0.3;
      const shotPercent = shotMaxCooldown > 0 ? Math.min(shotCooldown / shotMaxCooldown, 1.0) : 0;
      shotFill.style.width = `${(1 - shotPercent) * 100}%`;
      shotFill.style.opacity = shotPercent > 0 ? '0.6' : '1.0';
      shotFill.style.background = characterColor;
      
      // Update mortar cooldown
      const mortarCooldown = projectileManager.mortarCharacterCooldowns.getCooldown(playerId);
      const mortarMaxCooldown = stats.mortar.cooldown || 1.5;
      const mortarPercent = mortarMaxCooldown > 0 ? Math.min(mortarCooldown / mortarMaxCooldown, 1.0) : 0;
      mortarFill.style.width = `${(1 - mortarPercent) * 100}%`;
      mortarFill.style.opacity = mortarPercent > 0 ? '0.6' : '1.0';
      mortarFill.style.background = characterColor;
      
      // Update melee cooldown
      const meleeCooldown = projectileManager.meleeCharacterCooldowns.getCooldown(playerId);
      const meleeMaxCooldown = meleeStats.cooldown || 1.5;
      const meleePercent = meleeMaxCooldown > 0 ? Math.min(meleeCooldown / meleeMaxCooldown, 1.0) : 0;
      meleeFill.style.width = `${(1 - meleePercent) * 100}%`;
      meleeFill.style.opacity = meleePercent > 0 ? '0.6' : '1.0';
      meleeFill.style.background = characterColor;
    },
    show: function() {
      container.style.display = 'block';
    },
    hide: function() {
      container.style.display = 'none';
    }
  };
}

