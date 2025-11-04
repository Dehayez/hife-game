import { getMeleeStats } from '../../../core/systems/abilities/functions/CharacterAbilityStats.js';
import { getCharacterColorCss } from '../../../core/systems/abilities/config/CharacterColors.js';

export function updateCooldowns(projectileManager, characterManager, shotLabel, mortarLabel, meleeLabel, shotFill, mortarFill, meleeFill) {
  if (!projectileManager || !characterManager) return;
  
  const characterName = characterManager.getCharacterName();
  const playerId = 'local';
  
  // Get character stats for cooldowns
  const stats = projectileManager.getCharacterStats(characterName);
  const meleeStats = getMeleeStats(characterName);
  
  // Get bullet info for bolt/shot
  const bulletInfo = projectileManager.getBoltBulletInfo(playerId, characterName);
  
  // Update labels based on character (fire spells for Herald/Pyre)
  const isHerald = characterName === 'herald';
  // Update shot label to show bullet count (same format whether reloading or not)
  shotLabel.innerHTML = isHerald ? `Bolt <span class="ui__cooldown-key">(${bulletInfo.current}/${bulletInfo.max})</span>` : `Shot <span class="ui__cooldown-key">(${bulletInfo.current}/${bulletInfo.max})</span>`;
  mortarLabel.innerHTML = isHerald ? 'Fireball <span class="ui__cooldown-key">(RMB)</span>' : 'Mortar <span class="ui__cooldown-key">(RMB)</span>';
  meleeLabel.innerHTML = 'Melee <span class="ui__cooldown-key">(B)</span>';
  
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
}

