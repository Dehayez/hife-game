/**
 * GameBootstrap.js
 * 
 * Main game initialization orchestrator.
 * Coordinates manager initialization, UI setup, and game start.
 */

import { getParam } from '../../utils/UrlUtils.js';
import { getLastCharacter, setLastCharacter, getLastGameMode, setLastGameMode } from '../../utils/StorageUtils.js';
import { GAME_CONSTANTS } from '../../config/global/GameConstants.js';
import { initializeManagers } from './ManagerInitializer.js';
import { initializeUI } from './UIInitializer.js';
import { sendPlayerState } from './MultiplayerHelpers.js';

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
export function initializeBackgroundMusic(characterManager, musicPath) {
  if (!musicPath) return;
  
  const soundManager = characterManager.getSoundManager();
  if (!soundManager) return;
  
  soundManager.loadBackgroundMusic(musicPath);
  
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
    
    // Handle Xbox Start button to toggle menu
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
    
    // Update cooldown indicator
    if (cooldownIndicator && gameModeManager && gameModeManager.getMode() === 'shooting') {
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
  
  // Expose remotePlayerManager for debugging
  window.debugRemotePlayers = () => {
    if (remotePlayerManager) {
      remotePlayerManager.debugInfo();
    }
  };
  
  // Expose inputManager for gamepad debugging
  if (inputManager) {
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
  
  const loadingScreen = document.getElementById('loading-screen');
  
  try {
    await characterManager.loadCharacter(characterName);
    
    // Set camera for health bar manager
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
    
    gameLoop.start();
  } finally {
    hideLoadingScreen();
  }
}

