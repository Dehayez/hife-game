import { getBotCount, setBotCount, getMaxBotCount } from '../utils/StorageUtils.js';

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

  // Get current arena key
  function getCurrentArena() {
    return arenaManager ? arenaManager.getCurrentArena() : 'standard';
  }

  // Get arena size
  function getArenaSize() {
    return sceneManager ? sceneManager.getArenaSize() : 20;
  }

  // Get maximum bot count for current arena
  function getMaxBots() {
    return getMaxBotCount(getCurrentArena());
  }

  // Load and restore saved bot count
  async function restoreSavedBots() {
    if (!botManager || !healthBarManager) return;

    const arena = getCurrentArena();
    const savedCount = getBotCount(arena);
    
    if (savedCount > 0) {
      const maxBots = getMaxBots();
      const targetCount = Math.min(savedCount, maxBots);
      // Use getAllBots() to count all bots (alive and dead) that exist
      const currentCount = botManager.getAllBots().length;
      const botsToSpawn = Math.max(0, targetCount - currentCount);

      // Spawn bots up to saved count
      for (let i = 0; i < botsToSpawn; i++) {
        await spawnBot();
      }

      updateBotCount();
    }
  }

  // Spawn a single bot
  async function spawnBot() {
    if (!botManager) return null;

    const arenaSize = getArenaSize();
    const halfArena = (arenaSize / 2) - 1; // Leave some margin
    
    // Spawn bot at random position within arena bounds
    const x = (Math.random() - 0.5) * halfArena * 2;
    const z = (Math.random() - 0.5) * halfArena * 2;
    
    // Alternate between characters
    const characterName = botCounter % 2 === 0 ? 'herald' : 'lucy';
    const botId = `bot_${botCounter++}`;

    try {
      const bot = await botManager.createBot(botId, characterName, x, z);
      
      // Create health bar for bot (only if manager exists)
      if (healthBarManager) {
        // Check if health bar already exists for this bot
        const existingBar = healthBarManager.healthBars ? healthBarManager.healthBars.get(bot) : null;
        if (!existingBar) {
          healthBarManager.createHealthBar(bot, false);
        }
      }

      return bot;
    } catch (err) {
      console.error('Failed to create bot:', err);
      return null;
    }
  }

  async function handleAddBot() {
    if (!botManager) return;

    const currentCount = botManager.getBots().length;
    const maxBots = getMaxBots();

    // Check maximum limit
    if (currentCount >= maxBots) {
      botCountDisplay.textContent = `Bots: ${currentCount} (Max: ${maxBots})`;
      return;
    }

    const bot = await spawnBot();
    if (bot) {
      saveBotCount();
      updateBotCount();
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
      saveBotCount();
      updateBotCount();
    }
  }

  function updateBotCount() {
    if (botManager) {
      const count = botManager.getBots().length;
      const maxBots = getMaxBots();
      botCountDisplay.textContent = `Bots: ${count}${count >= maxBots ? ` / ${maxBots}` : ''}`;
    }
  }

  function saveBotCount() {
    if (!botManager) return;
    
    const arena = getCurrentArena();
    // Use getAllBots() to count all bots (alive and dead) that were manually spawned
    // This ensures we restore the same total number of bots on refresh
    const count = botManager.getAllBots().length;
    setBotCount(count, arena);
  }

  // Update bot count periodically
  setInterval(updateBotCount, 500);

  return {
    updateBotCount,
    restoreSavedBots
  };
}

