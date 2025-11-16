/**
 * GameBootstrap.js
 * 
 * Main game initialization orchestrator.
 * Coordinates manager initialization, UI setup, and game start.
 */

import { getParam } from '../utils/UrlUtils.js';
import { getLastCharacter, setLastCharacter, getLastGameMode, setLastGameMode } from '../utils/StorageUtils.js';
import { GAME_CONSTANTS } from '../config/global/GameConstants.js';
import { initializeManagers } from './ManagerInitializer.js';
import { initializeUI } from './UIInitializer.js';
import { sendPlayerState } from './MultiplayerHelpers.js';
import { getLoadingProgressManager } from '../utils/LoadingProgressManager.js';

/**
 * Get initial game configuration from URL params and localStorage
 * @returns {Object} Configuration object
 */
export function getInitialConfig() {
  const urlCharacter = getParam('char', null);
  const storedCharacter = getLastCharacter();
  const characterName = urlCharacter || storedCharacter || GAME_CONSTANTS.DEFAULT_CHARACTER;
  
  if (urlCharacter) {
    setLastCharacter(urlCharacter);
  }
  
  const urlGameMode = getParam('mode', null);
  const storedGameMode = getLastGameMode();
  const gameMode = urlGameMode || storedGameMode || GAME_CONSTANTS.DEFAULT_GAME_MODE;
  
  if (urlGameMode) {
    setLastGameMode(urlGameMode);
  }
  
  const urlArena = getParam('arena', GAME_CONSTANTS.DEFAULT_ARENA);
  const urlRoom = getParam('room', null);
  
  return {
    characterName,
    gameMode,
    arenaName: urlArena,
    roomCode: urlRoom
  };
}

/**
 * Initialize background music
 * @param {Object} characterManager - Character manager instance
 * @param {string} musicPath - Path to background music file
 */
export async function initializeBackgroundMusic(characterManager, musicPath) {
  if (!musicPath) return;
  
  const soundManager = characterManager.getSoundManager();
  if (!soundManager) return;
  
  await soundManager.loadBackgroundMusic(musicPath);
  
  // Fallback: If autoplay is blocked, try again on first user interaction
  let interactionHandled = false;
  const tryPlayOnInteraction = () => {
    if (interactionHandled) return;
    interactionHandled = true;
    
    if (!soundManager.isBackgroundMusicPlaying()) {
      soundManager.playBackgroundMusic();
    }
    
    document.removeEventListener('click', tryPlayOnInteraction);
    document.removeEventListener('keydown', tryPlayOnInteraction);
    document.removeEventListener('touchstart', tryPlayOnInteraction);
    document.removeEventListener('pointerdown', tryPlayOnInteraction);
  };
  
  document.addEventListener('click', tryPlayOnInteraction, { once: true });
  document.addEventListener('keydown', tryPlayOnInteraction, { once: true });
  document.addEventListener('touchstart', tryPlayOnInteraction, { once: true });
  document.addEventListener('pointerdown', tryPlayOnInteraction, { once: true });
}

/**
 * Setup game loop tick wrapper for additional per-frame updates
 * @param {Object} gameLoop - Game loop instance
 * @param {Object} managers - All game managers
 * @param {Object} uiComponents - All UI components
 */
