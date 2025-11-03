import { getMaxBots, spawnBot, updateBotCount, saveBotCount, restoreSavedBots as restoreSavedBotsFn, getArenaSize } from './functions.js';

export function initBotControl({ mount, botManager, healthBarManager, arenaManager, sceneManager }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui__bot-control';

  const addBotButton = document.createElement('button');
  addBotButton.type = 'button';
  addBotButton.className = 'ui__button ui__button--primary';
  addBotButton.textContent = 'Add Bot';
  addBotButton.addEventListener('click', handleAddBot);

  const removeBotButton = document.createElement('button');
  removeBotButton.type = 'button';
  removeBotButton.className = 'ui__button ui__button--secondary';
  removeBotButton.textContent = 'Remove Bot';
  removeBotButton.addEventListener('click', handleRemoveBot);

  const botCountDisplay = document.createElement('div');
  botCountDisplay.className = 'ui__bot-count';
  botCountDisplay.textContent = 'Bots: 0';

  wrapper.appendChild(addBotButton);
  wrapper.appendChild(removeBotButton);
  wrapper.appendChild(botCountDisplay);

  mount.appendChild(wrapper);

  let botCounter = 0;

  async function handleAddBot() {
    if (!botManager) return;

    const currentCount = botManager.getBots().length;
    const maxBots = getMaxBots(arenaManager);

    // Check maximum limit
    if (currentCount >= maxBots) {
      botCountDisplay.textContent = `Bots: ${currentCount} (Max: ${maxBots})`;
      return;
    }

    const arenaSize = getArenaSize(sceneManager);
    const bot = await spawnBot(botManager, healthBarManager, arenaSize, botCounter++);
    if (bot) {
      saveBotCount(botManager, arenaManager);
      updateBotCountFn();
    }
  }

  function handleRemoveBot() {
    if (!botManager) return;

    const bots = botManager.getAllBots();
    if (bots.length > 0) {
      const bot = bots[bots.length - 1];
      
      // Remove health bar
      if (healthBarManager) {
        healthBarManager.removeHealthBar(bot);
      }
      
      botManager.removeBot(bot);
      saveBotCount(botManager, arenaManager);
      updateBotCountFn();
    }
  }

  function updateBotCountFn() {
    updateBotCount(botManager, botCountDisplay, arenaManager);
  }

  async function restoreSavedBots() {
    await restoreSavedBotsFn(botManager, healthBarManager, arenaManager, sceneManager, 
      (bm, hbm, size, counter) => spawnBot(bm, hbm, size, counter), 
      updateBotCountFn
    );
  }

  // Update bot count periodically
  setInterval(updateBotCountFn, 500);

  return {
    updateBotCount: updateBotCountFn,
    restoreSavedBots
  };
}

