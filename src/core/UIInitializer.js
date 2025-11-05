/**
 * UIInitializer.js
 * 
 * Handles initialization of all UI components.
 * Separates UI setup from main.js for better organization.
 */

import { GameMenu } from '../ui/components/GameMenu/index.js';
import { initCharacterSwitcher } from '../ui/adapters/reactAdapters.jsx';
import { initControlsLegend } from '../ui/adapters/reactAdapters.jsx';
import { initGameModeSwitcher } from '../ui/adapters/reactAdapters.jsx';
import { initGameModeDisplay } from '../ui/components/GameModeDisplay/index.js';
import { initArenaSwitcher } from '../ui/components/ArenaSwitcher/index.js';
import { initRoomManager } from '../ui/components/RoomManager/index.js';
import { initBotControl } from '../ui/components/BotControl/index.js';
import { initLearningFeedback } from '../ui/components/LearningFeedback/index.js';
import { initCooldownIndicator } from '../ui/components/CooldownIndicator/index.js';
import { initConnectionStatus } from '../ui/components/ConnectionStatus/index.js';
import { initInputModeSwitcher } from '../ui/adapters/reactAdapters.jsx';
import { getParam } from '../utils/UrlUtils.js';
import { setLastCharacter, setLastGameMode, setLastInputMode, getLastInputMode, getSoundEffectsVolume, setSoundEffectsVolume, getBackgroundCinematicVolume, setBackgroundCinematicVolume, getVibrationIntensity, setVibrationIntensity, getControlsLegendVisible, setControlsLegendVisible } from '../utils/StorageUtils.js';
import { sendPlayerState } from './MultiplayerHelpers.js';
import { GAME_CONSTANTS } from '../config/global/GameConstants.js';

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
    learningManager,
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
  const learningFeedbackMount = document.getElementById('learning-feedback') || document.body;
  const cooldownMount = document.getElementById('cooldown-indicator') || document.body;
  const connectionStatusMount = document.getElementById('connection-status') || document.body;
  const legendMount = document.getElementById('controls-legend') || document.body;
  const legendWrapperMount = document.getElementById('controls-legend-wrapper') || document.body;
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
    characterManager: characterManager,
    inputManager: inputManager
  });
  
  // Show cooldown indicator in all game modes
  cooldownIndicator?.show();
  
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
  
  // Initialize controls legend (render into wrapper for in-game display)
  const controlsLegend = initControlsLegend({
    mount: legendWrapperMount,
    inputManager: inputManager,
    gameModeManager: gameModeManager
  });
  
  // Initialize controls legend for menu display (separate instance)
  const controlsLegendMenu = initControlsLegend({
    mount: legendMount,
    inputManager: inputManager,
    gameModeManager: gameModeManager
  });
  
  // Initialize controls legend visibility from storage
  const controlsLegendVisible = getControlsLegendVisible();
  const updateControlsLegendVisibility = (visible) => {
    if (legendWrapperMount) {
      if (visible) {
        legendWrapperMount.classList.add('is-visible');
      } else {
        legendWrapperMount.classList.remove('is-visible');
      }
      setControlsLegendVisible(visible);
    }
  };
  
  // Set initial visibility
  updateControlsLegendVisibility(controlsLegendVisible);
  
  // Update legends when game mode changes
  gameModeManager.setOnModeChangeCallback(() => {
    if (controlsLegend) {
      controlsLegend.update();
    }
    if (controlsLegendMenu) {
      controlsLegendMenu.update();
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
      
      // Cooldown indicator is now shown in all game modes
      
      if (mode === 'shooting') {
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
    learningManager: learningManager,
    healthBarManager: healthBarManager,
    arenaManager: arenaManager,
    sceneManager: sceneManager,
    inputManager: inputManager
  });
  
  // Initialize learning feedback
  const learningFeedback = initLearningFeedback({
    mount: learningFeedbackMount,
    learningManager: learningManager
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
    learningFeedbackMount,
    gameMode,
    characterManager,
    managers,
    updateControlsLegendVisibility
  });
  
  return {
    gameMenu,
    characterSwitcher,
    controlsLegend,
    inputModeSwitcher,
    cooldownIndicator,
    roomManager,
    botControl,
    learningFeedback,
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
  const learningSection = gameMenu.getSection('multiplayer', 'game-menu__section--learning-feedback');
  
  if (mode === 'shooting') {
    if (botSection) {
      botSection.style.display = 'block';
    }
    if (learningSection) {
      learningSection.style.display = 'block';
    }
  } else {
    if (botSection) {
      botSection.style.display = 'none';
    }
    if (learningSection) {
      learningSection.style.display = 'none';
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
    learningFeedbackMount,
    gameMode,
    characterManager,
    managers,
    updateControlsLegendVisibility
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
      // Add toggle for showing/hiding controls legend in-game
      const toggleContainer = document.createElement('div');
      toggleContainer.className = 'game-menu__control ui__control';
      toggleContainer.style.marginTop = '10px';
      
      const toggleLabel = document.createElement('label');
      toggleLabel.className = 'game-menu__label ui__label';
      toggleLabel.textContent = 'Show Controls UI';
      toggleLabel.style.marginRight = '10px';
      toggleLabel.style.cursor = 'pointer';
      toggleContainer.appendChild(toggleLabel);
      
      const toggleCheckbox = document.createElement('input');
      toggleCheckbox.type = 'checkbox';
      toggleCheckbox.checked = getControlsLegendVisible();
      toggleCheckbox.style.cursor = 'pointer';
      toggleCheckbox.style.width = '18px';
      toggleCheckbox.style.height = '18px';
      toggleCheckbox.tabIndex = 0; // Make focusable for controller navigation
      toggleCheckbox.addEventListener('change', (e) => {
        const visible = e.target.checked;
        if (updateControlsLegendVisibility) {
          updateControlsLegendVisibility(visible);
        }
      });
      toggleContainer.appendChild(toggleCheckbox);
      
      legendContent.appendChild(toggleContainer);
      
      // Add the controls legend component for menu display
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
  
  // Audio Settings Section
  const audioSettingsSection = gameMenu.addSection('settings', {
    title: 'Audio Settings',
    className: 'game-menu__section--audio-settings'
  });
  if (audioSettingsSection && characterManager) {
    const audioContent = audioSettingsSection.querySelector('.game-menu__section-content');
    if (audioContent) {
      const soundManager = characterManager.getSoundManager();
      const gameLoop = managers.gameLoop;
      
      // Sound Effects Volume Slider
      const soundEffectsContainer = document.createElement('div');
      soundEffectsContainer.className = 'game-menu__control ui__control';
      soundEffectsContainer.style.marginTop = '10px';
      
      const soundEffectsLabel = document.createElement('label');
      soundEffectsLabel.className = 'game-menu__label ui__label';
      soundEffectsLabel.textContent = 'Sound Effects';
      soundEffectsLabel.style.marginRight = '10px';
      soundEffectsContainer.appendChild(soundEffectsLabel);
      
      const soundEffectsSlider = document.createElement('input');
      soundEffectsSlider.type = 'range';
      soundEffectsSlider.min = '0';
      soundEffectsSlider.max = '1';
      soundEffectsSlider.step = '0.01';
      soundEffectsSlider.value = getSoundEffectsVolume();
      soundEffectsSlider.style.width = '200px';
      soundEffectsSlider.style.cursor = 'pointer';
      soundEffectsSlider.tabIndex = 0; // Make focusable for controller navigation
      soundEffectsSlider.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        setSoundEffectsVolume(volume);
        if (soundManager) {
          soundManager.setSoundEffectsVolume(volume);
        }
      });
      soundEffectsContainer.appendChild(soundEffectsSlider);
      
      const soundEffectsValue = document.createElement('span');
      soundEffectsValue.className = 'game-menu__value ui__label';
      soundEffectsValue.textContent = Math.round(getSoundEffectsVolume() * 100) + '%';
      soundEffectsValue.style.marginLeft = '10px';
      soundEffectsValue.style.minWidth = '40px';
      soundEffectsContainer.appendChild(soundEffectsValue);
      
      soundEffectsSlider.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        soundEffectsValue.textContent = Math.round(volume * 100) + '%';
      });
      
      audioContent.appendChild(soundEffectsContainer);
      
      // Background Cinematic Volume Slider
      const backgroundCinematicContainer = document.createElement('div');
      backgroundCinematicContainer.className = 'game-menu__control ui__control';
      backgroundCinematicContainer.style.marginTop = '10px';
      
      const backgroundCinematicLabel = document.createElement('label');
      backgroundCinematicLabel.className = 'game-menu__label ui__label';
      backgroundCinematicLabel.textContent = 'Background Cinematic';
      backgroundCinematicLabel.style.marginRight = '10px';
      backgroundCinematicContainer.appendChild(backgroundCinematicLabel);
      
      const backgroundCinematicSlider = document.createElement('input');
      backgroundCinematicSlider.type = 'range';
      backgroundCinematicSlider.min = '0';
      backgroundCinematicSlider.max = '1';
      backgroundCinematicSlider.step = '0.01';
      backgroundCinematicSlider.value = getBackgroundCinematicVolume();
      backgroundCinematicSlider.style.width = '200px';
      backgroundCinematicSlider.style.cursor = 'pointer';
      backgroundCinematicSlider.tabIndex = 0; // Make focusable for controller navigation
      backgroundCinematicSlider.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        setBackgroundCinematicVolume(volume);
        if (soundManager) {
          soundManager.setBackgroundMusicVolume(volume);
        }
      });
      backgroundCinematicContainer.appendChild(backgroundCinematicSlider);
      
      const backgroundCinematicValue = document.createElement('span');
      backgroundCinematicValue.className = 'game-menu__value ui__label';
      backgroundCinematicValue.textContent = Math.round(getBackgroundCinematicVolume() * 100) + '%';
      backgroundCinematicValue.style.marginLeft = '10px';
      backgroundCinematicValue.style.minWidth = '40px';
      backgroundCinematicContainer.appendChild(backgroundCinematicValue);
      
      backgroundCinematicSlider.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        backgroundCinematicValue.textContent = Math.round(volume * 100) + '%';
      });
      
      audioContent.appendChild(backgroundCinematicContainer);
      
      // Vibration Intensity Slider
      const vibrationContainer = document.createElement('div');
      vibrationContainer.className = 'game-menu__control ui__control';
      vibrationContainer.style.marginTop = '10px';
      
      const vibrationLabel = document.createElement('label');
      vibrationLabel.className = 'game-menu__label ui__label';
      vibrationLabel.textContent = 'Vibration Intensity';
      vibrationLabel.style.marginRight = '10px';
      vibrationContainer.appendChild(vibrationLabel);
      
      const vibrationSlider = document.createElement('input');
      vibrationSlider.type = 'range';
      vibrationSlider.min = '0';
      vibrationSlider.max = '1';
      vibrationSlider.step = '0.01';
      vibrationSlider.value = getVibrationIntensity();
      vibrationSlider.style.width = '200px';
      vibrationSlider.style.cursor = 'pointer';
      vibrationSlider.tabIndex = 0; // Make focusable for controller navigation
      vibrationSlider.addEventListener('input', (e) => {
        const intensity = parseFloat(e.target.value);
        setVibrationIntensity(intensity);
        if (gameLoop && gameLoop.vibrationManager) {
          gameLoop.vibrationManager.setIntensity(intensity);
        }
      });
      vibrationContainer.appendChild(vibrationSlider);
      
      const vibrationValue = document.createElement('span');
      vibrationValue.className = 'game-menu__value ui__label';
      vibrationValue.textContent = Math.round(getVibrationIntensity() * 100) + '%';
      vibrationValue.style.marginLeft = '10px';
      vibrationValue.style.minWidth = '40px';
      vibrationContainer.appendChild(vibrationValue);
      
      vibrationSlider.addEventListener('input', (e) => {
        const intensity = parseFloat(e.target.value);
        vibrationValue.textContent = Math.round(intensity * 100) + '%';
      });
      
      audioContent.appendChild(vibrationContainer);
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
  
  // Learning Feedback Section
  const learningSection = gameMenu.addSection('multiplayer', {
    title: 'Bot Learning Progress',
    className: 'game-menu__section--learning-feedback'
  });
  if (learningSection && learningFeedbackMount.firstChild) {
    const learningContent = learningSection.querySelector('.game-menu__section-content');
    if (learningContent) {
      while (learningFeedbackMount.firstChild) {
        learningContent.appendChild(learningFeedbackMount.firstChild);
      }
    }
    if (gameMode !== 'shooting') {
      learningSection.style.display = 'none';
    }
  }
}

