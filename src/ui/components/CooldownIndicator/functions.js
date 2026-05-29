import { getMeleeStats, getBlastStats } from '../../../core/systems/abilities/functions/CharacterAbilityStats.js';
import { getCharacterColorCss } from '../../../config/abilities/CharacterColors.js';
import { getCharacterPhysicsStats } from '../../../config/character/PhysicsConfig.js';
import { CONTROLLER_BUTTON_CONFIG } from '../XboxButton/helpers.js';

const STATE_CLASSES = ['is-ready', 'is-cooling', 'is-active', 'is-empty'];

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

function setLabel(row, name, key) {
  row.label.querySelector('.ui__cooldown-name').textContent = name;
  row.label.querySelector('.ui__cooldown-key').textContent = `(${key})`;
}

function setState(row, state) {
  if (row.item.dataset.state === state) return;
  row.item.dataset.state = state;
  for (const cls of STATE_CLASSES) {
    row.item.classList.toggle(cls, cls === `is-${state}`);
  }
}

function setStatusText(row, text) {
  if (row.status.textContent !== text) {
    row.status.textContent = text;
  }
}

function applyFill(row, percent, state, color) {
  const clamped = Math.max(0, Math.min(1, percent));
  row.fill.style.width = `${clamped * 100}%`;
  row.fill.style.background = color;
  setState(row, state);
}

function show(row, visible) {
  row.item.style.display = visible ? '' : 'none';
}

