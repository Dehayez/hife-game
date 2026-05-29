import { updateCooldowns } from './functions.js';

function createAbilityRow(name, defaultLabel, defaultKey) {
  const item = document.createElement('div');
  item.className = 'ui__cooldown-item';
  item.dataset.ability = name;

  const label = document.createElement('div');
  label.className = 'ui__cooldown-label';
  label.innerHTML = `<span class="ui__cooldown-name">${defaultLabel}</span> <span class="ui__cooldown-key">(${defaultKey})</span>`;

  const status = document.createElement('span');
  status.className = 'ui__cooldown-status';
  label.appendChild(status);

  const bar = document.createElement('div');
  bar.className = 'ui__cooldown-bar';

  const track = document.createElement('div');
  track.className = 'ui__cooldown-track';
  bar.appendChild(track);

  const fill = document.createElement('div');
  fill.className = 'ui__cooldown-fill';
  fill.style.width = '100%';

  const shine = document.createElement('div');
  shine.className = 'ui__cooldown-shine';
  fill.appendChild(shine);

  bar.appendChild(fill);

  const flash = document.createElement('div');
  flash.className = 'ui__cooldown-flash';
  bar.appendChild(flash);

  item.appendChild(label);
  item.appendChild(bar);

  return { item, label, bar, fill, status };
}

export function initCooldownIndicator({ mount, projectileManager, characterManager, inputManager }) {
  const defaultReturn = {
    container: null,
    shotFill: null,
    mortarFill: null,
    meleeFill: null,
    speedBoostFill: null,
    flyFill: null,
    shotBar: null,
    mortarBar: null,
    meleeBar: null,
    speedBoostBar: null,
    flyBar: null,
    update: function() {},
    show: function() {},
    hide: function() {}
  };

  if (!mount) {
    return defaultReturn;
  }

  const container = document.createElement('div');
  container.className = 'ui__cooldown-indicator';
  container.style.display = 'block';

  const header = document.createElement('div');
  header.className = 'ui__cooldown-header';

  const headerDot = document.createElement('span');
  headerDot.className = 'ui__cooldown-header-dot';
  header.appendChild(headerDot);

  const headerName = document.createElement('span');
  headerName.className = 'ui__cooldown-header-name';
  header.appendChild(headerName);

  container.appendChild(header);

  const shot = createAbilityRow('shot', 'Shot', 'LMB');
  const speedBoost = createAbilityRow('speedBoost', 'Speed Boost', 'E');
  const mortar = createAbilityRow('mortar', 'Mortar', 'RMB');
  const melee = createAbilityRow('melee', 'Melee', 'B');
  const fly = createAbilityRow('fly', 'Fly', 'Hold A/Space');

  container.appendChild(shot.item);
  container.appendChild(speedBoost.item);
  container.appendChild(mortar.item);
  container.appendChild(melee.item);
  container.appendChild(fly.item);
  mount.appendChild(container);

  const rows = {
    header: { name: headerName, dot: headerDot },
    shot,
    speedBoost,
    mortar,
    melee,
    fly,
  };

  if (projectileManager && characterManager) {
    updateCooldowns(projectileManager, characterManager, inputManager, rows);
  }

  return {
    container,
    shotFill: shot.fill,
    mortarFill: mortar.fill,
    meleeFill: melee.fill,
    speedBoostFill: speedBoost.fill,
    flyFill: fly.fill,
    shotBar: shot.bar,
    mortarBar: mortar.bar,
    meleeBar: melee.bar,
    speedBoostBar: speedBoost.bar,
    flyBar: fly.bar,
    update: function() {
      updateCooldowns(projectileManager, characterManager, inputManager, rows);
    },
    show: function() {
      container.style.display = 'block';
    },
    hide: function() {
      container.style.display = 'none';
    }
  };
}
