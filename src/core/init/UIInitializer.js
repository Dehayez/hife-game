/**
 * UIInitializer.js
 * 
 * Handles initialization of all UI components.
 * Separates UI setup from main.js for better organization.
 */

import { GameMenu } from '../../ui/components/GameMenu/index.js';
import { initCharacterSwitcher } from '../../ui/adapters/reactAdapters.jsx';
import { initControlsLegend } from '../../ui/adapters/reactAdapters.jsx';
import { initGameModeSwitcher } from '../../ui/adapters/reactAdapters.jsx';
import { initGameModeDisplay } from '../../ui/components/GameModeDisplay/index.js';
import { initArenaSwitcher } from '../../ui/components/ArenaSwitcher/index.js';
import { initRoomManager } from '../../ui/components/RoomManager/index.js';
import { initBotControl } from '../../ui/components/BotControl/index.js';
import { initCooldownIndicator } from '../../ui/components/CooldownIndicator/index.js';
import { initConnectionStatus } from '../../ui/components/ConnectionStatus/index.js';
import { initInputModeSwitcher } from '../../ui/adapters/reactAdapters.jsx';
import { getParam } from '../../utils/UrlUtils.js';
import { setLastCharacter, setLastGameMode, setLastInputMode, getLastInputMode } from '../../utils/StorageUtils.js';
import { sendPlayerState } from './MultiplayerHelpers.js';
import { GAME_CONSTANTS } from '../../config/GameConstants.js';

/**
 * Initialize all UI components
 * @param {Object} managers - Object containing all game managers
 * @param {Object} config - Configuration object (characterName, gameMode, etc.)
 * @returns {Object} Object containing all initialized UI components
 */