export function updateCooldowns(projectileManager, characterManager, inputManager, rows) {
  if (!projectileManager || !characterManager) return;
  if (!rows || !rows.shot) return;

  const characterName = characterManager.getCharacterName();
  const playerId = 'local';

  const inputMode = inputManager ? inputManager.getInputMode() : 'keyboard';
  const isControllerMode = inputMode === 'controller';
  const controllerTypeRaw = getControllerType(inputManager);
  const controllerType = controllerTypeRaw === 'generic' ? 'xbox' : controllerTypeRaw;
  const controllerLabel = (btn) => getControllerLabel(btn, controllerType);

  const stats = projectileManager.getCharacterStats(characterName);
  const meleeStats = getMeleeStats(characterName);
  const characterColor = getCharacterColorCss(characterName);
  const isHerald = characterName === 'herald';

  // ---- Shot / Bolt ----
  const shotName = isHerald ? 'Bolt' : 'Shot';
  const shotKey = isControllerMode ? controllerLabel('RT') : 'LMB';
  setLabel(rows.shot, shotName, shotKey);

  const bulletInfo = projectileManager.getBoltBulletInfo(playerId, characterName);
  if (bulletInfo.isRecharging) {
    applyFill(rows.shot, bulletInfo.percentage, 'cooling', characterColor);
    setStatusText(rows.shot, 'Reloading');
  } else if (bulletInfo.current <= 0) {
    applyFill(rows.shot, 0, 'empty', characterColor);
    setStatusText(rows.shot, 'Empty');
  } else {
    applyFill(rows.shot, bulletInfo.percentage, 'ready', characterColor);
    const total = bulletInfo.max ?? bulletInfo.total ?? null;
    setStatusText(rows.shot, total != null ? `${bulletInfo.current}/${total}` : 'Ready');
  }

  // ---- Speed Boost ----
  const speedBoostInfo = projectileManager.getSpeedBoostInfo(playerId, characterName);
  if (speedBoostInfo) {
    show(rows.speedBoost, true);
    const sbKey = isControllerMode ? controllerLabel('LB') : 'E';
    setLabel(rows.speedBoost, 'Speed Boost', sbKey);

    if (speedBoostInfo.active) {
      // Active: drains as duration expires (full→empty)
      applyFill(rows.speedBoost, 1 - speedBoostInfo.percentage, 'active', characterColor);
      setStatusText(rows.speedBoost, 'Active');
    } else if (speedBoostInfo.percentage > 0) {
      // Cooling down (fill grows as it nears ready)
      applyFill(rows.speedBoost, 1 - speedBoostInfo.percentage, 'cooling', characterColor);
      setStatusText(rows.speedBoost, 'Reloading');
    } else {
      applyFill(rows.speedBoost, 1, 'ready', characterColor);
      setStatusText(rows.speedBoost, 'Ready');
    }
  } else {
    show(rows.speedBoost, false);
  }

  // ---- Mortar / Fireball ----
  const mortarName = isHerald ? 'Fireball' : 'Mortar';
  const mortarKey = isControllerMode ? controllerLabel('RB') : 'RMB';
  setLabel(rows.mortar, mortarName, mortarKey);

  const mortarCooldown = projectileManager.mortarCharacterCooldowns.getCooldown(playerId);
  const mortarMaxCooldown = stats.mortar.cooldown || 1.5;
  const mortarPercent = mortarMaxCooldown > 0 ? Math.min(mortarCooldown / mortarMaxCooldown, 1.0) : 0;
  if (mortarPercent > 0) {
    applyFill(rows.mortar, 1 - mortarPercent, 'cooling', characterColor);
    setStatusText(rows.mortar, 'Reloading');
  } else {
    applyFill(rows.mortar, 1, 'ready', characterColor);
    setStatusText(rows.mortar, 'Ready');
  }

  // ---- Melee / Special ----
  let meleeName = 'Melee';
  if (characterName === 'herald') meleeName = 'Blast';
  else if (characterName === 'lucy') meleeName = 'Multi-Projectile';
  const meleeKey = isControllerMode ? controllerLabel('B') : 'F';
  setLabel(rows.melee, meleeName, meleeKey);

  let meleeCooldown = 0;
  let meleeMaxCooldown = 1.5;
  if (characterName === 'herald') {
    const blastStats = getBlastStats(characterName);
    if (blastStats) {
      meleeCooldown = projectileManager.getSpecialAbilityCooldown ? projectileManager.getSpecialAbilityCooldown(playerId) : 0;
      meleeMaxCooldown = blastStats.cooldown || 5.0;
    }
  } else if (characterName === 'lucy') {
    // Lucy's "Multi-Projectile" is fired by `_handleSwordSwing` in GameLoop,
    // which gates on `meleeCooldownTimer` and writes back via setMeleeCooldown.
    // The legacy multiProjectile config is unused at runtime, so the UI must
    // read the melee cooldown to match what the game actually enforces.
    meleeCooldown = projectileManager.meleeCharacterCooldowns.getCooldown(playerId);
    meleeMaxCooldown = meleeStats?.cooldown || 1.5;
  } else {
    meleeCooldown = projectileManager.meleeCharacterCooldowns.getCooldown(playerId);
    meleeMaxCooldown = meleeStats.cooldown || 1.5;
  }

  const meleePercent = meleeMaxCooldown > 0 ? Math.min(meleeCooldown / meleeMaxCooldown, 1.0) : 0;
  if (meleePercent > 0) {
    applyFill(rows.melee, 1 - meleePercent, 'cooling', characterColor);
    setStatusText(rows.melee, 'Reloading');
  } else {
    applyFill(rows.melee, 1, 'ready', characterColor);
    setStatusText(rows.melee, 'Ready');
  }

  // ---- Fly ----
  const flyKey = isControllerMode ? `Hold ${controllerLabel('A')}` : 'Hold Space';
  setLabel(rows.fly, 'Fly', flyKey);

  const physicsStats = getCharacterPhysicsStats();
  const flyState = characterManager.getFlyState ? characterManager.getFlyState() : null;
  const flyMaxDuration = physicsStats.flyMaxDuration || 0;

  if (flyState && flyState.isActive && flyMaxDuration > 0) {
    const durationPercent = Math.min(flyState.durationRemaining / flyMaxDuration, 1.0);
    applyFill(rows.fly, durationPercent, 'active', characterColor);
    setStatusText(rows.fly, 'Active');
  } else {
    const flyCooldown = flyState ? flyState.cooldownRemaining : characterManager.getFlyCooldown();
    const flyMaxCooldown = physicsStats.flyCooldownTime || 0.3;
    const flyPercent = flyMaxCooldown > 0 ? Math.min(flyCooldown / flyMaxCooldown, 1.0) : 0;
    if (flyPercent > 0) {
      applyFill(rows.fly, 1 - flyPercent, 'cooling', characterColor);
      setStatusText(rows.fly, 'Reloading');
    } else {
      applyFill(rows.fly, 1, 'ready', characterColor);
      setStatusText(rows.fly, 'Ready');
    }
  }
}