export function setupGameLoopWrapper(gameLoop, managers, uiComponents) {
  const {
    sceneManager,
    characterManager,
    inputManager,
    gameModeManager,
    multiplayerManager,
    remotePlayerManager
  } = managers;
  
  const { gameMenu, scoreboard, cooldownIndicator } = uiComponents;
  
  let lastPositionSyncTime = 0;
  let lastAnimationUpdateTime = performance.now();
  const syncInterval = GAME_CONSTANTS.SYNC_INTERVAL;
  
  let lastStartButtonState = false;
  let lastScoreboardButtonState = false;
  
  const originalTick = gameLoop.tick.bind(gameLoop);
  
  gameLoop.tick = function() {
    const now = performance.now();
    originalTick();
    
    // Handle controller Start/Options button to toggle menu
    const gamepads = navigator.getGamepads();
    if (gamepads && gamepads.length > 0) {
      const gamepad = gamepads[0];
      if (gamepad) {
        const startButtonPressed = gamepad.buttons[9]?.pressed || false;
        if (startButtonPressed && !lastStartButtonState) {
          gameMenu.toggle();
        }
        lastStartButtonState = startButtonPressed;
      }
    }
    
    // Handle scoreboard toggle
    const isMenuOpen = uiComponents.isMenuOpen();
    if (!isMenuOpen && scoreboard) {
      const isScoreboardButtonPressed = inputManager.isScoreboardPressed();
      
      if (isScoreboardButtonPressed && !scoreboard.isOpen()) {
        scoreboard.show();
      } else if (!isScoreboardButtonPressed && scoreboard.isOpen()) {
        scoreboard.hide();
      }
      
      if (scoreboard.isOpen()) {
        scoreboard.refreshData();
      }
      
      lastScoreboardButtonState = isScoreboardButtonPressed;
    }
    
    // Update cooldown indicator (works in all game modes)
    if (cooldownIndicator) {
      cooldownIndicator.update();
    }
    
    // Update remote player animations
    if (remotePlayerManager) {
      const dt = (now - lastAnimationUpdateTime) / 1000;
      if (dt > 0) {
        remotePlayerManager.updateAnimations(dt, sceneManager.getCamera());
        lastAnimationUpdateTime = now;
      }
      
      // Cleanup stale players periodically
      if (Math.floor(now / GAME_CONSTANTS.STALE_PLAYER_CLEANUP) !== Math.floor((now - 16) / GAME_CONSTANTS.STALE_PLAYER_CLEANUP)) {
        remotePlayerManager.cleanupStalePlayers(GAME_CONSTANTS.STALE_PLAYER_CLEANUP);
        // Also cleanup orphaned meshes that might have been left behind
        remotePlayerManager.cleanupOrphanedMeshes();
        
        // Cleanup orphaned health bars
        if (managers.healthBarManager && typeof managers.healthBarManager.cleanupOrphanedHealthBars === 'function') {
          managers.healthBarManager.cleanupOrphanedHealthBars();
        }
      }
    }
    
    // Sync local player position with other players
    if (multiplayerManager && multiplayerManager.isInRoom() && characterManager.getPlayer()) {
      const syncNow = Date.now();
      if (syncNow - lastPositionSyncTime >= syncInterval) {
        sendPlayerState(multiplayerManager, characterManager, sceneManager, inputManager, 0);
        lastPositionSyncTime = syncNow;
      }
    }
  };
}

/**
 * Handle auto-join room from URL
 * @param {Object} multiplayerManager - Multiplayer manager instance
 * @param {Object} roomManager - Room manager UI component
 * @param {string} roomCode - Room code from URL
 * @param {Function} getCurrentGameState - Function to get current game state
 */
export async function handleAutoJoinRoom(multiplayerManager, roomManager, roomCode, getCurrentGameState) {
  if (!roomCode) return;
  
  const attemptAutoJoin = async () => {
    try {
      if (!multiplayerManager.isConnected()) {
        await multiplayerManager.waitForConnection();
      }
      
      const gameState = getCurrentGameState();
      await multiplayerManager.joinRoom(roomCode.toUpperCase(), gameState);
      roomManager.update();
    } catch (error) {
      console.error('Failed to auto-join room:', error);
      setTimeout(() => {
        attemptAutoJoin();
      }, GAME_CONSTANTS.AUTO_JOIN_RETRY_DELAY);
    }
  };
  
  setTimeout(attemptAutoJoin, GAME_CONSTANTS.AUTO_JOIN_DELAY);
}

/**
 * Setup debug utilities
 * @param {Object} managers - All game managers
 */
export function setupDebugUtilities(managers) {
  const { remotePlayerManager, inputManager } = managers;

  // Expose managers for debugging
  window.hifeManagers = managers;
  
  // Expose remotePlayerManager for debugging
  window.debugRemotePlayers = () => {
    if (remotePlayerManager) {
      remotePlayerManager.debugInfo();
    }
  };
  
  // Expose inputManager for gamepad debugging
  if (inputManager) {
    window.hifeInputManager = inputManager;
    window.setControllerSimulation = (type = 'xbox') => {
      if (!inputManager) return null;
      const normalized = (type || '').toString().toLowerCase();
      const validTypes = ['xbox', 'playstation', 'generic'];
      const controllerType = validTypes.includes(normalized) ? normalized : 'generic';

      if (controllerType !== 'generic') {
        inputManager._simulatedControllerType = controllerType;
        inputManager.controllerType = controllerType;
        inputManager.gamepadConnected = true;
        inputManager.setInputMode('controller');
        if (typeof inputManager._onControllerStatusChange === 'function') {
          inputManager._onControllerStatusChange(true, controllerType);
        }
      } else {
        inputManager._simulatedControllerType = null;
        inputManager.controllerType = 'generic';
        inputManager.gamepadConnected = false;
        if (inputManager.getInputMode() === 'controller') {
          inputManager.setInputMode('keyboard');
        }
        if (typeof inputManager._onControllerStatusChange === 'function') {
          inputManager._onControllerStatusChange(false, 'generic');
        }
      }

      const ui = window.hifeUI;
      if (ui?.gameMenu) {
        ui.gameMenu.checkControllerType?.();
      }
      ui?.controlsLegend?.update?.();
      ui?.controlsLegendMenu?.update?.();

      return controllerType;
    };

    window.activateGamepad = () => {
      if (inputManager) {
        return inputManager.forceGamepadActivation();
      }
      return false;
    };
    
    window.toggleGamepadLogging = (enabled) => {
      if (inputManager) {
        inputManager.setLoggingEnabled(enabled !== undefined ? enabled : !inputManager._loggingEnabled);
      }
    };
  }
}

