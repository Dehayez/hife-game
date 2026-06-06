/**
 * UIInitializer.js
 * 
 * Handles initialization of all UI components.
 * Separates UI setup from main.js for better organization.
 */

import { GameMenu } from '../ui/components/GameMenu/index.js';
import { MenuIcons } from '../ui/components/GameMenu/icons.js';
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
import { initMinimap } from '../ui/components/Minimap/index.js';
import { initInputModeSwitcher } from '../ui/adapters/reactAdapters.jsx';
import { getParam } from '../utils/UrlUtils.js';
import { setLastCharacter, setLastGameMode, setLastInputMode, getLastInputMode, getSoundEffectsVolume, setSoundEffectsVolume, getBackgroundCinematicVolume, setBackgroundCinematicVolume, getVibrationIntensity, setVibrationIntensity, getControlsLegendVisible, setControlsLegendVisible } from '../utils/StorageUtils.js';
import { VIEW_MODE, getCameraViewMode, setCameraViewMode } from '../config/camera/CameraViewMode.js';
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
    collisionManager,
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
  const minimapMount = document.getElementById('minimap') || document.body;
  const legendMount = document.getElementById('controls-legend') || document.body;
  const legendWrapperMount = document.getElementById('controls-legend-wrapper') || document.body;
  const inputModeMount = document.getElementById('input-mode-switcher') || document.body;
  const modeDisplayMount = document.getElementById('game-mode-display') || document.body;
  const gameModeMount = document.getElementById('game-mode-switcher') || document.body;
  
  // Helper function to get current game state. Includes the local player's
  // position so the server can hand it to other players during the join
  // handshake (prevents remote players spawning at the world origin).
  const getCurrentGameState = () => {
    const player = characterManager.getPlayer();
    const state = {
      arena: arenaManager.getCurrentArena(),
      gameMode: gameModeManager.getMode(),
      characterName: characterManager.getCharacterName()
    };
    if (player && player.position) {
      state.position = {
        x: player.position.x,
        y: player.position.y,
        z: player.position.z
      };
    }
    return state;
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
  
  // Initialize minimap
  const minimap = initMinimap({
    mount: minimapMount,
    sceneManager: sceneManager,
    characterManager: characterManager,
    remotePlayerManager: managers.remotePlayerManager,
    botManager: botManager,
    projectileManager: projectileManager,
    arenaManager: arenaManager,
    collisionManager: collisionManager,
    entityManager: managers.entityManager
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
        if (inputManager._releasePointerLock) {
          inputManager._releasePointerLock();
        }
      }
    },
    onMenuClose: () => {
      isMenuOpen = false;
      if (inputManager) {
        inputManager.setInputBlocked(false);
        if (getCameraViewMode() === VIEW_MODE.FIRST_PERSON &&
            inputManager._requestPointerLockIfAppropriate) {
          inputManager._requestPointerLockIfAppropriate();
        }
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
      if (inputManager && typeof inputManager.applyCharacterMovementStats === 'function') {
        inputManager.applyCharacterMovementStats(val);
      }
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
        if (controlsLegendMenu) {
          controlsLegendMenu.update();
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
        if (controlsLegendMenu) {
          controlsLegendMenu.update();
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
  
  // Declare gameModeSwitcher variable so it can be captured in closure
  let gameModeSwitcher;
  
  // Helper function to switch game mode and handle all side effects
  const switchGameMode = (mode, updateUI = true) => {
    if (gameModeManager.getMode() === mode) {
      return; // Already in this mode
    }

    // Apocalypse Cottage requires its own arena. If the user picks the mode
    // while standing in any other arena, reload with both URL params set so
    // the sandbox boots correctly.
    if (mode === 'apocalypse-cottage' && arenaManager.getCurrentArena() !== 'apocalypse-cottage') {
      setLastGameMode(mode);
      const url = new URL(window.location);
      url.searchParams.set('mode', mode);
      url.searchParams.set('arena', 'apocalypse-cottage');
      window.location.href = url.toString();
      return;
    }

    gameModeManager.setMode(mode);
    setLastGameMode(mode);
    
    // Update UI switcher if requested
    if (updateUI && gameModeSwitcher) {
      gameModeSwitcher.setValue(mode);
    }
    
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
      window.history.replaceState({}, '', url);

      if (roomManager) roomManager.update();
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
  };
  
  // Initialize game mode switcher
  gameModeSwitcher = initGameModeSwitcher({
    mount: gameModeMount,
    options: gameModeManager.getAllModes(),
    value: gameMode,
    onChange: (mode) => {
      switchGameMode(mode, false); // Don't update UI switcher since onChange already handles it
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
  
  // Initialize room manager. onRoomCreated/onRoomJoined return the resolved room code
  // and rethrow on failure so RoomManager can surface the error inline.
  const enterMultiplayerShootingMode = () => {
    if (characterManager.getPlayer()) {
      setTimeout(() => {
        sendPlayerState(multiplayerManager, characterManager, sceneManager, inputManager, 0);
      }, 50);
    }
    if (gameModeManager.getMode() !== 'shooting') {
      gameModeManager.setMode('shooting');
      setLastGameMode('shooting');
    }
    gameModeManager.startMode();
  };

  const roomManager = initRoomManager({
    mount: roomMount,
    multiplayerManager: multiplayerManager,
    onRoomCreated: async (isPrivate = false) => {
      const gameState = getCurrentGameState();
      const actualRoomCode = await multiplayerManager.createRoom(gameState, { isPrivate });
      enterMultiplayerShootingMode();
      return actualRoomCode;
    },
    onRoomJoined: async (roomCode) => {
      const gameState = getCurrentGameState();
      // joinRoom already returns existingPlayers in its callback; the
      // MultiplayerManager spawns them via onPlayerJoined. No need for a
      // second request-existing-players round trip.
      await multiplayerManager.joinRoom(roomCode, gameState);
      enterMultiplayerShootingMode();
      return roomCode;
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
    inputManager: inputManager,
    gameModeManager: gameModeManager,
    switchGameMode: switchGameMode
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
  
  const uiApi = {
    gameMenu,
    characterSwitcher,
    controlsLegend,
    controlsLegendMenu,
    inputModeSwitcher,
    cooldownIndicator,
    roomManager,
    botControl,
    learningFeedback,
    minimap,
    scoreboard: managers.scoreboard,
    isMenuOpen: () => isMenuOpen,
    setIsMenuOpen: (value) => { isMenuOpen = value; }
  };

  window.hifeUI = uiApi;

  return uiApi;
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
  const inputManager = managers?.inputManager;
  
  // Game Mode Display Section
  const modeDisplaySection = gameMenu.addSection('settings', {
    title: 'Current Game Mode',
    icon: MenuIcons.currentGameMode,
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
    icon: MenuIcons.gameMode,
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
    icon: MenuIcons.arena,
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
    icon: MenuIcons.controls,
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
    icon: MenuIcons.inputMode,
    className: 'game-menu__section--input-mode'
  });
  if (inputModeSection && inputModeMount) {
    const inputModeContent = inputModeSection.querySelector('.game-menu__section-content');
    if (inputModeContent) {
      inputModeContent.appendChild(inputModeMount);
      inputModeMount.style.display = 'block';
    }
  }
  
  // Camera View Section
  const viewSection = gameMenu.addSection('settings', {
    title: 'View',
    icon: MenuIcons.viewMode,
    className: 'game-menu__section--view-mode'
  });
  if (viewSection) {
    const viewContent = viewSection.querySelector('.game-menu__section-content');
    if (viewContent) {
      const viewControl = document.createElement('div');
      viewControl.className = 'game-menu__control ui__control';

      const viewLabel = document.createElement('label');
      viewLabel.className = 'game-menu__label ui__label';
      viewLabel.textContent = 'Camera View';
      viewControl.appendChild(viewLabel);

      const viewSelect = document.createElement('select');
      viewSelect.className = 'game-menu__select ui__select';
      viewSelect.tabIndex = 0;
      const thirdOption = document.createElement('option');
      thirdOption.value = VIEW_MODE.THIRD_PERSON;
      thirdOption.textContent = 'Third-Person';
      const firstOption = document.createElement('option');
      firstOption.value = VIEW_MODE.FIRST_PERSON;
      firstOption.textContent = 'First-Person';
      viewSelect.appendChild(thirdOption);
      viewSelect.appendChild(firstOption);
      viewSelect.value = getCameraViewMode();
      viewSelect.addEventListener('change', (e) => {
        const next = e.target.value;
        if (next === getCameraViewMode()) return;
        if (inputManager && inputManager.toggleViewMode) {
          inputManager.toggleViewMode();
        } else {
          setCameraViewMode(next);
        }
      });
      viewControl.appendChild(viewSelect);
      viewContent.appendChild(viewControl);

      // Keep the dropdown in sync when the user toggles via hotkey / R3.
      if (inputManager && inputManager.setOnViewModeChange) {
        const existing = inputManager._fpvOnViewModeChange;
        inputManager.setOnViewModeChange((mode) => {
          if (existing) existing(mode);
          if (viewSelect.value !== mode) viewSelect.value = mode;
        });
      }
    }
  }

  // Audio Settings Section
  const audioSettingsSection = gameMenu.addSection('settings', {
    title: 'Audio Settings',
    icon: MenuIcons.audioSettings,
    className: 'game-menu__section--audio-settings'
  });
  if (audioSettingsSection && characterManager) {
    const audioContent = audioSettingsSection.querySelector('.game-menu__section-content');
    if (audioContent) {
      const soundManager = characterManager.getSoundManager();
      const gameLoop = managers.gameLoop;

      // Keep the gold fill on the slider track in sync with the thumb position.
      const syncSliderFill = (slider) => {
        const min = parseFloat(slider.min) || 0;
        const max = parseFloat(slider.max) || 1;
        const value = parseFloat(slider.value);
        const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
        slider.style.setProperty('--ui-slider-fill', `${pct}%`);
      };
      
      // Sound Effects Volume Slider
      const soundEffectsContainer = document.createElement('div');
      soundEffectsContainer.className = 'game-menu__control ui__control';

      const soundEffectsLabel = document.createElement('label');
      soundEffectsLabel.className = 'game-menu__label ui__label';
      soundEffectsLabel.textContent = 'Sound Effects';
      soundEffectsContainer.appendChild(soundEffectsLabel);

      const soundEffectsSlider = document.createElement('input');
      soundEffectsSlider.type = 'range';
      soundEffectsSlider.min = '0';
      soundEffectsSlider.max = '1';
      soundEffectsSlider.step = '0.01';
      soundEffectsSlider.value = getSoundEffectsVolume();
      soundEffectsSlider.tabIndex = 0;
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
      soundEffectsContainer.appendChild(soundEffectsValue);
      
      soundEffectsSlider.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        soundEffectsValue.textContent = Math.round(volume * 100) + '%';
        syncSliderFill(soundEffectsSlider);
      });
      syncSliderFill(soundEffectsSlider);

      audioContent.appendChild(soundEffectsContainer);
      
      // Background Cinematic Volume Slider
      const backgroundCinematicContainer = document.createElement('div');
      backgroundCinematicContainer.className = 'game-menu__control ui__control';

      const backgroundCinematicLabel = document.createElement('label');
      backgroundCinematicLabel.className = 'game-menu__label ui__label';
      backgroundCinematicLabel.textContent = 'Background Cinematic';
      backgroundCinematicContainer.appendChild(backgroundCinematicLabel);

      const backgroundCinematicSlider = document.createElement('input');
      backgroundCinematicSlider.type = 'range';
      backgroundCinematicSlider.min = '0';
      backgroundCinematicSlider.max = '1';
      backgroundCinematicSlider.step = '0.01';
      backgroundCinematicSlider.value = getBackgroundCinematicVolume();
      backgroundCinematicSlider.tabIndex = 0;
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
      backgroundCinematicContainer.appendChild(backgroundCinematicValue);
      
      backgroundCinematicSlider.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        backgroundCinematicValue.textContent = Math.round(volume * 100) + '%';
        syncSliderFill(backgroundCinematicSlider);
      });
      syncSliderFill(backgroundCinematicSlider);

      audioContent.appendChild(backgroundCinematicContainer);
      
      // Vibration Intensity Slider
      const vibrationContainer = document.createElement('div');
      vibrationContainer.className = 'game-menu__control ui__control';

      const vibrationLabel = document.createElement('label');
      vibrationLabel.className = 'game-menu__label ui__label';
      vibrationLabel.textContent = 'Vibration Intensity';
      vibrationContainer.appendChild(vibrationLabel);

      const vibrationSlider = document.createElement('input');
      vibrationSlider.type = 'range';
      vibrationSlider.min = '0';
      vibrationSlider.max = '1';
      vibrationSlider.step = '0.01';
      vibrationSlider.value = getVibrationIntensity();
      vibrationSlider.tabIndex = 0;
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
      vibrationContainer.appendChild(vibrationValue);
      
      vibrationSlider.addEventListener('input', (e) => {
        const intensity = parseFloat(e.target.value);
        vibrationValue.textContent = Math.round(intensity * 100) + '%';
        syncSliderFill(vibrationSlider);
      });
      syncSliderFill(vibrationSlider);

      audioContent.appendChild(vibrationContainer);
    }
  }
  
  // Room Manager Section
  const roomSection = gameMenu.addSection('multiplayer', {
    title: 'Rooms',
    icon: MenuIcons.rooms,
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
    icon: MenuIcons.botControl,
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
    icon: MenuIcons.learning,
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