export function initializeUI(managers, config) {
  const {
    inputManager,
    gameModeManager,
    characterManager,
    arenaManager,
    multiplayerManager,
    projectileManager,
    botManager,
    healthBarManager,
    sceneManager,
    gameLoop
  } = managers;
  
  const {
    characterName,
    gameMode,
    arenaName
  } = config;
  
  // Get mount points
  const charSwitcherMount = document.getElementById('char-switcher') || document.body;
  const arenaMount = document.getElementById('arena-switcher') || document.body;
  const roomMount = document.getElementById('room-manager') || document.body;
  const botControlMount = document.getElementById('bot-control') || document.body;
  const cooldownMount = document.getElementById('cooldown-indicator') || document.body;
  const connectionStatusMount = document.getElementById('connection-status') || document.body;
  const legendMount = document.getElementById('controls-legend') || document.body;
  const inputModeMount = document.getElementById('input-mode-switcher') || document.body;
  const modeDisplayMount = document.getElementById('game-mode-display') || document.body;
  const gameModeMount = document.getElementById('game-mode-switcher') || document.body;
  
  // Helper function to get current game state
  const getCurrentGameState = () => {
    return {
      arena: arenaManager.getCurrentArena(),
      gameMode: gameModeManager.getMode(),
      characterName: characterManager.getCharacterName()
    };
  };
  
  // Helper function to update URL parameter
  const updateURLParam = (paramName, paramValue) => {
    const url = new URL(window.location);
    url.searchParams.set(paramName, paramValue);
    return url.toString();
  };
  
  // Initialize input mode from storage
  const savedInputMode = getLastInputMode();
  let initialInputMode = savedInputMode;
  if (initialInputMode === 'controller' && !inputManager.isGamepadConnected()) {
    initialInputMode = 'keyboard';
    setLastInputMode('keyboard');
  }
  inputManager.setInputMode(initialInputMode);
  
  // Initialize cooldown indicator
  const cooldownIndicator = initCooldownIndicator({
    mount: cooldownMount,
    projectileManager: projectileManager,
    characterManager: characterManager
  });
  
  // Show/hide cooldown indicator based on initial mode
  if (gameMode === 'shooting') {
    cooldownIndicator?.show();
  } else {
    cooldownIndicator?.hide();
  }
  
  // Initialize connection status
  initConnectionStatus({
    mount: connectionStatusMount,
    multiplayerManager: multiplayerManager
  });
  
  // Initialize Game Menu
  const gameMenuRoot = document.getElementById('game-menu-root');
  let isMenuOpen = false;
  const gameMenu = new GameMenu({
    inputManager: inputManager,
    onVisibilityChange: (isVisible) => {
      isMenuOpen = isVisible;
      if (inputManager) {
        inputManager.setInputBlocked(isVisible);
      }
    },
    onMenuOpen: () => {
      isMenuOpen = true;
      if (inputManager) {
        inputManager.setInputBlocked(true);
      }
    },
    onMenuClose: () => {
      isMenuOpen = false;
      if (inputManager) {
        inputManager.setInputBlocked(false);
      }
    }
  });
  
  // Set up menu toggle button
  const menuToggleButton = document.getElementById('menu-toggle');
  if (menuToggleButton) {
    menuToggleButton.addEventListener('click', () => {
      gameMenu.toggle();
    });
  }
  
  // Initialize character switcher
  const characterSwitcher = initCharacterSwitcher({
    mount: charSwitcherMount,
    options: GAME_CONSTANTS.AVAILABLE_CHARACTERS,
    value: characterName,
    onChange: async (val) => {
      await characterManager.loadCharacter(val);
      setLastCharacter(val);
      
      if (multiplayerManager && multiplayerManager.isInRoom()) {
        const gameState = getCurrentGameState();
        gameState.characterName = val;
        multiplayerManager.sendCharacterChange(val);
        
        const localPlayerId = multiplayerManager.getLocalPlayerId();
        const playerInfo = multiplayerManager.getPlayerInfo(localPlayerId);
        if (playerInfo) {
          playerInfo.characterName = val;
        }
      }
    }
  });
  
  // Connect character switcher to game loop
  gameLoop.setCharacterUIUpdateCallback((characterName) => {
    characterSwitcher.setValue(characterName);
  });
  
  // Initialize controls legend
  const controlsLegend = initControlsLegend({
    mount: legendMount,
    inputManager: inputManager,
    gameModeManager: gameModeManager
  });
  
  // Update legend when game mode changes
  gameModeManager.setOnModeChangeCallback(() => {
    if (controlsLegend) {
      controlsLegend.update();
    }
  });
  
  // Initialize input mode switcher
  const inputModeSwitcher = initInputModeSwitcher({
    mount: inputModeMount,
    options: ['keyboard', 'controller'],
    value: initialInputMode,
    onChange: (mode) => {
      const success = inputManager.setInputMode(mode);
      if (success) {
        setLastInputMode(mode);
        if (controlsLegend) {
          controlsLegend.update();
        }
      }
    }
  });
  
  // Set initial controller availability
  inputModeSwitcher.setControllerAvailable(inputManager.isGamepadConnected());
  
  // Set up callback for controller connection status changes
  inputManager.setOnControllerStatusChange((isConnected) => {
    inputModeSwitcher.setControllerAvailable(isConnected);
    
    if (isConnected) {
      const success = inputManager.setInputMode('controller');
      if (success) {
        inputModeSwitcher.setValue('controller');
        setLastInputMode('controller');
        if (controlsLegend) {
          controlsLegend.update();
        }
      }
    } else {
      const currentMode = inputManager.getInputMode();
      if (currentMode === 'keyboard') {
        inputModeSwitcher.setValue('keyboard');
        setLastInputMode('keyboard');
        if (controlsLegend) {
          controlsLegend.update();
        }
      }
    }
  });
  
  // Initialize game mode display
  initGameModeDisplay({
    mount: modeDisplayMount,
    gameModeManager: gameModeManager,
    characterManager: characterManager
  });
  
  // Initialize game mode switcher
  initGameModeSwitcher({
    mount: gameModeMount,
    options: gameModeManager.getAllModes(),
    value: gameMode,
    onChange: (mode) => {
      gameModeManager.setMode(mode);
      setLastGameMode(mode);
      
      if (controlsLegend) {
        controlsLegend.update();
      }
      
      if (mode !== 'shooting' && projectileManager) {
        projectileManager.clearAll();
      }
      
      if (mode !== 'shooting' && multiplayerManager.isInRoom()) {
        multiplayerManager.leaveRoom();
        
        const url = new URL(window.location);
        url.searchParams.delete('room');
        window.history.pushState({}, '', url);
      }
      
      if (mode === 'shooting') {
        if (cooldownIndicator) {
          cooldownIndicator.show();
        }
        
        if (healthBarManager && characterManager.getPlayer()) {
          const player = characterManager.getPlayer();
          const existingBar = healthBarManager.healthBars.get(player);
          if (!existingBar) {
            player.userData.health = characterManager.getHealth();
            player.userData.maxHealth = characterManager.getMaxHealth();
            healthBarManager.createHealthBar(player, true);
          }
        }
        
        updateMenuForMode(mode, gameMenu);
      } else {
        if (cooldownIndicator) {
          cooldownIndicator.hide();
        }
        
        if (botManager) {
          botManager.clearAll();
        }
        if (healthBarManager) {
          healthBarManager.clearAll();
        }
        
        updateMenuForMode(mode, gameMenu);
      }
    },
    gameModeManager: gameModeManager
  });
  
  // Initialize arena switcher
  initArenaSwitcher({
    mount: arenaMount,
    options: arenaManager.getArenas(),
    value: arenaName,
    onChange: (arena) => {
      window.location.href = updateURLParam('arena', arena);
    }
  });
  
  // Initialize room manager
  const roomManager = initRoomManager({
    mount: roomMount,
    multiplayerManager: multiplayerManager,
    onRoomCreated: async (roomCode) => {
      const gameState = getCurrentGameState();
      try {
        const actualRoomCode = await multiplayerManager.createRoom(gameState);
        
        const url = new URL(window.location);
        url.searchParams.set('room', actualRoomCode);
        window.history.pushState({}, '', url);
        
        roomManager.update();
        
        if (characterManager.getPlayer()) {
          setTimeout(() => {
            sendPlayerState(multiplayerManager, characterManager, sceneManager, inputManager, 0);
          }, 100);
        }
        
        if (gameModeManager.getMode() !== 'shooting') {
          gameModeManager.setMode('shooting');
          setLastGameMode('shooting');
        }
        gameModeManager.startMode();
      } catch (error) {
        console.error('Failed to create room:', error);
      }
    },
    onRoomJoined: async (roomCode) => {
      const gameState = getCurrentGameState();
      try {
        const joinResult = await multiplayerManager.joinRoom(roomCode, gameState);
        
        if (characterManager.getPlayer()) {
          setTimeout(() => {
            sendPlayerState(multiplayerManager, characterManager, sceneManager, inputManager, 0);
          }, 100);
        }
        
        setTimeout(() => {
          multiplayerManager.requestExistingPlayers(() => {
            if (characterManager.getPlayer()) {
              sendPlayerState(multiplayerManager, characterManager, sceneManager, inputManager, 0);
            }
          });
        }, 200);
        
        if (gameModeManager.getMode() !== 'shooting') {
          gameModeManager.setMode('shooting');
          setLastGameMode('shooting');
        }
        gameModeManager.startMode();
      } catch (error) {
        console.error('Failed to join room:', error);
      }
    }
  });
  
  // Initialize bot control
  const botControl = initBotControl({
    mount: botControlMount,
    botManager: botManager,
    healthBarManager: healthBarManager,
    arenaManager: arenaManager,
    sceneManager: sceneManager
  });
  
  // Build menu structure
  buildMenuStructure(gameMenu, {
    modeDisplayMount,
    gameModeMount,
    arenaMount,
    legendMount,
    inputModeMount,
    roomMount,
    botControlMount,
    gameMode
  });
  
  return {
    gameMenu,
    characterSwitcher,
    controlsLegend,
    inputModeSwitcher,
    cooldownIndicator,
    roomManager,
    botControl,
    scoreboard: managers.scoreboard,
    isMenuOpen: () => isMenuOpen,
    setIsMenuOpen: (value) => { isMenuOpen = value; }
  };
}

