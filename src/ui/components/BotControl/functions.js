import { getBotCount, setBotCount, getMaxBotCount } from '../../../utils/StorageUtils.js';

export { getBotCount };

export function getCurrentArena(arenaManager) {
  return arenaManager ? arenaManager.getCurrentArena() : 'standard';
}

export function getArenaSize(sceneManager) {
  return sceneManager ? sceneManager.getArenaSize() : 20;
}

export function getMaxBots(arenaManager) {
  return getMaxBotCount(getCurrentArena(arenaManager));
}

export async function spawnBot(botManager, healthBarManager, arenaSize, botCounter) {
  if (!botManager) return null;

  const halfArena = (arenaSize / 2) - 1; // Leave some margin
  
  // Spawn bot at random position within arena bounds
  const x = (Math.random() - 0.5) * halfArena * 2;
  const z = (Math.random() - 0.5) * halfArena * 2;
  
  // Alternate between characters
  const characterName = botCounter % 2 === 0 ? 'herald' : 'lucy';
  const botId = `bot_${botCounter}`;

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
    return null;
  }
}

export function updateBotCount(botManager, botCountDisplay, arenaManager) {
  if (botManager) {
    const count = botManager.getBots().length;
    const maxBots = getMaxBots(arenaManager);
    botCountDisplay.textContent = `Bots: ${count}${count >= maxBots ? ` / ${maxBots}` : ''}`;
  }
}

export function saveBotCount(botManager, arenaManager) {
  if (!botManager) return;
  
  const arena = getCurrentArena(arenaManager);
  // Use getAllBots() to count all bots (alive and dead) that were manually spawned
  // This ensures we restore the same total number of bots on refresh
  const count = botManager.getAllBots().length;
  setBotCount(count, arena);
}

export async function restoreSavedBots(botManager, healthBarManager, arenaManager, sceneManager, spawnBotFn, updateBotCountFn) {
  if (!botManager || !healthBarManager) return;

  const arena = getCurrentArena(arenaManager);
  const savedCount = getBotCount(arena);
  
  if (savedCount > 0) {
    const maxBots = getMaxBots(arenaManager);
    const targetCount = Math.min(savedCount, maxBots);
    // Use getAllBots() to count all bots (alive and dead) that exist
    const currentCount = botManager.getAllBots().length;
    const botsToSpawn = Math.max(0, targetCount - currentCount);

    // Spawn bots up to saved count
    for (let i = 0; i < botsToSpawn; i++) {
      const arenaSize = getArenaSize(sceneManager);
      await spawnBotFn(botManager, healthBarManager, arenaSize, i);
    }

    updateBotCountFn();
  }
}

