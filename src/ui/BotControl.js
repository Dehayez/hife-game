export function initBotControl({ mount, botManager, healthBarManager }) {
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

    // Spawn bot at random position
    const halfArena = 7;
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

      updateBotCount();
    } catch (err) {
      console.error('Failed to create bot:', err);
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
      updateBotCount();
    }
  }

  function updateBotCount() {
    if (botManager) {
      const count = botManager.getBots().length;
      botCountDisplay.textContent = `Bots: ${count}`;
    }
  }

  // Update bot count periodically
  setInterval(updateBotCount, 500);

  return {
    updateBotCount
  };
}