/**
 * Update menu sections based on game mode
 */
function updateMenuForMode(mode, gameMenu) {
  const botSection = gameMenu.getSection('multiplayer', 'game-menu__section--bot-control');
  
  if (mode === 'shooting') {
    if (botSection) {
      botSection.style.display = 'block';
    }
  } else {
    if (botSection) {
      botSection.style.display = 'none';
    }
  }
}

/**
 * Build menu structure with all UI components
 */
function buildMenuStructure(gameMenu, mounts) {
  const {
    modeDisplayMount,
    gameModeMount,
    arenaMount,
    legendMount,
    inputModeMount,
    roomMount,
    botControlMount,
    gameMode
  } = mounts;
  
  // Game Mode Display Section
  const modeDisplaySection = gameMenu.addSection('settings', {
    title: 'Current Game Mode',
    className: 'game-menu__section--mode-display'
  });
  if (modeDisplaySection && modeDisplayMount) {
    const modeDisplayContent = modeDisplaySection.querySelector('.game-menu__section-content');
    if (modeDisplayContent) {
      modeDisplayContent.appendChild(modeDisplayMount);
      modeDisplayMount.style.display = 'block';
    }
  }
  
  // Game Mode Section
  const gameModeSection = gameMenu.addSection('settings', {
    title: 'Game Mode',
    className: 'game-menu__section--game-mode'
  });
  if (gameModeSection && gameModeMount) {
    const gameModeContent = gameModeSection.querySelector('.game-menu__section-content');
    if (gameModeContent) {
      gameModeContent.appendChild(gameModeMount);
      gameModeMount.style.display = 'block';
    }
  }
  
  // Arena Selection Section
  const arenaSection = gameMenu.addSection('settings', {
    title: 'Arena',
    className: 'game-menu__section--arena'
  });
  if (arenaSection && arenaMount) {
    const arenaContent = arenaSection.querySelector('.game-menu__section-content');
    if (arenaContent) {
      arenaContent.appendChild(arenaMount);
      arenaMount.style.display = 'block';
    }
  }
  
  // Controls Legend Section
  const legendSection = gameMenu.addSection('settings', {
    title: 'Controls',
    className: 'game-menu__section--controls-legend'
  });
  if (legendSection && legendMount) {
    const legendContent = legendSection.querySelector('.game-menu__section-content');
    if (legendContent) {
      legendContent.appendChild(legendMount);
      legendMount.style.display = 'block';
    }
  }
  
  // Input Mode Section
  const inputModeSection = gameMenu.addSection('settings', {
    title: 'Input Mode',
    className: 'game-menu__section--input-mode'
  });
  if (inputModeSection && inputModeMount) {
    const inputModeContent = inputModeSection.querySelector('.game-menu__section-content');
    if (inputModeContent) {
      inputModeContent.appendChild(inputModeMount);
      inputModeMount.style.display = 'block';
    }
  }
  
  // Room Manager Section
  const roomSection = gameMenu.addSection('multiplayer', {
    title: 'Multiplayer Room',
    className: 'game-menu__section--room-manager'
  });
  if (roomSection && roomMount.firstChild) {
    const roomContent = roomSection.querySelector('.game-menu__section-content');
    if (roomContent) {
      while (roomMount.firstChild) {
        roomContent.appendChild(roomMount.firstChild);
      }
    }
  }
  
  // Bot Control Section
  const botSection = gameMenu.addSection('multiplayer', {
    title: 'Bot Control',
    className: 'game-menu__section--bot-control'
  });
  if (botSection && botControlMount.firstChild) {
    const botContent = botSection.querySelector('.game-menu__section-content');
    if (botContent) {
      while (botControlMount.firstChild) {
        botContent.appendChild(botControlMount.firstChild);
      }
    }
    if (gameMode !== 'shooting') {
      botSection.style.display = 'none';
    }
  }
}

