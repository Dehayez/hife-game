import { getMeleeStats, getBlastStats, getMultiProjectileStats } from '../../../core/systems/abilities/functions/CharacterAbilityStats.js';
import { getCharacterColorCss } from '../../../config/abilities/CharacterColors.js';
import { getCharacterPhysicsStats } from '../../../config/character/PhysicsConfig.js';
import { CONTROLLER_BUTTON_CONFIG } from '../XboxButton/helpers.js';

function getControllerType(inputManager) {
  if (!inputManager || typeof inputManager.getControllerType !== 'function') {
    return 'generic';
  }
  return inputManager.getControllerType() || 'generic';
}

function getControllerLabel(button, controllerType) {
  const config = CONTROLLER_BUTTON_CONFIG[controllerType] || CONTROLLER_BUTTON_CONFIG.xbox;
  const buttonConfig = config.buttons[button];
  return buttonConfig ? buttonConfig.label : button;
}

export function updateCooldowns(projectileManager, characterManager, inputManager, shotLabel, mortarLabel, meleeLabel, speedBoostLabel, levitateLabel, shotFill, mortarFill, meleeFill, speedBoostFill, levitateFill) {
  if (!projectileManager || !characterManager) return;
  
  const characterName = characterManager.getCharacterName();
  const playerId = 'local';
  
  // Get input mode (default to keyboard if inputManager not available)
  const inputMode = inputManager ? inputManager.getInputMode() : 'keyboard';
  const isControllerMode = inputMode === 'controller';
  const controllerTypeRaw = getControllerType(inputManager);
  const controllerType = controllerTypeRaw === 'generic' ? 'xbox' : controllerTypeRaw;
  const controllerLabel = (btn) => getControllerLabel(btn, controllerType);
  
  // Get character stats for cooldowns
  const stats = projectileManager.getCharacterStats(characterName);
  const meleeStats = getMeleeStats(characterName);
  
  // Get bullet info for bolt/shot
  const bulletInfo = projectileManager.getBoltBulletInfo(playerId, characterName);
  
  // Update labels based on character and input mode
  const isHerald = characterName === 'herald';
  
  // Shot/Bolt label
  if (isControllerMode) {
    const label = controllerLabel('RT');
    shotLabel.innerHTML = isHerald ? `Bolt <span class="ui__cooldown-key">(${label})</span>` : `Shot <span class="ui__cooldown-key">(${label})</span>`;
  } else {
    shotLabel.innerHTML = isHerald ? 'Bolt <span class="ui__cooldown-key">(LMB)</span>' : 'Shot <span class="ui__cooldown-key">(LMB)</span>';
  }
  
  // Mortar/Fireball label
  if (isControllerMode) {
    const label = controllerLabel('RB');
    mortarLabel.innerHTML = isHerald ? `Fireball <span class="ui__cooldown-key">(${label})</span>` : `Mortar <span class="ui__cooldown-key">(${label})</span>`;
  } else {
    mortarLabel.innerHTML = isHerald ? 'Fireball <span class="ui__cooldown-key">(RMB)</span>' : 'Mortar <span class="ui__cooldown-key">(RMB)</span>';
  }
  
  // Melee/Special ability label
  if (isControllerMode) {
    const meleeButtonLabel = controllerLabel('B');
    if (characterName === 'herald') {
      meleeLabel.innerHTML = `Blast <span class="ui__cooldown-key">(${meleeButtonLabel})</span>`;
    } else if (characterName === 'lucy') {
      meleeLabel.innerHTML = `Multi-Projectile <span class="ui__cooldown-key">(${meleeButtonLabel})</span>`;
    } else {
      meleeLabel.innerHTML = `Melee <span class="ui__cooldown-key">(${meleeButtonLabel})</span>`;
    }
  } else {
    if (characterName === 'herald') {
      meleeLabel.innerHTML = 'Blast <span class="ui__cooldown-key">(F)</span>';
    } else if (characterName === 'lucy') {
      meleeLabel.innerHTML = 'Multi-Projectile <span class="ui__cooldown-key">(F)</span>';
    } else {
      meleeLabel.innerHTML = 'Melee <span class="ui__cooldown-key">(F)</span>';
    }
  }
  
  // Get character color for cooldown fills
  const characterColor = getCharacterColorCss(characterName);
  
  // Update shot/bullet indicator - show bullet count or recharge progress
  if (bulletInfo.isRecharging) {
    // Show recharge progress (fills up as recharge progresses)
    shotFill.style.width = `${bulletInfo.percentage * 100}%`;
    shotFill.style.opacity = '0.8'; // Slightly dimmed during recharge
    shotFill.style.background = characterColor;
  } else {
    // Show bullet count (drains as bullets are used)
    shotFill.style.width = `${bulletInfo.percentage * 100}%`;
    shotFill.style.opacity = bulletInfo.current > 0 ? '1.0' : '0.6';
    shotFill.style.background = characterColor;
  }
  
  // Update speed boost label based on input mode
  if (speedBoostLabel) {
    if (isControllerMode) {
      const label = controllerLabel('LB');
      speedBoostLabel.innerHTML = `Speed Boost <span class="ui__cooldown-key">(${label})</span>`;
    } else {
      speedBoostLabel.innerHTML = 'Speed Boost <span class="ui__cooldown-key">(E)</span>';
    }
  }
  
  // Update speed boost cooldown (Lucy and Herald)
  const speedBoostInfo = projectileManager.getSpeedBoostInfo(playerId, characterName);
  if (speedBoostLabel && speedBoostFill) {
    if (speedBoostInfo) {
      // Show speed boost indicator for characters with speed boost
      speedBoostLabel.parentElement.style.display = 'block';
      
      if (speedBoostInfo.active) {
        // Show duration progress (drains from full to empty as time expires)
        speedBoostFill.style.width = `${(1 - speedBoostInfo.percentage) * 100}%`;
        speedBoostFill.style.opacity = '1.0';
        speedBoostFill.style.background = characterColor; // Character color when active
      } else {
        // Show cooldown progress (fills from empty to full as cooldown completes)
        speedBoostFill.style.width = `${(1 - speedBoostInfo.percentage) * 100}%`;
        speedBoostFill.style.opacity = speedBoostInfo.percentage > 0 ? '0.6' : '1.0';
        speedBoostFill.style.background = characterColor; // Character color for cooldown
      }
    } else {
      // Hide speed boost indicator for characters without speed boost
      speedBoostLabel.parentElement.style.display = 'none';
    }
  }
  
  // Update mortar cooldown
  const mortarCooldown = projectileManager.mortarCharacterCooldowns.getCooldown(playerId);
  const mortarMaxCooldown = stats.mortar.cooldown || 1.5;
  const mortarPercent = mortarMaxCooldown > 0 ? Math.min(mortarCooldown / mortarMaxCooldown, 1.0) : 0;
  mortarFill.style.width = `${(1 - mortarPercent) * 100}%`;
  mortarFill.style.opacity = mortarPercent > 0 ? '0.6' : '1.0';
  mortarFill.style.background = characterColor;
  
  // Update melee/special ability cooldown
  let meleeCooldown = 0;
  let meleeMaxCooldown = 1.5;
  
  if (characterName === 'herald') {
    // Use special ability cooldown for Herald's blast
    const blastStats = getBlastStats(characterName);
    if (blastStats) {
      meleeCooldown = projectileManager.getSpecialAbilityCooldown ? projectileManager.getSpecialAbilityCooldown(playerId) : 0;
      meleeMaxCooldown = blastStats.cooldown || 5.0;
    }
  } else if (characterName === 'lucy') {
    // Use special ability cooldown for Lucy's multi-projectile
    const multiProjectileStats = getMultiProjectileStats(characterName);
    if (multiProjectileStats) {
      meleeCooldown = projectileManager.getSpecialAbilityCooldown ? projectileManager.getSpecialAbilityCooldown(playerId) : 0;
      meleeMaxCooldown = multiProjectileStats.cooldown || 4.0;
    }
  } else {
    // Use melee cooldown for other characters
    meleeCooldown = projectileManager.meleeCharacterCooldowns.getCooldown(playerId);
    meleeMaxCooldown = meleeStats.cooldown || 1.5;
  }
  
  const meleePercent = meleeMaxCooldown > 0 ? Math.min(meleeCooldown / meleeMaxCooldown, 1.0) : 0;
  meleeFill.style.width = `${(1 - meleePercent) * 100}%`;
  meleeFill.style.opacity = meleePercent > 0 ? '0.6' : '1.0';
  meleeFill.style.background = characterColor;
  
  // Update levitation cooldown
  if (levitateFill && levitateLabel) {
    // Update levitate label based on input mode
    if (isControllerMode) {
      const label = controllerLabel('A');
      levitateLabel.innerHTML = `Levitate <span class="ui__cooldown-key">(Hold ${label})</span>`;
    } else {
      levitateLabel.innerHTML = 'Levitate <span class="ui__cooldown-key">(Hold Space)</span>';
    }
    
    const physicsStats = getCharacterPhysicsStats();
    const levitationState = characterManager.getLevitationState
      ? characterManager.getLevitationState()
      : null;

    const levitationMaxDuration = physicsStats.levitationMaxDuration || 0;
    if (levitationState && levitationState.isActive && levitationMaxDuration > 0) {
      const durationPercent = Math.min(levitationState.durationRemaining / levitationMaxDuration, 1.0);
      levitateFill.style.width = `${durationPercent * 100}%`;
      levitateFill.style.opacity = '1.0';
    } else {
      const levitationCooldown = levitationState
        ? levitationState.cooldownRemaining
        : characterManager.getLevitationCooldown();
      const levitationMaxCooldown = physicsStats.levitationCooldownTime || 0.3;
      const levitationPercent = levitationMaxCooldown > 0 ? Math.min(levitationCooldown / levitationMaxCooldown, 1.0) : 0;
      levitateFill.style.width = `${(1 - levitationPercent) * 100}%`;
      levitateFill.style.opacity = levitationPercent > 0 ? '0.6' : '1.0';
    }

    levitateFill.style.background = characterColor;
  }
}

