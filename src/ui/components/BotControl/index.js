import { getMaxBots, spawnBot, updateBotCount, saveBotCount, restoreSavedBots as restoreSavedBotsFn, getArenaSize } from './functions.js';
import { getAvailableDifficulties, BOT_DIFFICULTY } from '../../../config/bot/BotDifficultyConfig.js';
import { getLastBotDifficulty, setLastBotDifficulty } from '../../../utils/StorageUtils.js';

export function initBotControl({ mount, botManager, healthBarManager, arenaManager, sceneManager, learningManager, inputManager }) {
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

  // Difficulty selector - custom button-based UI for controller support
  const difficultyWrapper = document.createElement('div');
  difficultyWrapper.className = 'ui__bot-difficulty';
  
  const difficultyLabel = document.createElement('span');
  difficultyLabel.className = 'ui__bot-difficulty__label';
  difficultyLabel.textContent = 'Difficulty:';
  
  const difficultyContainer = document.createElement('div');
  difficultyContainer.className = 'ui__bot-difficulty__container';
  difficultyContainer.setAttribute('role', 'group');
  difficultyContainer.setAttribute('aria-label', 'Bot difficulty');
  
  const difficultyButton = document.createElement('button');
  difficultyButton.type = 'button';
  difficultyButton.className = 'ui__bot-difficulty__button';
  difficultyButton.setAttribute('aria-label', 'Bot difficulty selector');
  difficultyButton.setAttribute('tabindex', '0');
  
  const difficultyValue = document.createElement('span');
  difficultyValue.className = 'ui__bot-difficulty__value';
  
  const difficultyArrow = document.createElement('span');
  difficultyArrow.className = 'ui__bot-difficulty__arrow';
  difficultyArrow.setAttribute('aria-hidden', 'true');
  difficultyArrow.innerHTML = '▼';
  
  difficultyButton.appendChild(difficultyValue);
  difficultyButton.appendChild(difficultyArrow);
  difficultyContainer.appendChild(difficultyButton);
  
  difficultyWrapper.appendChild(difficultyLabel);
  difficultyWrapper.appendChild(difficultyContainer);
  
  const difficulties = getAvailableDifficulties();
  const difficultyNames = {
    [BOT_DIFFICULTY.EASY]: 'Easy',
    [BOT_DIFFICULTY.BEGINNER]: 'Beginner',
    [BOT_DIFFICULTY.MIDWAY]: 'Midway',
    [BOT_DIFFICULTY.VETERAN]: 'Veteran'
  };
  
  // Load saved difficulty
  const savedDifficulty = getLastBotDifficulty();
  let currentDifficultyIndex = 0;
  if (savedDifficulty && difficulties.includes(savedDifficulty)) {
    currentDifficultyIndex = difficulties.indexOf(savedDifficulty);
  } else {
    currentDifficultyIndex = difficulties.indexOf(BOT_DIFFICULTY.BEGINNER);
  }
  
  function updateDifficultyDisplay() {
    const currentDifficulty = difficulties[currentDifficultyIndex];
    difficultyValue.textContent = difficultyNames[currentDifficulty] || currentDifficulty;
    difficultyButton.setAttribute('aria-label', `Bot difficulty: ${difficultyNames[currentDifficulty] || currentDifficulty}`);
  }
  
  function setDifficulty(index) {
    if (index < 0) index = difficulties.length - 1;
    if (index >= difficulties.length) index = 0;
    currentDifficultyIndex = index;
    const difficulty = difficulties[currentDifficultyIndex];
    updateDifficultyDisplay();
    
    if (botManager) {
      botManager.setDifficulty(difficulty);
    }
    if (learningManager) {
      learningManager.setDifficulty(difficulty);
    }
    setLastBotDifficulty(difficulty);
  }
  
  // Initialize difficulty
  setDifficulty(currentDifficultyIndex);
  
  // Button click handler - cycles through difficulties
  difficultyButton.addEventListener('click', () => {
    setDifficulty(currentDifficultyIndex + 1);
  });
  
  // Keyboard navigation support
  difficultyButton.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setDifficulty(currentDifficultyIndex - 1);
    } else if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setDifficulty(currentDifficultyIndex + 1);
    }
  });
  
  // Controller navigation support
  if (inputManager) {
    let buttonPressCooldown = false;
    
    const handleControllerInput = () => {
      // Only process if difficulty button is focused
      if (document.activeElement !== difficultyButton) return;
      
      const gamepads = navigator.getGamepads();
      if (!gamepads || gamepads.length === 0) return;
      
      const gamepad = gamepads[0];
      if (!gamepad) return;
      
      // Prevent rapid-fire button presses
      if (buttonPressCooldown) return;
      
      // D-pad left/right or left stick horizontal
      const dpadLeft = gamepad.buttons[14]?.pressed;
      const dpadRight = gamepad.buttons[15]?.pressed;
      const leftStickX = gamepad.axes[0] || 0;
      const stickThreshold = 0.7;
      
      if (dpadLeft || leftStickX < -stickThreshold) {
        buttonPressCooldown = true;
        setDifficulty(currentDifficultyIndex - 1);
        setTimeout(() => {
          buttonPressCooldown = false;
        }, 200);
      } else if (dpadRight || leftStickX > stickThreshold) {
        buttonPressCooldown = true;
        setDifficulty(currentDifficultyIndex + 1);
        setTimeout(() => {
          buttonPressCooldown = false;
        }, 200);
      }
    };
    
    // Check controller input on gamepad update (only when controller mode is active)
    setInterval(() => {
      const inputMode = inputManager.getInputMode();
      if (inputMode === 'controller' && document.activeElement === difficultyButton) {
        handleControllerInput();
      }
    }, 50);
  }

  wrapper.appendChild(addBotButton);
  wrapper.appendChild(removeBotButton);
  wrapper.appendChild(botCountDisplay);
  wrapper.appendChild(difficultyWrapper);

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
    restoreSavedBots,
    getDifficulty: () => difficulties[currentDifficultyIndex],
    setDifficulty: (difficulty) => {
      const index = difficulties.indexOf(difficulty);
      if (index !== -1) {
        setDifficulty(index);
      }
    }
  };
}

