import { updateCooldowns } from './functions.js';

export function initCooldownIndicator({ mount, projectileManager, characterManager, inputManager }) {
  // Create a default return object even if mount doesn't exist
  const defaultReturn = {
    container: null,
    shotFill: null,
    mortarFill: null,
    meleeFill: null,
    speedBoostFill: null,
    levitateFill: null,
    shotBar: null,
    mortarBar: null,
    meleeBar: null,
    speedBoostBar: null,
    levitateBar: null,
    update: function() {},
    show: function() {},
    hide: function() {}
  };
  
  if (!mount) {
    return defaultReturn;
  }

  // Show abilities UI in all game modes
  const container = document.createElement('div');
  container.className = 'ui__cooldown-indicator';
  container.style.display = 'block'; // Shown in all game modes
  
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
  
  // Speed boost cooldown (Lucy only) - below shot progress
  const speedBoostIndicator = document.createElement('div');
  speedBoostIndicator.className = 'ui__cooldown-item';
  const speedBoostLabel = document.createElement('div');
  speedBoostLabel.className = 'ui__cooldown-label';
  speedBoostLabel.innerHTML = 'Speed Boost <span class="ui__cooldown-key">(LB)</span>';
  const speedBoostBar = document.createElement('div');
  speedBoostBar.className = 'ui__cooldown-bar';
  const speedBoostFill = document.createElement('div');
  speedBoostFill.className = 'ui__cooldown-fill';
  speedBoostFill.style.width = '100%';
  speedBoostBar.appendChild(speedBoostFill);
  speedBoostIndicator.appendChild(speedBoostLabel);
  speedBoostIndicator.appendChild(speedBoostBar);
  
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
  
  // Levitate cooldown
  const levitateIndicator = document.createElement('div');
  levitateIndicator.className = 'ui__cooldown-item';
  const levitateLabel = document.createElement('div');
  levitateLabel.className = 'ui__cooldown-label';
  levitateLabel.innerHTML = 'Levitate <span class="ui__cooldown-key">(Hold A/Space)</span>';
  const levitateBar = document.createElement('div');
  levitateBar.className = 'ui__cooldown-bar';
  const levitateFill = document.createElement('div');
  levitateFill.className = 'ui__cooldown-fill';
  levitateFill.style.width = '100%';
  levitateBar.appendChild(levitateFill);
  levitateIndicator.appendChild(levitateLabel);
  levitateIndicator.appendChild(levitateBar);
  
  container.appendChild(shotIndicator);
  container.appendChild(speedBoostIndicator);
  container.appendChild(mortarIndicator);
  container.appendChild(meleeIndicator);
  container.appendChild(levitateIndicator);
  mount.appendChild(container);
  
  // Initial sync so labels match current input mode immediately
  if (projectileManager && characterManager) {
    updateCooldowns(projectileManager, characterManager, inputManager, shotLabel, mortarLabel, meleeLabel, speedBoostLabel, levitateLabel, shotFill, mortarFill, meleeFill, speedBoostFill, levitateFill);
  }
  
  // Store references for updates
  return {
    container,
    shotFill,
    mortarFill,
    meleeFill,
    speedBoostFill,
    levitateFill,
    shotBar,
    mortarBar,
    meleeBar,
    speedBoostBar,
    levitateBar,
    update: function() {
      updateCooldowns(projectileManager, characterManager, inputManager, shotLabel, mortarLabel, meleeLabel, speedBoostLabel, levitateLabel, shotFill, mortarFill, meleeFill, speedBoostFill, levitateFill);
    },
    show: function() {
      container.style.display = 'block';
    },
    hide: function() {
      container.style.display = 'none';
    }
  };
}