/**
 * Hide loading screen
 */
export function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('is-hidden');
    setTimeout(() => {
      if (loadingScreen.parentNode) {
        loadingScreen.parentNode.removeChild(loadingScreen);
      }
    }, GAME_CONSTANTS.LOADING_SCREEN_REMOVE_DELAY);
  }
}

/**
 * Initialize game with character loading and setup
 * @param {Object} managers - All game managers
 * @param {Object} uiComponents - All UI components
 * @param {Object} config - Configuration object
 */
export async function initializeGame(managers, uiComponents, config) {
  const {
    characterManager,
    healthBarManager,
    sceneManager,
    gameModeManager,
    gameLoop
  } = managers;
  
  const { botControl } = uiComponents;
  const { characterName, gameMode } = config;
  
  const progressManager = getLoadingProgressManager();
  
  // Calculate total steps:
  // 1. Initializing managers (handled in main.js, 0-20%)
  // 2. Character animations (10 animations) - steps 1-10
  // 3. Character sounds (5 sounds: footstep, obstacle_footstep, jump, obstacle_jump, fly) - steps 11-15
  // 4. Ability sounds preloading (5 sounds: bolt_shot, mortar_launch, mortar_explosion, melee_swing, melee_hit) - steps 16-20
  // 5. Setting up game systems - step 21
  // Total: 21 steps for character loading + setup
  const totalSteps = 21;
  progressManager.setTotalSteps(totalSteps);
  
  // Track animation and sound loading separately
  let animationsComplete = false;
  let mainSoundsComplete = false;
  
  try {
    // Load character with progress tracking
    progressManager.setProgress(0, 'Loading character assets...');
    await characterManager.loadCharacter(characterName, (step, total, task) => {
      // The callback receives relative steps from within animation/sound loading
      // Animations: total=10, steps 1-10
      // Main sounds: total=5, steps 11-15 (happens after animations)
      // Ability sounds: total=5, steps 16-20 (happens after main sounds)
      if (total === 10) {
        // This is from animations - map to steps 1-10
        animationsComplete = (step === total);
        progressManager.setProgress(step, task);
      } else if (total === 5 && animationsComplete && !mainSoundsComplete) {
        // This is from main sounds - map to steps 11-15
        mainSoundsComplete = (step === total);
        progressManager.setProgress(10 + step, task);
      } else if (total === 5 && !animationsComplete) {
        // Sounds started before animations complete (shouldn't happen, but handle gracefully)
        mainSoundsComplete = (step === total);
        progressManager.setProgress(10 + step, task);
      } else if (total === 5 && step > 0 && step <= 5 && mainSoundsComplete && animationsComplete) {
        // This is from ability sound preloading - map to steps 16-20
        progressManager.setProgress(15 + step, task);
      }
    });
    
    // Set camera for health bar manager
    progressManager.setProgress(20, 'Setting up game systems...');
    if (healthBarManager) {
      healthBarManager.setCamera(sceneManager.getCamera());
    }
    
    // Create health bar for player if in shooting mode
    const initialMode = gameModeManager ? gameModeManager.getMode() : 'free-play';
    if (initialMode === 'shooting' && healthBarManager && characterManager.getPlayer()) {
      const player = characterManager.getPlayer();
      player.userData.health = characterManager.getHealth();
      player.userData.maxHealth = characterManager.getMaxHealth();
      healthBarManager.createHealthBar(player, true);
      
      // Restore saved bot count when starting in shooting mode
      if (botControl && typeof botControl.restoreSavedBots === 'function') {
        setTimeout(() => {
          botControl.restoreSavedBots();
        }, 200);
      }
    }
    
    progressManager.setProgress(21, 'Starting game...');
    gameLoop.start();
    
    // Small delay to show "Starting game..." message
    await new Promise(resolve => setTimeout(resolve, 100));
  } finally {
    hideLoadingScreen();
  }
}

